"""
Dataset Splitting Utility for Concrete Surface Crack Detection.
Splits raw dataset into 70% Train, 20% Validation, and 10% Test using a fixed random seed (42).
"""

import os
import shutil
import random
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent
DATASET_DIR = ML_DIR / "datasets" / "crack_dataset"

RAW_IMAGES_DIR = DATASET_DIR / "raw" / "images"
RAW_LABELS_DIR = DATASET_DIR / "raw" / "labels"

def split_dataset(train_ratio: float = 0.70, val_ratio: float = 0.20, test_ratio: float = 0.10, seed: int = 42):
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-5, "Ratios must sum to 1.0"

    if not RAW_IMAGES_DIR.exists():
        print(f"Error: Raw images directory not found at {RAW_IMAGES_DIR}. Please run prepare_dataset.py first.")
        return

    image_files = sorted(list(RAW_IMAGES_DIR.glob("*.jpg")) + list(RAW_IMAGES_DIR.glob("*.png")))
    if not image_files:
        print(f"Error: No image files found in {RAW_IMAGES_DIR}.")
        return

    random.seed(seed)
    random.shuffle(image_files)

    total = len(image_files)
    n_train = int(total * train_ratio)
    n_val = int(total * val_ratio)
    
    train_files = image_files[:n_train]
    val_files = image_files[n_train:n_train + n_val]
    test_files = image_files[n_train + n_val:]

    splits = {
        "train": train_files,
        "val": val_files,
        "test": test_files,
    }

    for split_name, files in splits.items():
        img_out = DATASET_DIR / "images" / split_name
        lbl_out = DATASET_DIR / "labels" / split_name

        # Clean existing split directories
        if img_out.exists():
            shutil.rmtree(img_out)
        if lbl_out.exists():
            shutil.rmtree(lbl_out)

        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)

        for img_p in files:
            lbl_p = RAW_LABELS_DIR / f"{img_p.stem}.txt"
            
            # Copy image
            shutil.copy(img_p, img_out / img_p.name)
            
            # Copy label if present
            if lbl_p.exists():
                shutil.copy(lbl_p, lbl_out / lbl_p.name)
            else:
                # Create empty label file for negative samples
                (lbl_out / f"{img_p.stem}.txt").touch()

    print(f"[Dataset Split] Complete (Seed {seed}):")
    print(f"  - Train (70%): {len(train_files)} images -> {DATASET_DIR / 'images' / 'train'}")
    print(f"  - Val   (20%): {len(val_files)} images -> {DATASET_DIR / 'images' / 'val'}")
    print(f"  - Test  (10%): {len(test_files)} images -> {DATASET_DIR / 'images' / 'test'}")

if __name__ == "__main__":
    split_dataset()
