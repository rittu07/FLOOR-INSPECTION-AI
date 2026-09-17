"""
Dataset Preparation Script for Concrete Surface Crack Detection.
Sets up raw concrete crack dataset with normalized YOLO annotations (0 x_center y_center width height).
"""

import os
from pathlib import Path
import cv2
import numpy as np
import random

SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent
DATASET_DIR = ML_DIR / "datasets" / "crack_dataset"
RAW_IMAGES_DIR = DATASET_DIR / "raw" / "images"
RAW_LABELS_DIR = DATASET_DIR / "raw" / "labels"

def generate_synthetic_crack_image(image_id: int) -> tuple[np.ndarray, list[tuple[float, float, float, float]]]:
    """
    Generates a realistic concrete surface texture image with synthetic crack patterns and
    returns image array along with normalized YOLO bounding box labels [x_center, y_center, width, height].
    """
    width, height = 640, 480
    # Concrete base background with noise & texture
    base_color = random.randint(140, 180)
    image = np.full((height, width, 3), base_color, dtype=np.uint8)
    
    # Add random concrete noise
    noise = np.random.normal(0, 15, (height, width, 3)).astype(np.int16)
    image = np.clip(image.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    # Add subtle aggregate specks
    num_specks = random.randint(100, 300)
    for _ in range(num_specks):
        sx, sy = random.randint(0, width-1), random.randint(0, height-1)
        sc = random.randint(50, 220)
        sr = random.randint(1, 3)
        cv2.circle(image, (sx, sy), sr, (sc, sc, sc), -1)

    bboxes = []
    has_crack = random.random() > 0.1  # 90% positive crack images, 10% negative background

    if has_crack:
        num_cracks = random.randint(1, 3)
        for _ in range(num_cracks):
            # Pick a starting point
            start_x = random.randint(80, width - 80)
            start_y = random.randint(80, height - 80)
            
            # Generate jagged crack path
            points = [(start_x, start_y)]
            curr_x, curr_y = start_x, start_y
            length = random.randint(80, 250)
            angle = random.uniform(0, 2 * np.pi)
            
            for step in range(length // 10):
                angle += random.uniform(-0.6, 0.6)
                step_len = random.randint(8, 15)
                curr_x += int(step_len * np.cos(angle))
                curr_y += int(step_len * np.sin(angle))
                curr_x = max(10, min(width - 10, curr_x))
                curr_y = max(10, min(height - 10, curr_y))
                points.append((curr_x, curr_y))

            # Draw crack line with variable thickness
            thickness = random.randint(1, 3)
            for i in range(len(points) - 1):
                cv2.line(image, points[i], points[i+1], (30, 30, 30), thickness)

            # Compute bounding box
            xs = [p[0] for p in points]
            ys = [p[1] for p in points]
            xmin, xmax = max(0, min(xs) - 5), min(width, max(xs) + 5)
            ymin, ymax = max(0, min(ys) - 5), min(height, max(ys) + 5)
            
            box_w = xmax - xmin
            box_h = ymax - ymin
            
            if box_w >= 10 and box_h >= 10:
                # Convert to normalized YOLO format
                x_center = round((xmin + box_w / 2.0) / width, 6)
                y_center = round((ymin + box_h / 2.0) / height, 6)
                norm_w = round(box_w / width, 6)
                norm_h = round(box_h / height, 6)
                bboxes.append((x_center, y_center, norm_w, norm_h))

    return image, bboxes

def prepare_dataset(num_samples: int = 100):
    RAW_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    RAW_LABELS_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[Dataset Preparation] Generating {num_samples} standardized concrete crack samples...")
    random.seed(42)
    np.random.seed(42)

    for i in range(1, num_samples + 1):
        img_filename = f"crack_{i:04d}.jpg"
        lbl_filename = f"crack_{i:04d}.txt"

        img_path = RAW_IMAGES_DIR / img_filename
        lbl_path = RAW_LABELS_DIR / lbl_filename

        img, bboxes = generate_synthetic_crack_image(i)
        cv2.imwrite(str(img_path), img)

        with open(lbl_path, "w", encoding="utf-8") as f:
            for box in bboxes:
                # Class 0: crack
                f.write(f"0 {box[0]:.6f} {box[1]:.6f} {box[2]:.6f} {box[3]:.6f}\n")

    print(f"[Dataset Preparation] Created {num_samples} images in {RAW_IMAGES_DIR}")

if __name__ == "__main__":
    prepare_dataset()
