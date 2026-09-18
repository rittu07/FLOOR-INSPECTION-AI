"""
Crack Detection Service using YOLO Model Inference with Advanced Computer Vision Heuristic Fallback.
Handles model loading, YOLO inference, CLAHE contrast enhancement, multi-scale morphological top-hat filtering,
directional line dilation, contour extraction, proximity box merging, and response formatting.
"""

import logging
import time
import uuid
from pathlib import Path
from typing import Optional, List, Tuple, Union
import cv2
import numpy as np

from app.config.settings import settings
from app.models.schemas import (
    CrackDetectionResponse,
    CrackDetectionItemSchema,
    BoundingBoxSchema,
    CrackSummarySchema,
)

logger = logging.getLogger("floor_inspection.crack_service")

class CrackService:
    def __init__(self):
        self._model = None
        self._device = "cpu"

    def _load_model(self):
        if self._model is not None:
            return self._model

        model_path = settings.CRACK_MODEL_PATH
        try:
            import torch
            from ultralytics import YOLO

            if torch.cuda.is_available():
                self._device = "cuda"
            else:
                self._device = "cpu"

            if model_path.exists():
                logger.info(f"Loading custom YOLO crack model from {model_path} on device: {self._device}")
                self._model = YOLO(str(model_path))
            else:
                logger.warning(f"Custom model path {model_path} not found. Loading base YOLO model...")
                self._model = YOLO("yolov8n.pt")
                
            return self._model
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}", exc_info=True)
            return None

    @staticmethod
    def merge_nearby_boxes(
        boxes: List[Tuple[int, int, int, int]],
        distance_thresh: int = 20,
        max_box_w: Optional[int] = None,
        max_box_h: Optional[int] = None,
    ) -> List[Tuple[int, int, int, int]]:
        """
        Merges adjacent or overlapping bounding boxes (x, y, w, h) into unified crack region boxes,
        safeguarding against unbounded transitive growth across the entire image.
        """
        if not boxes:
            return []

        rects = [[x, y, x + w, y + h] for (x, y, w, h) in boxes]
        merged = True

        while merged:
            merged = False
            new_rects = []
            skip_indices = set()

            for i in range(len(rects)):
                if i in skip_indices:
                    continue

                r1 = rects[i]
                x1_min, y1_min, x1_max, y1_max = r1

                for j in range(i + 1, len(rects)):
                    if j in skip_indices:
                        continue

                    r2 = rects[j]
                    x2_min, y2_min, x2_max, y2_max = r2

                    horiz_dist = max(0, max(x1_min, x2_min) - min(x1_max, x2_max))
                    vert_dist = max(0, max(y1_min, y2_min) - min(y1_max, y2_max))

                    candidate_w = max(x1_max, x2_max) - min(x1_min, x2_min)
                    candidate_h = max(y1_max, y2_max) - min(y1_min, y2_min)

                    w_ok = max_box_w is None or candidate_w <= max_box_w
                    h_ok = max_box_h is None or candidate_h <= max_box_h

                    if horiz_dist <= distance_thresh and vert_dist <= distance_thresh and w_ok and h_ok:
                        x1_min = min(x1_min, x2_min)
                        y1_min = min(y1_min, y2_min)
                        x1_max = max(x1_max, x2_max)
                        y1_max = max(y1_max, y2_max)
                        skip_indices.add(j)
                        merged = True

                new_rects.append([x1_min, y1_min, x1_max, y1_max])
                skip_indices.add(i)

            rects = new_rects

        return [(r[0], r[1], r[2] - r[0], r[3] - r[1]) for r in rects]

    @classmethod
    def detect_cracks_cv(
        cls,
        img: np.ndarray,
        conf_thresh: float = 0.25,
        sensitivity: str = "high",
        min_area_override: Optional[float] = None,
    ) -> Tuple[List[CrackDetectionItemSchema], np.ndarray]:
        """
        Advanced Computer Vision Crack & Surface Defect Detector.
        Integrates CLAHE contrast enhancement, multi-scale Black Top-Hat filtering,
        straight tile grout line suppression, directional edge dilation, contour geometry extraction,
        and proximity box merging.
        """
        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img.copy()

        # 1. CLAHE Contrast Enhancement to boost crack contrast against tile surfaces
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Adjust sensitivity parameters
        if sensitivity == "high":
            canny_low, canny_high = 15, 60
            min_area = min_area_override if min_area_override is not None else 6.0
            min_perimeter = 8.0
            tophat_thresh_val = 10
            merge_dist = 18
        elif sensitivity == "low":
            canny_low, canny_high = 40, 120
            min_area = min_area_override if min_area_override is not None else 80.0
            min_perimeter = 35.0
            tophat_thresh_val = 22
            merge_dist = 14
        else: # "balanced"
            canny_low, canny_high = 25, 80
            min_area = min_area_override if min_area_override is not None else 18.0
            min_perimeter = 15.0
            tophat_thresh_val = 15
            merge_dist = 16

        # 2. Multi-Scale Black Top-Hat Filter to extract dark crack fissures of varying widths
        tophat_small = cv2.morphologyEx(enhanced, cv2.MORPH_BLACKHAT, cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)))
        tophat_large = cv2.morphologyEx(enhanced, cv2.MORPH_BLACKHAT, cv2.getStructuringElement(cv2.MORPH_RECT, (13, 13)))
        tophat_combined = cv2.add(tophat_small, tophat_large)
        _, tophat_binary = cv2.threshold(tophat_combined, tophat_thresh_val, 255, cv2.THRESH_BINARY)

        # 3. Detect & Remove Straight Tile Grout Lines (prevents crack contours from fusing into tile joints)
        kernel_v_long = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 21))
        kernel_h_long = cv2.getStructuringElement(cv2.MORPH_RECT, (21, 1))

        straight_v = cv2.morphologyEx(tophat_binary, cv2.MORPH_OPEN, kernel_v_long)
        straight_h = cv2.morphologyEx(tophat_binary, cv2.MORPH_OPEN, kernel_h_long)
        grout_mask = cv2.add(straight_v, straight_h)
        grout_mask_dilated = cv2.dilate(grout_mask, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)))

        # Subtract straight grout lines from binary map
        tophat_no_grout = cv2.subtract(tophat_binary, grout_mask_dilated)

        # Zero out outer 2% margin to suppress frame edge crop lines
        margin_x = int(w * 0.02)
        margin_y = int(h * 0.02)
        tophat_no_grout[:margin_y, :] = 0
        tophat_no_grout[-margin_y:, :] = 0
        tophat_no_grout[:, :margin_x] = 0
        tophat_no_grout[:, -margin_x:] = 0

        # 4. Bilateral Filter + Canny Edge Detection
        blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)
        edges = cv2.Canny(blurred, canny_low, canny_high)

        # Directional Line Dilation to connect broken horizontal, vertical, and diagonal crack strokes
        kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 3))
        kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 7))
        dilated_h = cv2.dilate(edges, kernel_h, iterations=1)
        dilated_v = cv2.dilate(edges, kernel_v, iterations=1)
        edges_connected = cv2.bitwise_or(dilated_h, dilated_v)

        # Fuse Top-Hat (no grout) and Canny responses
        combined_binary = cv2.bitwise_or(tophat_no_grout, edges_connected)

        # Morphological Closing to seal unified crack regions
        kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        closed = cv2.morphologyEx(combined_binary, cv2.MORPH_CLOSE, kernel_close, iterations=1)

        # 5. Extract raw contours
        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        raw_boxes: List[Tuple[int, int, int, int]] = []
        max_allowed_area = (w * h) * 0.35

        for c in contours:
            perimeter = cv2.arcLength(c, True)
            x, y, bw, bh = cv2.boundingRect(c)
            if bw <= 0 or bh <= 0:
                continue

            max_dim = max(bw, bh)
            box_area = bw * bh

            # Filter out tiny noise dots or oversized full-frame rectangles
            if (max_dim < 8 and perimeter < min_perimeter) or box_area > max_allowed_area:
                continue

            # Filter out outer image border rectangles (touching 3 or 4 image edges)
            margin = 5
            touches_left = x <= margin
            touches_top = y <= margin
            touches_right = (x + bw) >= (w - margin)
            touches_bottom = (y + bh) >= (h - margin)
            touch_count = sum([touches_left, touches_top, touches_right, touches_bottom])
            if touch_count >= 3 or (bw >= w - 10 and bh >= h - 10):
                continue

            aspect_ratio = float(max(bw, bh)) / float(min(bw, bh)) if min(bw, bh) > 0 else 1.0
            extent = float(cv2.contourArea(c)) / float(box_area) if box_area > 0 else 0.0

            # Filter out perfect solid squares/rectangles (e.g. unbroken tile borders)
            if aspect_ratio < 1.08 and extent > 0.88:
                continue

            raw_boxes.append((x, y, bw, bh))

        # 6. Merge adjacent and overlapping crack bounding boxes with bounded max dimensions
        max_box_w = int(w * 0.45)
        max_box_h = int(h * 0.35)
        merged_boxes = cls.merge_nearby_boxes(
            raw_boxes, distance_thresh=merge_dist, max_box_w=max_box_w, max_box_h=max_box_h
        )

        annotated = img.copy()
        detections: List[CrackDetectionItemSchema] = []

        for (x, y, bw, bh) in merged_boxes:
            aspect_ratio = float(max(bw, bh)) / float(min(bw, bh)) if min(bw, bh) > 0 else 1.0
            box_area = bw * bh

            roi_gray = gray[y:y+bh, x:x+bw]
            contrast_score = float(np.std(roi_gray)) / 128.0 if roi_gray.size > 0 else 0.5

            calculated_conf = min(0.98, max(0.40, round(0.58 + (aspect_ratio * 0.03) + (contrast_score * 0.22), 4)))

            if calculated_conf < conf_thresh:
                continue

            if box_area < 350:
                label = "Micro Crack"
            elif box_area > 3500 or aspect_ratio > 2.5:
                label = "Structural Crack"
            else:
                label = "Hairline Crack"

            det_id = f"crack-{uuid.uuid4().hex[:8]}"

            item = CrackDetectionItemSchema(
                id=det_id,
                class_id=0,
                label=label,
                confidence=calculated_conf,
                box=BoundingBoxSchema(
                    x=round(float(x), 2),
                    y=round(float(y), 2),
                    width=round(float(bw), 2),
                    height=round(float(bh), 2),
                )
            )
            detections.append(item)

            # Color-coded bounding box overlays
            if label == "Micro Crack":
                color = (255, 230, 0) # Cyan/Yellow
            elif label == "Hairline Crack":
                color = (0, 230, 115) # Green
            else:
                color = (0, 140, 255) # Orange

            cv2.rectangle(annotated, (x, y), (x + bw, y + bh), color, 2)

            label_str = f"{label}: {int(calculated_conf * 100)}%"
            (txt_w, txt_h), baseline = cv2.getTextSize(label_str, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(annotated, (x, y - txt_h - 6), (x + txt_w + 4, y), color, -1)
            cv2.putText(annotated, label_str, (x + 2, y - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

        detections.sort(key=lambda d: d.confidence, reverse=True)
        return detections, annotated

    def detect_cracks(
        self,
        image_bytes: Union[bytes, Path, str],
        filename: str = "upload.jpg",
        confidence_threshold: Optional[float] = None,
        sensitivity: str = "high",
        min_area: Optional[float] = None,
    ) -> CrackDetectionResponse:
        start_time = time.time()
        conf_thresh = confidence_threshold if confidence_threshold is not None else settings.CRACK_CONFIDENCE_THRESHOLD

        # Decode image from bytes or file path
        if isinstance(image_bytes, (Path, str)):
            path_str = str(image_bytes)
            if not Path(path_str).exists():
                raise ValueError(f"Image path '{path_str}' does not exist.")
            img = cv2.imread(path_str)
        else:
            np_arr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Failed to decode uploaded image. Invalid or corrupt image file.")

        orig_h, orig_w, _ = img.shape
        model = self._load_model()

        detections: List[CrackDetectionItemSchema] = []
        annotated_img = img.copy()

        # Step 1: Attempt YOLO Model Detection
        if model is not None:
            try:
                results = model.predict(source=img, conf=conf_thresh, verbose=False)
                
                if results and len(results) > 0:
                    r = results[0]
                    boxes = r.boxes
                    
                    if boxes is not None and len(boxes) > 0:
                        for box in boxes:
                            cls_id = int(box.cls[0].item()) if box.cls is not None else 0
                            confidence = float(box.conf[0].item()) if box.conf is not None else 0.0
                            
                            xyxy = box.xyxy[0].tolist()
                            xmin, ymin, xmax, ymax = xyxy[0], xyxy[1], xyxy[2], xyxy[3]
                            w_px = max(1.0, xmax - xmin)
                            h_px = max(1.0, ymax - ymin)

                            label_name = model.names.get(cls_id, "Crack") if hasattr(model, "names") else "Crack"
                            
                            # Filter out non-crack COCO objects if base model was loaded
                            if label_name.lower() not in ["crack", "fracture", "defect", "damage"]:
                                continue

                            detections.append(
                                CrackDetectionItemSchema(
                                    id=f"crack-{uuid.uuid4().hex[:8]}",
                                    class_id=cls_id,
                                    label=label_name.capitalize(),
                                    confidence=round(confidence, 4),
                                    box=BoundingBoxSchema(
                                        x=round(xmin, 2),
                                        y=round(ymin, 2),
                                        width=round(w_px, 2),
                                        height=round(h_px, 2),
                                    ),
                                )
                            )

                        if len(detections) > 0:
                            annotated_img = r.plot()
            except Exception as exc:
                logger.error(f"YOLO Inference error: {exc}", exc_info=True)

        # Step 2: Fallback to Advanced CV Crack & Defect Detector if no YOLO crack detections found
        if len(detections) == 0:
            logger.info(f"Running Advanced CV Crack Detector (sensitivity={sensitivity}, min_area={min_area})...")
            detections, annotated_img = self.detect_cracks_cv(
                img, conf_thresh=conf_thresh, sensitivity=sensitivity, min_area_override=min_area
            )

        # Save annotated image to outputs/
        res_id = f"crack-{uuid.uuid4().hex[:8]}"
        out_filename = f"crack_result_{res_id}.jpg"
        out_path = settings.OUTPUTS_DIR / out_filename
        cv2.imwrite(str(out_path), annotated_img)

        # Calculate statistics
        crack_count = len(detections)
        avg_conf = round(float(np.mean([d.confidence for d in detections])), 4) if crack_count > 0 else 0.0
        max_conf = round(float(np.max([d.confidence for d in detections])), 4) if crack_count > 0 else 0.0
        proc_time = round(time.time() - start_time, 4)

        rel_url = f"/outputs/{out_filename}"

        return CrackDetectionResponse(
            id=res_id,
            status="completed",
            image_url=rel_url,
            source_image_url=None,
            annotated_image_url=rel_url,
            detections=detections,
            summary=CrackSummarySchema(
                cracks_detected=crack_count,
                average_confidence=avg_conf,
            ),
            crack_count=crack_count,
            avg_confidence=avg_conf,
            highest_confidence=max_conf,
            processing_time_seconds=proc_time,
        )

crack_service = CrackService()
