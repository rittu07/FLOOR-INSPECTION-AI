import time
import uuid
from datetime import datetime
from fastapi import UploadFile, HTTPException, status
from app.config.settings import settings
from app.utils.image_utils import validate_image_bytes, save_image
from app.models.schemas import FrameUploadResponse

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

class CameraService:
    @staticmethod
    async def process_and_save_frame(file: UploadFile) -> FrameUploadResponse:
        """
        Validates uploaded file, decodes image via OpenCV, saves it to captures directory,
        and returns frame metadata.
        """
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "code": "INVALID_REQUEST",
                    "message": "Uploaded file must have a valid filename."
                }
            )

        # Validate Extension
        ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "code": "INVALID_IMAGE",
                    "message": f"Unsupported file extension '{ext}'. Allowed extensions: JPEG, JPG, PNG."
                }
            )

        try:
            content = await file.read()
            # Validate actual image payload using OpenCV decoding
            img = validate_image_bytes(content)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "code": "INVALID_IMAGE",
                    "message": f"File content verification failed: {str(e)}"
                }
            )

        # Generate unique identifier & filename
        now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_suffix = uuid.uuid4().hex[:6]
        frame_id = f"frame_{now_str}_{unique_suffix}"
        filename = f"{frame_id}.jpg"
        
        target_path = settings.CAPTURES_DIR / filename
        save_image(img, target_path)

        url_path = f"/captures/{filename}"

        return FrameUploadResponse(
            id=frame_id,
            filename=filename,
            status="captured",
            url=url_path
        )
