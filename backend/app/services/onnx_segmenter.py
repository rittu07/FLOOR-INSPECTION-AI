"""
Lightweight YOLO segmentation inference with ONNX Runtime (no PyTorch / Ultralytics).

Used for small CPU hosts (e.g. 512 MB free tiers). Reproduces Ultralytics' segment post-processing:
letterbox -> model -> confidence filter -> NMS -> prototype mask assembly -> crop -> rescale to the
original image -> largest contour per detection.

Export a compatible model with:
    YOLO("best.pt").export(format="onnx", imgsz=640, simplify=True)
"""

import ast
import os
from dataclasses import dataclass
from typing import Dict, List, Tuple

import cv2
import numpy as np


@dataclass
class SegDetection:
    cls_id: int
    confidence: float
    xyxy: Tuple[float, float, float, float]
    polygon: np.ndarray  # (N, 2) float32 outline in original image pixels; empty if mask vanished


class OnnxSegmenter:
    def __init__(self, model_path: str):
        import onnxruntime as ort

        opts = ort.SessionOptions()
        opts.intra_op_num_threads = max(1, os.cpu_count() or 1)
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        # Free memory between requests instead of keeping a growing arena (512 MB hosts)
        opts.enable_cpu_mem_arena = False
        self.session = ort.InferenceSession(model_path, opts, providers=["CPUExecutionProvider"])

        inp = self.session.get_inputs()[0]
        self.input_name = inp.name
        self.imgsz = int(inp.shape[2]) if isinstance(inp.shape[2], int) else 640

        meta = self.session.get_modelmeta().custom_metadata_map
        self.names: Dict[int, str] = ast.literal_eval(meta["names"]) if "names" in meta else {0: "crack"}
        self.num_classes = len(self.names)

    def _letterbox(self, img: np.ndarray) -> Tuple[np.ndarray, float, Tuple[int, int]]:
        h0, w0 = img.shape[:2]
        r = min(self.imgsz / h0, self.imgsz / w0)
        nw, nh = int(round(w0 * r)), int(round(h0 * r))
        dw, dh = (self.imgsz - nw) / 2, (self.imgsz - nh) / 2
        resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_LINEAR) if (nw, nh) != (w0, h0) else img
        top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
        left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
        padded = cv2.copyMakeBorder(resized, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(114, 114, 114))
        return padded, r, (left, top)

    def predict(self, img: np.ndarray, conf: float = 0.25, iou: float = 0.7, max_det: int = 300) -> List[SegDetection]:
        h0, w0 = img.shape[:2]
        padded, ratio, (pad_x, pad_y) = self._letterbox(img)
        blob = np.ascontiguousarray(padded[:, :, ::-1].transpose(2, 0, 1))[None].astype(np.float32) / 255.0

        preds, protos = self.session.run(None, {self.input_name: blob})
        preds = preds[0].T  # (anchors, 4 + nc + 32)
        protos = protos[0]  # (32, mh, mw)

        class_scores = preds[:, 4:4 + self.num_classes]
        scores = class_scores.max(axis=1)
        keep = scores > conf
        if not np.any(keep):
            return []
        preds, scores = preds[keep], scores[keep]
        cls_ids = class_scores[keep].argmax(axis=1)

        cx, cy, bw, bh = preds[:, 0], preds[:, 1], preds[:, 2], preds[:, 3]
        boxes = np.stack([cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2], axis=1)

        # Class-aware NMS (offset boxes per class, as Ultralytics does)
        offset = cls_ids[:, None].astype(np.float32) * 7680.0
        nms_boxes = boxes + offset
        xywh = np.concatenate([nms_boxes[:, :2], nms_boxes[:, 2:] - nms_boxes[:, :2]], axis=1)
        idx = cv2.dnn.NMSBoxes(xywh.tolist(), scores.tolist(), conf, iou)
        idx = np.array(idx).reshape(-1)[:max_det]
        if idx.size == 0:
            return []

        boxes, scores, cls_ids = boxes[idx], scores[idx], cls_ids[idx]
        coeffs = preds[idx, 4 + self.num_classes:]

        # Assemble masks at prototype resolution and crop to each box
        c, mh, mw = protos.shape
        masks = 1.0 / (1.0 + np.exp(-(coeffs @ protos.reshape(c, -1))))
        masks = masks.reshape(-1, mh, mw)
        sx, sy = mw / self.imgsz, mh / self.imgsz
        cols = np.arange(mw)[None, None, :]
        rows = np.arange(mh)[None, :, None]
        x1, y1, x2, y2 = (boxes[:, i, None, None] for i in range(4))
        inside = (cols >= x1 * sx) & (cols < x2 * sx) & (rows >= y1 * sy) & (rows < y2 * sy)
        masks = masks * inside

        # Region of the letterboxed image that holds real content (no padding)
        crop_x0, crop_y0 = pad_x, pad_y
        crop_x1, crop_y1 = self.imgsz - pad_x, self.imgsz - pad_y

        detections: List[SegDetection] = []
        for k in range(len(idx)):
            full = cv2.resize(masks[k], (self.imgsz, self.imgsz), interpolation=cv2.INTER_LINEAR)
            full = full[crop_y0:crop_y1, crop_x0:crop_x1]
            full = cv2.resize(full, (w0, h0), interpolation=cv2.INTER_LINEAR)
            binary = (full > 0.5).astype(np.uint8)

            contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            polygon = (
                max(contours, key=cv2.contourArea).reshape(-1, 2).astype(np.float32)
                if contours else np.zeros((0, 2), dtype=np.float32)
            )

            bx1 = float(np.clip((boxes[k, 0] - pad_x) / ratio, 0, w0))
            by1 = float(np.clip((boxes[k, 1] - pad_y) / ratio, 0, h0))
            bx2 = float(np.clip((boxes[k, 2] - pad_x) / ratio, 0, w0))
            by2 = float(np.clip((boxes[k, 3] - pad_y) / ratio, 0, h0))
            detections.append(SegDetection(int(cls_ids[k]), float(scores[k]), (bx1, by1, bx2, by2), polygon))
        return detections

    def plot(self, img: np.ndarray, detections: List[SegDetection]) -> np.ndarray:
        """Draws translucent masks, boxes and 'name conf' labels (similar to Ultralytics Results.plot)."""
        out = img.copy()
        overlay = img.copy()
        color = (255, 56, 56)  # BGR blue-ish like Ultralytics class 0
        for det in detections:
            if len(det.polygon) >= 3:
                cv2.fillPoly(overlay, [det.polygon.astype(np.int32)], color)
        out = cv2.addWeighted(overlay, 0.5, out, 0.5, 0)
        lw = max(round(sum(img.shape[:2]) / 2 * 0.003), 2)
        for det in detections:
            x1, y1, x2, y2 = (int(round(v)) for v in det.xyxy)
            cv2.rectangle(out, (x1, y1), (x2, y2), color, lw, cv2.LINE_AA)
            label = f"{self.names.get(det.cls_id, 'crack')} {det.confidence:.2f}"
            fs, tt = lw / 3, max(lw - 1, 1)
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, fs, tt)
            if y1 - th - 6 >= 0:  # label above the box
                cv2.rectangle(out, (x1, y1 - th - 6), (x1 + tw + 4, y1), color, -1)
                text_org = (x1 + 2, y1 - 4)
            else:  # no room above: label inside the top of the box
                cv2.rectangle(out, (x1, y1), (x1 + tw + 4, y1 + th + 6), color, -1)
                text_org = (x1 + 2, y1 + th + 2)
            cv2.putText(out, label, text_org, cv2.FONT_HERSHEY_SIMPLEX, fs, (255, 255, 255), tt, cv2.LINE_AA)
        return out
