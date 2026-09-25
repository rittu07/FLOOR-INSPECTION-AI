"""
YOLO Crack Segmentation Training Script.
Fine-tunes a pretrained YOLO segmentation model on real crack data (crack-seg) plus the
floor-domain supplement (floor_aug) and exports best.pt model weights.
"""

import argparse
from pathlib import Path
import shutil
from ultralytics import YOLO

SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent
DEFAULT_DATA_YAML = ML_DIR / "data_floor_seg.yaml"
MODELS_DIR = ML_DIR / "models"
RUNS_DIR = ML_DIR / "runs"

def run_training(
    data: str = str(DEFAULT_DATA_YAML),
    model: str = "yolo26s-seg.pt",
    epochs: int = 80,
    imgsz: int = 640,
    batch: int = 8,
    patience: int = 20,
    workers: int = 2,
    name: str = "crack_seg_v2",
    resume: bool = False,
):
    print("=" * 60)
    print("YOLO CRACK SEGMENTATION MODEL TRAINING")
    print(f" Data Config: {data}")
    print(f" Base Model:  {model}")
    print(f" Epochs:      {epochs} (patience {patience})")
    print(f" Image Size:  {imgsz}")
    print(f" Batch Size:  {batch}")
    print("=" * 60)

    if resume:
        yolo_model = YOLO(str(RUNS_DIR / name / "weights" / "last.pt"))
        results = yolo_model.train(resume=True)
    else:
        yolo_model = YOLO(model)
        results = yolo_model.train(
            data=data,
            epochs=epochs,
            imgsz=imgsz,
            batch=batch,
            patience=patience,
            workers=workers,
            cos_lr=True,
            close_mosaic=10,
            # Top-down floor imagery has no canonical orientation
            degrees=180.0,
            flipud=0.5,
            fliplr=0.5,
            translate=0.1,
            scale=0.5,
            hsv_h=0.015,
            hsv_s=0.5,
            hsv_v=0.5,
            mosaic=1.0,
            mixup=0.05,
            copy_paste=0.3,
            seed=42,
            project=str(RUNS_DIR),
            name=name,
            exist_ok=True,
            plots=True,
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
    parser = argparse.ArgumentParser(description="Train YOLO Crack Segmentation Model")
    parser.add_argument("--data", type=str, default=str(DEFAULT_DATA_YAML), help="Path to data yaml")
    parser.add_argument("--model", type=str, default="yolo26s-seg.pt", help="Pretrained YOLO checkpoint")
    parser.add_argument("--epochs", type=int, default=80, help="Number of training epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Target image size")
    parser.add_argument("--batch", type=int, default=8, help="Batch size (-1 for auto)")
    parser.add_argument("--patience", type=int, default=20, help="Early-stopping patience (epochs)")
    parser.add_argument("--workers", type=int, default=2, help="Dataloader workers")
    parser.add_argument("--name", type=str, default="crack_seg_v2", help="Run name")
    parser.add_argument("--resume", action="store_true", help="Resume an interrupted run")

    args = parser.parse_args()
    run_training(
        data=args.data,
        model=args.model,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        patience=args.patience,
        workers=args.workers,
        name=args.name,
        resume=args.resume,
    )
