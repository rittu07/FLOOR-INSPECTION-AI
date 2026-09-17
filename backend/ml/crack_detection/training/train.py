"""
YOLO Crack Detection Training Script.
Trains a YOLO model on the concrete surface crack dataset and outputs best.pt model weights.
"""

import argparse
from pathlib import Path
import shutil
from ultralytics import YOLO

SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent
DEFAULT_DATA_YAML = ML_DIR / "data.yaml"
MODELS_DIR = ML_DIR / "models"
RUNS_DIR = ML_DIR / "runs"

def run_training(
    data: str = str(DEFAULT_DATA_YAML),
    model: str = "yolov8n.pt",
    epochs: int = 5,
    imgsz: int = 640,
    batch: int = 16,
    name: str = "crack_yolo_v1",
):
    print("=" * 60)
    print("YOLO CONCRETE CRACK MODEL TRAINING")
    print(f" Data Config: {data}")
    print(f" Base Model:  {model}")
    print(f" Epochs:      {epochs}")
    print(f" Image Size:  {imgsz}")
    print(f" Batch Size:  {batch}")
    print("=" * 60)

    # Instantiate YOLO model
    yolo_model = YOLO(model)

    # Train model
    results = yolo_model.train(
        data=data,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        project=str(RUNS_DIR),
        name=name,
        exist_ok=True,
        verbose=True,
    )

    # Best weights path
    best_weights_path = RUNS_DIR / name / "weights" / "best.pt"
    
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    target_model_path = MODELS_DIR / "best.pt"

    if best_weights_path.exists():
        shutil.copy(best_weights_path, target_model_path)
        print(f"[Training Complete] Best model saved to: {target_model_path}")
    else:
        # If best.pt is not produced (e.g. fast epoch exit), export current model weights
        yolo_model.save(str(target_model_path))
        print(f"[Training Complete] Model saved to: {target_model_path}")

    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train YOLO Crack Detector")
    parser.add_argument("--data", type=str, default=str(DEFAULT_DATA_YAML), help="Path to data.yaml")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Pretrained YOLO model checkpoint")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Target image size")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--name", type=str, default="crack_yolo_v1", help="Run name")

    args = parser.parse_args()
    run_training(
        data=args.data,
        model=args.model,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        name=args.name,
    )
