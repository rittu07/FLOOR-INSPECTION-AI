import pytest
import numpy as np
import cv2
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.config.settings import settings
from app.services.mosaic_service import MosaicService
from app.services.crack_localization_service import CrackLocalizationService
from app.models.schemas import (
    Point2DSchema,
    BoundingBoxSchema,
    FrameTransformSchema,
    MosaicMetadataResponse,
    MosaicStatsSchema,
    LocalizationMapRequestItem,
)

client = TestClient(app)

def test_identity_homography_mapping():
    """Verify points transformed through identity homography maintain exact coordinates."""
    H = np.eye(3, dtype=np.float32)
    pts = [(10.0, 20.0), (100.5, 200.25)]
    res = CrackLocalizationService.transform_points(pts, H)
    assert len(res) == 2
    assert res[0].x == 10.0
    assert res[0].y == 20.0
    assert res[1].x == 100.5
    assert res[1].y == 200.25

def test_translation_homography_mapping():
    """Verify points transformed through pure translation homography shift correctly."""
    shift_x, shift_y = 50.0, 100.0
    H = np.array([
        [1.0, 0.0, shift_x],
        [0.0, 1.0, shift_y],
        [0.0, 0.0, 1.0]
    ], dtype=np.float32)
    
    pts = [(10.0, 20.0)]
    res = CrackLocalizationService.transform_points(pts, H)
    assert len(res) == 1
    assert res[0].x == 60.0
    assert res[0].y == 120.0

def test_bbox_center_and_polygon_transformation():
    """Verify bounding box center calculation and 4-corner polygon transformation."""
    bbox = BoundingBoxSchema(x=10.0, y=20.0, width=40.0, height=60.0)
    H = np.eye(3, dtype=np.float32)
    
    center, polygon = CrackLocalizationService.transform_bbox(bbox, H)
    
    # Center should be (10 + 20, 20 + 30) = (30, 50)
    assert center.x == 30.0
    assert center.y == 50.0
    assert len(polygon) == 4
    # Polygon corners: TL(10,20), TR(50,20), BR(50,80), BL(10,80)
    assert polygon[0] == Point2DSchema(x=10.0, y=20.0)
    assert polygon[1] == Point2DSchema(x=50.0, y=20.0)
    assert polygon[2] == Point2DSchema(x=50.0, y=80.0)
    assert polygon[3] == Point2DSchema(x=10.0, y=80.0)

def test_check_out_of_bounds():
    """Verify out of bounds validation for points relative to mosaic dimensions."""
    mosaic_w, mosaic_h = 1000, 800
    
    assert CrackLocalizationService.check_out_of_bounds(Point2DSchema(x=500, y=400), mosaic_w, mosaic_h) is False
    assert CrackLocalizationService.check_out_of_bounds(Point2DSchema(x=-5, y=400), mosaic_w, mosaic_h) is True
    assert CrackLocalizationService.check_out_of_bounds(Point2DSchema(x=500, y=850), mosaic_w, mosaic_h) is True

def test_localize_detections_mock():
    """Verify end-to-end localization mapping logic with spatial duplicate detection."""
    mock_id = "mosaic_test_mock_123"
    
    transform_frame1 = FrameTransformSchema(
        frame_id="frame_001.jpg",
        filename="frame_001.jpg",
        homography=np.eye(3, dtype=np.float32).tolist(),
        source_width=1920,
        source_height=1080,
        mosaic_width=2000,
        mosaic_height=1500,
    )
    
    shift_H = np.array([
        [1.0, 0.0, 10.0],
        [0.0, 1.0, 10.0],
        [0.0, 0.0, 1.0]
    ], dtype=np.float32).tolist()
    
    transform_frame2 = FrameTransformSchema(
        frame_id="frame_002.jpg",
        filename="frame_002.jpg",
        homography=shift_H,
        source_width=1920,
        source_height=1080,
        mosaic_width=2000,
        mosaic_height=1500,
    )

    mock_metadata = MosaicMetadataResponse(
        id=mock_id,
        status="completed",
        image_url=f"/outputs/{mock_id}.jpg",
        images_used=2,
        width=2000,
        height=1500,
        frames=["frame_001.jpg", "frame_002.jpg"],
        transforms=[transform_frame1, transform_frame2],
        statistics=MosaicStatsSchema(
            total_images=2,
            successful_pairs=1,
            failed_pairs=0,
            total_good_matches=100,
            total_inliers=80,
            average_inlier_ratio=0.8,
            steps=[]
        ),
        processing_time_seconds=1.0,
    )
    
    MosaicService.MOSAIC_STORE[mock_id] = mock_metadata.model_dump()
    
    detections = [
        LocalizationMapRequestItem(
            frame_id="frame_001.jpg",
            confidence=0.92,
            bbox=BoundingBoxSchema(x=100, y=100, width=50, height=50)
        ),
        # Detection 2 is very close to detection 1 in mosaic space -> duplicate
        LocalizationMapRequestItem(
            frame_id="frame_002.jpg",
            confidence=0.88,
            bbox=BoundingBoxSchema(x=90, y=90, width=50, height=50)  # Center (115,115) + shift(10,10) = (125,125) vs (125,125)
        ),
    ]

    res = CrackLocalizationService.localize_detections(mock_id, detections)
    
    assert res.mosaic_id == mock_id
    assert res.total_cracks == 2
    assert res.localized_cracks == 2
    assert res.cracks[0].possible_duplicate_of is None
    assert res.cracks[1].possible_duplicate_of == res.cracks[0].id

def test_localization_error_handling():
    """Verify structured API error responses for invalid requests."""
    # 1. MOSAIC_NOT_FOUND
    res = client.get("/api/mosaic/non_existent_mosaic_999")
    assert res.status_code == 404
    assert res.json()["code"] == "MOSAIC_NOT_FOUND"

    # 2. FRAME_NOT_FOUND
    mock_id = "mosaic_error_test_456"
    mock_metadata = MosaicMetadataResponse(
        id=mock_id,
        status="completed",
        image_url=f"/outputs/{mock_id}.jpg",
        images_used=1,
        width=1000,
        height=1000,
        frames=["frame_001.jpg"],
        transforms=[
            FrameTransformSchema(
                frame_id="frame_001.jpg",
                filename="frame_001.jpg",
                homography=np.eye(3).tolist(),
                source_width=1000,
                source_height=1000,
                mosaic_width=1000,
                mosaic_height=1000,
            )
        ],
        statistics=MosaicStatsSchema(
            total_images=1,
            successful_pairs=0,
            failed_pairs=0,
            total_good_matches=0,
            total_inliers=0,
            average_inlier_ratio=0.0,
            steps=[]
        ),
        processing_time_seconds=0.5,
    )
    MosaicService.MOSAIC_STORE[mock_id] = mock_metadata.model_dump()

    map_payload = {
        "mosaic_id": mock_id,
        "detections": [
            {
                "frame_id": "frame_UNKNOWN.jpg",
                "confidence": 0.85,
                "bbox": {"x": 10, "y": 10, "width": 20, "height": 20}
            }
        ]
    }
    
    resp = client.post("/api/localization/map", json=map_payload)
    assert resp.status_code == 400
    assert resp.json()["code"] == "FRAME_NOT_FOUND"
