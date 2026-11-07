"""
Pytest Suite for YOLO Crack Detection Endpoint and Service.
Tests model file loading, API response schemas, image upload validations, and confidence threshold bounds.
"""

import io
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
import cv2
import numpy as np

from app.main import app
from app.config.settings import settings
from app.services.crack_service import crack_service

client = TestClient(app)

def create_dummy_image_bytes(width=100, height=100, color=(128, 128, 128)) -> bytes:
    img = np.full((height, width, 3), color, dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", img)
    return encoded.tobytes()

def test_crack_detection_endpoint_valid_image():
    img_bytes = create_dummy_image_bytes()
    files = {"file": ("test_floor.jpg", io.BytesIO(img_bytes), "image/jpeg")}
    response = client.post("/api/crack/detect", files=files)
    
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["status"] == "completed"
    assert "image_url" in data
    assert "annotated_image_url" in data
    assert "detections" in data
    assert "summary" in data
    assert "crack_count" in data
    assert "avg_confidence" in data
    assert "highest_confidence" in data
    assert "processing_time_seconds" in data
    assert isinstance(data["detections"], list)

def test_crack_detection_endpoint_invalid_file_type():
    files = {"file": ("document.pdf", io.BytesIO(b"%PDF-1.4 test"), "application/pdf")}
    response = client.post("/api/crack/detect", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["status"] == "error"
    assert "Invalid file format" in data["message"]

def test_crack_detection_endpoint_empty_file():
    files = {"file": ("empty.jpg", io.BytesIO(b""), "image/jpeg")}
    response = client.post("/api/crack/detect", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["status"] == "error"
    assert "empty" in data["message"].lower()

def test_crack_detection_with_custom_confidence():
    img_bytes = create_dummy_image_bytes()
    files = {"file": ("test_floor.jpg", io.BytesIO(img_bytes), "image/jpeg")}
    response = client.post("/api/crack/detect?conf_threshold=0.85", files=files)
    assert response.status_code == 200

def test_crack_detection_invalid_confidence_threshold():
    img_bytes = create_dummy_image_bytes()
    files = {"file": ("test_floor.jpg", io.BytesIO(img_bytes), "image/jpeg")}
    response = client.post("/api/crack/detect?conf_threshold=1.5", files=files)
    assert response.status_code == 422  # Validation error from Query(le=1.0)

def test_crack_service_direct_call():
    img_bytes = create_dummy_image_bytes(200, 200)
    result = crack_service.detect_cracks(img_bytes, "direct_test.jpg", confidence_threshold=0.3)
    assert result.status == "completed"
    assert result.image_url.startswith("/outputs/")
    assert result.processing_time_seconds > 0


def test_tile_grid_covers_image_with_overlap():
    from app.services.crack_service import CrackService

    assert CrackService._tile_grid(500, 640, 0.25) == [0]
    starts = CrackService._tile_grid(1500, 640, 0.25)
    assert starts[0] == 0 and starts[-1] == 1500 - 640
    # consecutive tiles overlap, so no pixel column is left uncovered
    assert all(b - a < 640 for a, b in zip(starts, starts[1:]))


def _surface(h=200, w=400):
    rng = np.random.default_rng(1)
    return np.clip(rng.normal(170, 6, (h, w, 3)), 0, 255).astype(np.uint8)


def test_growth_bridges_hairline_gap_between_fragments():
    from app.services.crack_service import CrackService

    img = _surface()
    # one wavy hairline crack across the image
    pts = np.array([[x, 100 + int(8 * np.sin(x / 25))] for x in range(20, 380)], np.int32)
    cv2.polylines(img, [pts], False, (60, 60, 60), 2)
    # the model only found its two ends (seeds); the middle 80 px is the missed hairline
    seeds = np.zeros(img.shape[:2], np.uint8)
    cv2.polylines(seeds, [pts[pts[:, 0] < 160]], False, 255, 5)
    cv2.polylines(seeds, [pts[pts[:, 0] > 240]], False, 255, 5)

    grown = CrackService._grow_along_cracks(img, seeds, 120)

    gap = (pts[:, 0] > 170) & (pts[:, 0] < 230)
    covered = [grown[y, x] > 0 for x, y in pts[gap]]
    assert np.mean(covered) > 0.9
    assert cv2.connectedComponents(cv2.dilate(grown, np.ones((5, 5), np.uint8)))[0] - 1 == 1


def test_growth_ignores_grout_crossing_middle_of_crack():
    from app.services.crack_service import CrackService

    img = _surface()
    cv2.line(img, (20, 100), (380, 110), (60, 60, 60), 3)       # crack, fully detected
    cv2.line(img, (200, 0), (203, 199), (90, 90, 90), 2)          # grout joint crossing its middle
    seeds = np.zeros(img.shape[:2], np.uint8)
    cv2.line(seeds, (20, 100), (380, 110), 255, 7)

    grown = CrackService._grow_along_cracks(img, seeds, 120)

    added = (grown > 0) & (seeds == 0)
    assert added[:85, 190:215].sum() == 0 and added[125:, 190:215].sum() == 0
