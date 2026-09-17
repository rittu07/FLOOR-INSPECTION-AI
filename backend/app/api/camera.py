from fastapi import APIRouter, UploadFile, File, status
from app.services.camera_service import CameraService
from app.models.schemas import FrameUploadResponse, ErrorResponse

router = APIRouter(prefix="/api/camera", tags=["Camera"])

@router.post(
    "/capture",
    response_model=FrameUploadResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid image format or content"},
    }
)
async def capture_frame(file: UploadFile = File(...)):
    """
    Upload and store a captured webcam floor image frame.
    Validates file extension and byte payload using OpenCV.
    """
    return await CameraService.process_and_save_frame(file)
