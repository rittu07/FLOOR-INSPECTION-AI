# YOLO Concrete Surface Crack Detection Pipeline

This directory contains the machine learning components for dataset preparation, validation, model training, evaluation, and standalone inference of concrete surface crack detection models.

## Pipeline Architecture

```
backend/ml/crack_detection/
├── data.yaml                     # YOLO dataset configuration
├── datasets/                     # Dataset storage
│   ├── crack_dataset/
│   │   ├── images/ {train,val,test}
│   │   └── labels/ {train,val,test}
│   └── preview/                  # Rendered annotation previews
├── models/
│   └── best.pt                   # Deployed YOLO model weights
├── scripts/
│   ├── prepare_dataset.py        # Dataset acquisition & normalization
│   ├── validate_dataset.py       # Dataset integrity validation
│   ├── split_dataset.py          # 70/20/10 train/val/test split
│   ├── preview_annotations.py    # Annotation preview renderer
│   └── predict.py                # Standalone CLI inference
├── training/
│   └── train.py                  # YOLO model training
└── evaluation/
    └── evaluate.py               # Test-set metrics calculation
```

## Quick Start Guide

### 1. Prepare Dataset
Generates standardized concrete surface crack dataset samples with normalized YOLO label files (`0 x_center y_center width height`):
```bash
python scripts/prepare_dataset.py
```

### 2. Validate Dataset Integrity
Inspects image file sanity, label synchronization, coordinate bounds $[0.0, 1.0]$, and box dimensions:
```bash
python scripts/validate_dataset.py
```

### 3. Split Dataset
Splits dataset into 70% Train, 20% Validation, and 10% Test using a reproducible seed (42):
```bash
python scripts/split_dataset.py
```

### 4. Preview Annotations
Renders annotated preview images into `datasets/preview/`:
```bash
python scripts/preview_annotations.py
```

### 5. Train YOLO Model
Trains YOLO model and exports best weights to `models/best.pt`:
```bash
python training/train.py --epochs 5 --imgsz 640 --batch 16
```

### 6. Evaluate Model on Test Set
Calculates Precision, Recall, mAP@50, mAP@50-95, and average inference latency:
```bash
python evaluation/evaluate.py --model models/best.pt
```

### 7. Standalone CLI Prediction
Run crack detection on a single image:
```bash
python scripts/predict.py --model models/best.pt --source sample.jpg --conf 0.40
```

## Dataset Specifications & License
- **Class Definition**: `0: crack`
- **Annotation Format**: Standard YOLO normalized format (`class_id x_center y_center width height`)
- **License**: Creative Commons Attribution 4.0 International / Public Domain Academic Data
