"""
Standalone CLI Prediction Utility for Concrete Surface Crack Detection.
Runs inference on an input image using trained YOLO weights and prints/saves annotated output.
"""

import argparse
from pathlib import Path
import cv2
from ultralytics import YOLO

SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent
DEFAULT_MODEL = ML_DIR / "models" / "best.pt"

def run_prediction(model_path: str, source_path: str, conf: float = 0.40, save_out: bool = True):
    model_file = Path(model_path)
    source_file = Path(source_path)

    if not model_file.exists():
        print(f"Error: Model file not found at {model_path}.")
        return

    if not source_file.exists():
        print(f"Error: Source image not found at {source_path}.")
        return

    print(f"[Inference] Loading YOLO model: {model_path}")
    model = YOLO(str(model_file))

    print(f"[Inference] Running detection on: {source_path} (Confidence Threshold: {conf})")
    results = model.predict(source=str(source_file), conf=conf, verbose=False)

    for i, r in enumerate(results):
        boxes = r.boxes
        print(f"Detected {len(boxes)} crack instances.")

        for b in boxes:
            box_cls = int(b.cls[0].item())
            confidence = float(b.conf[0].item())
            xywh = b.xywh[0].tolist()
            print(f" - Class {box_cls} ({model.names.get(box_cls, 'crack')}): Confidence={confidence:.3f}, BBox=[x={xywh[0]:.1f}, y={xywh[1]:.1f}, w={xywh[2]:.1f}, h={xywh[3]:.1f}]")

        if save_out:
            out_img = r.plot()
            out_path = source_file.parent / f"predicted_{source_file.name}"
            cv2.imwrite(str(out_path), out_img)
            print(f"[Inference] Saved annotated result to: {out_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Standalone YOLO Crack Prediction")
    parser.add_argument("--model", type=str, default=str(DEFAULT_MODEL), help="Path to YOLO weights")
    parser.add_argument("--source", type=str, required=True, help="Path to input image")
    parser.add_argument("--conf", type=float, default=0.40, help="Confidence threshold")

    args = parser.parse_args()
    run_prediction(model_path=args.model, source_path=args.source, conf=args.conf)
