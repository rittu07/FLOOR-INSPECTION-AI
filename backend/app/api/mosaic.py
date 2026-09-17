from fastapi import APIRouter, status
from app.services.mosaic_service import MosaicService
from app.models.schemas import MosaicCreateRequest, MosaicResponse, MosaicMetadataResponse, ErrorResponse

router = APIRouter(prefix="/api/mosaic", tags=["Mosaic"])

@router.post(
    "/create",
    response_model=MosaicMetadataResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Mosaicking processing error (insufficient matches, homography failure, too many images)"},
        404: {"model": ErrorResponse, "description": "Captured frame ID not found"},
    }
)
async def create_mosaic(payload: MosaicCreateRequest):
    """
    Executes OpenCV sequential floor mosaicking pipeline for 2 to 10 images.
    Preserves frame capture sequence order and records per-step statistics telemetry and homography transforms.
    """
    return MosaicService.create_mosaic(payload.image_ids)

@router.get(
    "/{mosaic_id}",
    response_model=MosaicMetadataResponse,
    status_code=status.HTTP_200_OK,
    responses={
        404: {"model": ErrorResponse, "description": "Mosaic metadata not found"},
    }
)
async def get_mosaic_metadata(mosaic_id: str):
    """
    Retrieves mosaic metadata, dimensions, image URLs, and frame transformation matrices by ID.
    """
    return MosaicService.get_mosaic_metadata(mosaic_id)

