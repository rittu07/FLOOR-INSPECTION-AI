"""
Dataset Validation Utility for Concrete Surface Crack Detection.
Verifies image integrity, label synchronization, normalized YOLO coordinate bounds [0, 1], and box sanity.
"""

import os
from pathlib import Path
import cv2

SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent
DATASET_DIR = ML_DIR / "datasets" / "crack_dataset"

def validate_dataset_split(split_name: str, images_dir: Path, labels_dir: Path) -> dict:
    stats = {
        "split": split_name,
        "total_images": 0,
        "total_labels": 0,
        "valid_images": 0,
        "corrupt_images": 0,
        "missing_labels": 0,
        "total_annotations": 0,
        "invalid_annotations": 0,
        "out_of_bounds": 0,
        "non_positive_dims": 0,
    }

    if not images_dir.exists():
        print(f"Directory missing: {images_dir}")
        return stats

    image_files = list(images_dir.glob("*.jpg")) + list(images_dir.glob("*.png")) + list(images_dir.glob("*.jpeg"))
    stats["total_images"] = len(image_files)

    for img_path in image_files:
        # Check non-corrupt image
        img = cv2.imread(str(img_path))
        if img is None:
            stats["corrupt_images"] += 1
            print(f"[Corrupt Image] {img_path}")
            continue
        stats["valid_images"] += 1

        lbl_path = labels_dir / f"{img_path.stem}.txt"
        if not lbl_path.exists():
            stats["missing_labels"] += 1
            continue

        stats["total_labels"] += 1
        with open(lbl_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        for line in lines:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) != 5:
                stats["invalid_annotations"] += 1
                continue

            try:
                cls_id = int(parts[0])
                xc, yc, w, h = map(float, parts[1:])
            except ValueError:
                stats["invalid_annotations"] += 1
                continue

            stats["total_annotations"] += 1

            # Validate coordinate bounds [0.0, 1.0]
            if not (0.0 <= xc <= 1.0 and 0.0 <= yc <= 1.0 and 0.0 <= w <= 1.0 and 0.0 <= h <= 1.0):
                stats["out_of_bounds"] += 1
                print(f"[Out of Bounds] {lbl_path}: {line}")

            if w <= 0 or h <= 0:
                stats["non_positive_dims"] += 1
                print(f"[Non-positive Dimensions] {lbl_path}: {line}")

    return stats

def validate_all():
    print("=" * 60)
    print("YOLO CONCRETE CRACK DATASET VALIDATION REPORT")
    print("=" * 60)

    # Check raw or split datasets
    raw_images = DATASET_DIR / "raw" / "images"
    raw_labels = DATASET_DIR / "raw" / "labels"

    all_stats = []

    if raw_images.exists():
        all_stats.append(validate_dataset_split("raw", raw_images, raw_labels))

    for split in ["train", "val", "test"]:
        s_img = DATASET_DIR / "images" / split
        s_lbl = DATASET_DIR / "labels" / split
        if s_img.exists():
            all_stats.append(validate_dataset_split(split, s_img, s_lbl))

    print(f"{'Split':<10} | {'Images':<8} | {'Labels':<8} | {'Boxes':<8} | {'Corrupt':<8} | {'Invalid':<8}")
    print("-" * 65)

    total_corrupt = 0
    total_invalid = 0

    for st in all_stats:
        print(f"{st['split']:<10} | {st['total_images']:<8} | {st['total_labels']:<8} | {st['total_annotations']:<8} | {st['corrupt_images']:<8} | {st['invalid_annotations'] + st['out_of_bounds']:<8}")
        total_corrupt += st['corrupt_images']
        total_invalid += st['invalid_annotations'] + st['out_of_bounds']

    print("=" * 60)
    if total_corrupt == 0 and total_invalid == 0:
        print("[SUCCESS] Dataset validation passed with zero corrupt images and zero invalid annotations.")
    else:
        print(f"[WARNING] Found {total_corrupt} corrupt images and {total_invalid} invalid label bounding boxes.")

    return total_corrupt == 0 and total_invalid == 0

if __name__ == "__main__":
    validate_all()
