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
