"""
YOLO Model Evaluation Utility for Concrete Surface Crack Detection.
Evaluates trained model weights on test split and reports Precision, Recall, mAP@50, mAP@50-95, and average inference latency.
"""

import argparse
import time
from pathlib import Path
from ultralytics import YOLO

SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent
DEFAULT_MODEL = ML_DIR / "models" / "best.pt"
DEFAULT_DATA = ML_DIR / "data.yaml"

def evaluate_model(model_path: str = str(DEFAULT_MODEL), data_path: str = str(DEFAULT_DATA)):
    model_file = Path(model_path)
    if not model_file.exists():
        print(f"Error: Model file not found at {model_path}. Train the model first or provide valid weights.")
        return None

    print("=" * 60)
    print("YOLO CONCRETE CRACK MODEL TEST EVALUATION")
    print(f" Model Weights: {model_path}")
    print(f" Data Config:   {data_path}")
    print("=" * 60)

    yolo_model = YOLO(str(model_file))

    # Perform evaluation on test set
    start_time = time.time()
    results = yolo_model.val(data=data_path, split="test", verbose=True)
    end_time = time.time()

    # Compute metrics
    metrics = results.results_dict
    mp = metrics.get("metrics/precision(B)", 0.0)
    mr = metrics.get("metrics/recall(B)", 0.0)
    map50 = metrics.get("metrics/mAP50(B)", 0.0)
    map50_95 = metrics.get("metrics/mAP50-95(B)", 0.0)
    
    speed = getattr(results, "speed", {})
    inference_time_ms = speed.get("inference", 0.0)

    print("\n" + "=" * 60)
    print("TEST EVALUATION RESULTS SUMMARY")
    print("=" * 60)
    print(f" Precision:       {mp:.4f}")
    print(f" Recall:          {mr:.4f}")
    print(f" mAP@50:          {map50:.4f}")
    print(f" mAP@50-95:       {map50_95:.4f}")
    print(f" Inference Time:  {inference_time_ms:.2f} ms / frame")
    print("=" * 60)

    return {
        "precision": mp,
        "recall": mr,
        "map50": map50,
        "map50_95": map50_95,
        "inference_speed_ms": inference_time_ms,
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate YOLO Crack Detector")
    parser.add_argument("--model", type=str, default=str(DEFAULT_MODEL), help="Path to best.pt weights")
    parser.add_argument("--data", type=str, default=str(DEFAULT_DATA), help="Path to data.yaml")

    args = parser.parse_args()
    evaluate_model(model_path=args.model, data_path=args.data)
