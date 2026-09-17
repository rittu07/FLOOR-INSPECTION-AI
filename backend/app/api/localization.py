from fastapi import APIRouter, status
from app.services.crack_localization_service import CrackLocalizationService
from app.models.schemas import (
    LocalizationMapRequest,
    LocalizationProcessRequest,
    LocalizationResponse,
    ErrorResponse,
)

router = APIRouter(prefix="/api/localization", tags=["Localization"])

@router.post(
    "/map",
    response_model=LocalizationResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Localization mapping error (missing frame or invalid homography)"},
        404: {"model": ErrorResponse, "description": "Mosaic not found"},
    }
)
async def map_detections(payload: LocalizationMapRequest):
    """
    Maps a list of frame-level YOLO crack detections onto global floor mosaic coordinates using homography transformations.
    """
    return CrackLocalizationService.localize_detections(payload.mosaic_id, payload.detections)

@router.post(
    "/process",
    response_model=LocalizationResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Localization processing error"},
        404: {"model": ErrorResponse, "description": "Mosaic not found"},
    }
)
async def process_mosaic_localization(payload: LocalizationProcessRequest):
    """
    Executes automated multi-frame localization pipeline: runs YOLO crack detection across all source frames of a mosaic,
    maps detections into global floor mosaic space, and flags spatial duplicate detections.
    """
    return CrackLocalizationService.process_mosaic_localization(
        mosaic_id=payload.mosaic_id,
        confidence_threshold=payload.confidence_threshold,
    )
