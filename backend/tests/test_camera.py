import io
import cv2
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def create_test_image_bytes(width=640, height=480, color=(100, 150, 200)):
    img = np.full((height, width, 3), color, dtype=np.uint8)
    # Add random text and lines to ensure valid image
    cv2.putText(img, "TEST FRAME", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    success, encoded_img = cv2.imencode('.jpg', img)
    assert success
    return encoded_img.tobytes()

def test_capture_invalid_file_extension():
    files = {'file': ('test.txt', b'not an image', 'text/plain')}
    response = client.post("/api/camera/capture", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["status"] == "error"
    assert data["code"] == "INVALID_IMAGE"

def test_capture_invalid_file_content():
    files = {'file': ('test.jpg', b'corrupted bytes', 'image/jpeg')}
    response = client.post("/api/camera/capture", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["status"] == "error"

def test_capture_valid_image():
    img_bytes = create_test_image_bytes()
    files = {'file': ('frame.jpg', io.BytesIO(img_bytes), 'image/jpeg')}
    response = client.post("/api/camera/capture", files=files)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["status"] == "captured"
    assert data["url"].startswith("/captures/")
