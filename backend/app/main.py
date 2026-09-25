import logging
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.config.settings import settings
from app.models.schemas import HealthResponse, ErrorResponse
from app.api.camera import router as camera_router
from app.api.mosaic import router as mosaic_router
from app.api.crack import router as crack_router
from app.api.localization import router as localization_router

logger = logging.getLogger("floor_inspection.main")

app = FastAPI(
    title="FLOOR INSPECTION AI — Computer Vision Backend",
    description="FastAPI service for webcam image acquisition, frame storage, OpenCV floor mosaicking, YOLO crack detection, and floor coordinate localization.",
    version="1.0.0",
)

@app.on_event("startup")
async def startup_event():
    try:
        import torch
        device_name = "CUDA (" + torch.cuda.get_device_name(0) + ")" if torch.cuda.is_available() else "CPU"
    except Exception:
        device_name = "CPU"
    logger.info(f"Starting Floor Inspection Backend Service on device: {device_name}")

# Configure CORS for Next.js frontend
origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    *[o.strip().rstrip("/") for o in settings.CORS_ORIGINS.split(",") if o.strip()],
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static images for captured frames and generated mosaics
app.mount("/captures", StaticFiles(directory=str(settings.CAPTURES_DIR)), name="captures")
app.mount("/outputs", StaticFiles(directory=str(settings.OUTPUTS_DIR)), name="outputs")

# Include API Routers
app.include_router(camera_router)
app.include_router(mosaic_router)
app.include_router(crack_router)
app.include_router(localization_router)



@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Service liveness & readiness check endpoint.
    """
    return HealthResponse(status="ok", service="floor-inspection-backend")

# Custom Error Handling middleware ensuring consistent JSON error responses
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and exc.detail.get("status") == "error":
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    
    error_payload = ErrorResponse(
        status="error",
        code="INVALID_REQUEST" if exc.status_code < 500 else "INTERNAL_SERVER_ERROR",
        message=str(exc.detail),
    ).model_dump()
    return JSONResponse(status_code=exc.status_code, content=error_payload)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Server Error: {exc}", exc_info=True)
    error_payload = ErrorResponse(
        status="error",
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected server error occurred during processing.",
    ).model_dump()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_payload
    )
