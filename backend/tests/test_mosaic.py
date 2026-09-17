import io
import cv2
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def create_synthetic_textured_sequence(count=5):
    """
    Generates a sequence of overlapping synthetic textured images for multi-image testing.
    """
    h, w = 600, 2000
    canvas = np.zeros((h, w, 3), dtype=np.uint8)
    
    # Draw textured grid pattern
    for y in range(0, h, 30):
        cv2.line(canvas, (0, y), (w, y), (80, 80, 80), 2)
    for x in range(0, w, 30):
        cv2.line(canvas, (x, 0), (x, h), (80, 80, 80), 2)

    # Draw shapes for features
    np.random.seed(42)
    for _ in range(80):
        cx, cy = np.random.randint(50, w-50), np.random.randint(50, h-50)
        r = np.random.randint(10, 30)
        cv2.circle(canvas, (cx, cy), r, (np.random.randint(50, 255), np.random.randint(50, 255), np.random.randint(50, 255)), -1)

    images = []
    crop_w = 600
    step_shift = 120  # Overlap ~75%

    for i in range(count):
        start_x = i * step_shift
        sub_img = canvas[:, start_x:start_x + crop_w].copy()
        _, encoded = cv2.imencode('.jpg', sub_img)
        images.append(encoded.tobytes())

    return images

def upload_frames(images_bytes):
    frame_ids = []
    for idx, b in enumerate(images_bytes):
        res = client.post("/api/camera/capture", files={'file': (f"frame_{idx}.jpg", io.BytesIO(b), 'image/jpeg')})
        assert res.status_code == 201
        frame_ids.append(res.json()["id"])
    return frame_ids

def test_two_image_mosaic_still_works():
    imgs = create_synthetic_textured_sequence(2)
    frame_ids = upload_frames(imgs)

    res = client.post("/api/mosaic/create", json={"image_ids": frame_ids})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["images_used"] == 2
    assert len(data["statistics"]["steps"]) == 1
    assert data["statistics"]["successful_pairs"] == 1

def test_three_image_mosaic():
    imgs = create_synthetic_textured_sequence(3)
    frame_ids = upload_frames(imgs)

    res = client.post("/api/mosaic/create", json={"image_ids": frame_ids})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["images_used"] == 3
    assert len(data["statistics"]["steps"]) == 2
    assert data["statistics"]["successful_pairs"] == 2

def test_five_image_mosaic():
    imgs = create_synthetic_textured_sequence(5)
    frame_ids = upload_frames(imgs)

    res = client.post("/api/mosaic/create", json={"image_ids": frame_ids})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["images_used"] == 5
    assert len(data["statistics"]["steps"]) == 4
    assert data["statistics"]["successful_pairs"] == 4

def test_ten_image_mosaic():
    imgs = create_synthetic_textured_sequence(10)
    frame_ids = upload_frames(imgs)

    res = client.post("/api/mosaic/create", json={"image_ids": frame_ids})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["images_used"] == 10
    assert len(data["statistics"]["steps"]) == 9

def test_too_many_images():
    fake_ids = [f"frame_{i}" for i in range(12)]
    res = client.post("/api/mosaic/create", json={"image_ids": fake_ids})
    assert res.status_code == 400
    data = res.json()
    assert data["code"] == "TOO_MANY_IMAGES"

def test_missing_frame():
    res = client.post("/api/mosaic/create", json={"image_ids": ["nonexistent_1", "nonexistent_2"]})
    assert res.status_code == 404
    data = res.json()
    assert data["code"] == "IMAGE_NOT_FOUND"

def test_insufficient_matches():
    # Upload black image with zero keypoints
    blank = np.zeros((400, 400, 3), dtype=np.uint8)
    _, enc1 = cv2.imencode('.jpg', blank)
    _, enc2 = cv2.imencode('.jpg', blank)

    r1 = client.post("/api/camera/capture", files={'file': ('b1.jpg', io.BytesIO(enc1.tobytes()), 'image/jpeg')})
    r2 = client.post("/api/camera/capture", files={'file': ('b2.jpg', io.BytesIO(enc2.tobytes()), 'image/jpeg')})

    res = client.post("/api/mosaic/create", json={"image_ids": [r1.json()["id"], r2.json()["id"]]})
    assert res.status_code == 400
    data = res.json()
    assert data["status"] == "error"

def test_intermediate_failure_reporting():
    imgs = create_synthetic_textured_sequence(2)
    frame_ids = upload_frames(imgs)
    
    # Add a blank image as frame 3 to force step 2 failure
    blank = np.zeros((400, 400, 3), dtype=np.uint8)
    _, enc_blank = cv2.imencode('.jpg', blank)
    r3 = client.post("/api/camera/capture", files={'file': ('blank.jpg', io.BytesIO(enc_blank.tobytes()), 'image/jpeg')})
    frame_ids.append(r3.json()["id"])

    res = client.post("/api/mosaic/create", json={"image_ids": frame_ids})
    assert res.status_code == 400
    data = res.json()
    assert data["status"] == "error"
    assert data["code"] == "STITCHING_FAILED"
    assert data["failed_step"] == 2
    assert data["successful_images"] == 2
