# FLOOR INSPECTION AI — Computer Vision Backend

Industrial Python FastAPI backend and OpenCV image-mosaicking engine for the **FLOOR INSPECTION AI** platform.

This stage implements live webcam image frame upload, verified storage, ORB feature detection, BFMatcher KNN matching with Lowe's ratio test, RANSAC homography estimation, perspective warping, weighted overlap blending, and black border cropping.

---

## 🚀 Quick Start Guide

### 1. Create Python Virtual Environment

```bash
python -m venv .venv
```

Activate the virtual environment:

- **Windows PowerShell / CMD:**
  ```cmd
  .venv\Scripts\activate
  ```
- **Linux / macOS:**
  ```bash
  source .venv/bin/activate
  ```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run FastAPI Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The server will start on `http://localhost:8000`.

- **Health Check Endpoint:** [http://localhost:8000/health](http://localhost:8000/health)
- **Interactive Swagger OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📁 Directory Structure

```
backend/
├── app/
│   ├── api/             # FastAPI Endpoint Routers (/api/camera, /api/mosaic)
│   ├── config/          # Pydantic Settings & Environment Loaders
│   ├── models/          # Request, Response, and Error Schemas
│   ├── services/        # Business Logic & OpenCV Mosaicking Engine
│   ├── utils/           # OpenCV Image Load, Save, Resize, Grayscale & Crop Helpers
│   └── main.py          # Application Entrypoint & Middleware
├── captures/            # Uploaded webcam frames storage
├── outputs/             # Generated mosaic output storage
├── debug/               # Optional debug visualization images
├── tests/               # Pytest suite & manual CLI test script
├── requirements.txt     # Dependency specifications
├── .env.example         # Environment variables template
└── README.md            # Technical documentation
```

---

## 📡 API Endpoints

### 1. Liveness Health Check
- **`GET /health`**
- **Response:**
  ```json
  {
    "status": "ok",
    "service": "floor-inspection-backend"
  }
  ```

### 2. Camera Frame Capture Upload
- **`POST /api/camera/capture`**
- **Content-Type:** `multipart/form-data` (`file: <image_file>`)
- **Response:**
  ```json
  {
    "id": "frame_20260917_103001_a1b2c3",
    "filename": "frame_20260917_103001_a1b2c3.jpg",
    "status": "captured",
    "url": "/captures/frame_20260917_103001_a1b2c3.jpg"
  }
  ```

### 3. Floor Image Mosaicking Creation
- **`POST /api/mosaic/create`**
- **Content-Type:** `application/json`
- **Payload:**
  ```json
  {
    "image_ids": [
      "frame_20260917_103001_a1b2c3",
      "frame_20260917_103005_d4e5f6"
    ]
  }
  ```
- **Response:**
  ```json
  {
    "id": "mosaic_20260917_103010_x1y2z3",
    "status": "completed",
    "image_url": "/outputs/mosaic_20260917_103010_x1y2z3.jpg",
    "images_used": 2,
    "statistics": {
      "keypoints_image1": 2143,
      "keypoints_image2": 1987,
      "raw_matches": 1240,
      "good_matches": 184,
      "inliers": 137,
      "inlier_ratio": 0.7446
    },
    "processing_time_seconds": 0.428
  }
  ```

---

## 📷 Computer Vision Image Requirements

For 2-image OpenCV floor stitching to succeed:
1. **Overlap:** The two floor images must have **30% – 50% spatial overlap**.
2. **Viewpoint:** Keep the camera perpendicular to the floor at a uniform height.
3. **Texture:** Floor surfaces should contain visual feature texture (concrete grain, tile seams, cracks, patterns). Avoid featureless solid white walls.
4. **Motion Blur:** Hold the camera steady during capture.

---

## 🔬 Testing & CLI Diagnostics

### Run Automated Unit Tests
```bash
pytest tests/
```

### Manual OpenCV CLI Test Script
Test stitching directly on two image files without starting the server:

```bash
python tests/manual_test_mosaic.py path/to/image1.jpg path/to/image2.jpg
```

Output is saved to `debug/manual_mosaic.jpg` and OpenCV telemetry is printed to terminal.
