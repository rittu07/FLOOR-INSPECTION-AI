# AI-Driven Autonomous Floor Inspection System — Phase 3: YOLO Crack Detection

An industrial computer vision application combining Next.js frontend, FastAPI Python backend, OpenCV feature-based floor mosaicking, and YOLO-based concrete surface crack detection.

---

## System Architecture

```
FLOOR INSPECTION APPLICATION
├── Next.js Frontend (src/)
│   ├── /camera            # HTML5 webcam acquisition stream & frame storage
│   ├── /mosaicking        # ORB/SIFT OpenCV floor homography image stitching
│   ├── /crack-detection   # YOLO-based crack detection UI & per-image telemetry
│   └── /                  # System diagnostic status & pipeline roadmap dashboard
│
└── FastAPI Backend (backend/)
    ├── POST /api/camera/capture   # Frame upload & static server storage
    ├── POST /api/mosaic/create    # ORB feature matching & homography mosaic
    ├── POST /api/crack/detect     # YOLO object detection & bounding box inference
    └── ml/crack_detection/        # Standalone ML pipeline (train, eval, predict)
```

---

## Machine Learning Pipeline (`backend/ml/crack_detection/`)

### 1. Dataset Acquisition & Standardization
Generates standardized concrete crack dataset with normalized YOLO label files (`0 x_center y_center width height`):
```bash
python backend/ml/crack_detection/scripts/prepare_dataset.py
```

### 2. Dataset Validation & Sanity Inspection
Validates image files, label matching, normalized coordinate bounds $[0.0, 1.0]$, and box dimensions:
```bash
python backend/ml/crack_detection/scripts/validate_dataset.py
```

### 3. Reproducible Dataset Split (70/20/10)
Splits dataset into 70% Train, 20% Validation, and 10% Test (random seed 42):
```bash
python backend/ml/crack_detection/scripts/split_dataset.py
```

### 4. Preview Bounding Box Overlay
Renders preview sample images into `backend/ml/crack_detection/datasets/preview/`:
```bash
python backend/ml/crack_detection/scripts/preview_annotations.py
```

### 5. YOLO Model Training
Trains model on concrete crack dataset and exports best weights to `backend/ml/crack_detection/models/best.pt`:
```bash
python backend/ml/crack_detection/training/train.py --epochs 5 --batch 16
```

### 6. Test-Set Model Evaluation
Evaluates precision, recall, mAP@50, mAP@50-95, and average inference latency:
```bash
python backend/ml/crack_detection/evaluation/evaluate.py
```

### 7. Standalone CLI Prediction Utility
Run crack detection on any image file:
```bash
python backend/ml/crack_detection/scripts/predict.py --source sample.jpg --conf 0.40
```

---

## Set Up on a New Machine (Windows)

Prerequisites: [Git](https://git-scm.com), [Node.js 20+](https://nodejs.org), [Python 3.11](https://python.org) (tick "Add to PATH").

```bash
git clone https://github.com/rittu07/FLOOR-INSPECTION-AI
cd FLOOR-INSPECTION-AI
powershell -ExecutionPolicy Bypass -File setup.ps1
powershell -ExecutionPolicy Bypass -File start.ps1
```

`setup.ps1` installs frontend packages, creates `backend/.venv` with PyTorch (CUDA build when an NVIDIA GPU is
detected, CPU build otherwise), installs backend requirements and creates `backend/.env`.
`start.ps1` opens the backend (http://localhost:8000/docs) and frontend (http://localhost:3000) in separate windows.

- **Trained model**: the deployed crack model `backend/ml/crack_detection/models/best.pt` (~23 MB, optimizer
  stripped) is versioned in git, so a clone is ready to detect cracks. Other `*.pt` files stay ignored.
- **Datasets** are not in git; rebuild them only if you want to retrain:
  `backend.venvScriptspython backendmlcrack_detectionscriptsuild_floor_dataset.py` (training needs an NVIDIA GPU).
- **Syncing between machines**: `git pull` before you start, `git push` when you finish. After retraining, strip and
  commit the new model:
  ```bash
  backend.venvScriptspython -c "from ultralytics.utils.torch_utils import strip_optimizer; strip_optimizer('backend/ml/crack_detection/runs/crack_seg_v2/weights/best.pt', s='backend/ml/crack_detection/models/best.pt')"
  ```

---

## Running the Application

### 1. Start FastAPI Backend
```bash
cd backend
.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

### 2. Start Next.js Frontend
```bash
npm run dev
```

---

## Verification & Testing Suite

### Run Backend Pytest Suite
```bash
backend\.venv\Scripts\pytest backend/tests
```

### Run Frontend Typecheck & Build
```bash
npm run build
```

