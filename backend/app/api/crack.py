"""
FastAPI Router for YOLO Concrete Surface Crack Detection.
Handles POST /api/crack/detect image upload and returns structured detection response.
"""

import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Query, HTTPException, status

from app.models.schemas import CrackDetectionResponse, ErrorResponse
from app.services.crack_service import crack_service

logger = logging.getLogger("floor_inspection.crack_api")

router = APIRouter(prefix="/api/crack", tags=["Crack Detection"])

@router.post(
    "/detect",
    response_model=CrackDetectionResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid image file format or parameters"},
        500: {"model": ErrorResponse, "description": "Inference server error"},
    },
)
async def detect_cracks(
    file: UploadFile = File(..., description="Floor image file (JPEG/PNG)"),
    conf_threshold: Optional[float] = Query(
        None, ge=0.0, le=1.0, description="Confidence threshold override (0.0 to 1.0)"
    ),
    sensitivity: Optional[str] = Query(
        "high", description="Crack detection sensitivity: 'high' (minute micro cracks), 'balanced', 'low'"
    ),
    min_area: Optional[float] = Query(
        None, ge=1.0, description="Minimum crack area limit in pixels"
    ),
):

    """
    Run YOLO-based crack detection on an uploaded floor image.
    Returns bounding box detections, statistics, and annotated output image URL.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        # Check filename extension if content type header is generic binary stream
        valid_exts = (".jpg", ".jpeg", ".png", ".bmp", ".webp")
        if not (file.filename and file.filename.lower().endswith(valid_exts)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Upload a valid image file (JPEG/PNG).",
            )

    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes).",
            )

        response = crack_service.detect_cracks(
            image_bytes=contents,
            filename=file.filename or "upload.jpg",
            confidence_threshold=conf_threshold,
            sensitivity=sensitivity or "high",
            min_area=min_area,
        )

        return response
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as exc:
        logger.error(f"Error during crack detection request: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing crack detection.",
        )

