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

## Real-Data Segmentation Pipeline (recommended)

The production model is a YOLO26s **segmentation** model trained on real crack photos plus a
floor-domain supplement. Crack masks fit thin, diagonal cracks far better than boxes.

```bash
# 1. Download Ultralytics crack-seg (4,029 real crack photos with polygon masks, ~96 MB)
#    and build datasets/floor_aug:
#      tile_crack  - real crack shading transferred onto rendered tiled floors
#      tile_neg    - tiled floors with grout/stains/scuffs, no cracks (hard negatives)
#      texture_neg - crack-free crops of real photos
python scripts/build_floor_dataset.py

# 2. Train (GPU strongly recommended; ~3.5 min/epoch on an RTX 3060 Laptop at batch 8)
python training/train.py                 # defaults: yolo26s-seg.pt, 80 epochs, patience 20
python training/train.py --resume        # continue an interrupted run

# 3. Evaluate: overall, real-crack and floor subsets, plus hard-negative false-positive rate
python evaluation/evaluate.py
```

Config: `data_floor_seg.yaml`. The backend only runs the OpenCV heuristic detector when the trained
model is missing, or when `CRACK_CV_FALLBACK=true` is set.

**Best next step:** label 300+ real frames from your own floors/camera (CVAT or Label Studio,
polygon masks, class `crack`, and include crack-free frames), add them as another `train`/`val`
entry in `data_floor_seg.yaml`, and fine-tune from `models/best.pt`.

## Legacy Synthetic Pipeline

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
