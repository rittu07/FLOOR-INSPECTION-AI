"""
Preview Annotations Utility for Concrete Surface Crack Detection.
Overlay YOLO bounding boxes onto sample dataset images and saves rendered previews for visual verification.
"""

import os
from pathlib import Path
import cv2

SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent
DATASET_DIR = ML_DIR / "datasets" / "crack_dataset"
PREVIEW_DIR = ML_DIR / "datasets" / "preview"

def render_previews(num_samples: int = 10):
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    
    # Locate images from raw or train
    images_dir = DATASET_DIR / "raw" / "images"
    labels_dir = DATASET_DIR / "raw" / "labels"

    if not images_dir.exists():
        images_dir = DATASET_DIR / "images" / "train"
        labels_dir = DATASET_DIR / "labels" / "train"

    if not images_dir.exists():
        print("No image dataset directory found for preview.")
        return

    image_files = sorted(list(images_dir.glob("*.jpg")) + list(images_dir.glob("*.png")))[:num_samples]

    print(f"[Preview Annotations] Rendering {len(image_files)} preview samples into {PREVIEW_DIR}...")

    for img_path in image_files:
        img = cv2.imread(str(img_path))
        if img is None:
            continue

        h, w, _ = img.shape
        lbl_path = labels_dir / f"{img_path.stem}.txt"

        if lbl_path.exists():
            with open(lbl_path, "r", encoding="utf-8") as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) != 5:
                        continue
                    cls_id = int(parts[0])
                    xc, yc, bw, bh = map(float, parts[1:])

                    xmin = int((xc - bw / 2.0) * w)
                    ymin = int((yc - bh / 2.0) * h)
                    xmax = int((xc + bw / 2.0) * w)
                    ymax = int((yc + bh / 2.0) * h)

                    # Draw bounding box (emerald green)
                    cv2.rectangle(img, (xmin, ymin), (xmax, ymax), (0, 220, 100), 2)
                    
                    # Draw label text
                    label_text = f"Crack {cls_id}"
                    cv2.putText(
                        img, label_text, (xmin, max(15, ymin - 6)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 100), 1, cv2.LINE_AA
                    )

        out_path = PREVIEW_DIR / f"preview_{img_path.name}"
        cv2.imwrite(str(out_path), img)

    print(f"[Preview Annotations] Rendered previews successfully.")

if __name__ == "__main__":
    render_previews()
