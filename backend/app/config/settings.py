import os
from pathlib import Path
from pydantic import ConfigDict, field_validator
from pydantic_settings import BaseSettings

# Absolute path to backend directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent
# Writable data root: serverless hosts (Vercel sets VERCEL=1) only allow writes under /tmp
DATA_DIR = Path("/tmp/floor-inspection") if os.environ.get("VERCEL") else BASE_DIR

class Settings(BaseSettings):
    FRONTEND_URL: str = "http://localhost:3000"
    # Extra allowed browser origins, comma-separated (e.g. "https://my-app.vercel.app,https://inspect.example.com")
    CORS_ORIGINS: str = ""
    # Regex of additional allowed origins; default covers the Vercel production and preview deployments
    CORS_ORIGIN_REGEX: str = r"^https://floor-inspection-ai(-[a-z0-9-]+)?\.vercel\.app$"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Paths using pathlib
    CAPTURES_DIR: Path = DATA_DIR / "captures"
    OUTPUTS_DIR: Path = DATA_DIR / "outputs"
    DEBUG_DIR: Path = DATA_DIR / "debug"
    # "auto" uploads files to Vercel Blob when BLOB_READ_WRITE_TOKEN is set; "local" keeps them on disk only
    STORAGE_BACKEND: str = "auto"

    # Computer Vision parameters
    MAX_IMAGE_WIDTH: int = 1600
    MAX_MOSAIC_IMAGES: int = 10
    ORB_NFEATURES: int = 3000
    LOWE_RATIO: float = 0.75
    MIN_GOOD_MATCHES: int = 10
    RANSAC_REPROJECTION_THRESHOLD: float = 5.0
    SAVE_DEBUG_IMAGES: bool = False

    # Crack Detection parameters
    CRACK_MODEL_PATH: Path = BASE_DIR / "ml" / "crack_detection" / "models" / "best.pt"
    CRACK_CONFIDENCE_THRESHOLD: float = 0.25
    # "auto" uses PyTorch/Ultralytics when installed, otherwise the ONNX model next to CRACK_MODEL_PATH;
    # "onnx" forces the lightweight ONNX Runtime path (small CPU hosts), "torch" forces Ultralytics
    CRACK_INFERENCE_BACKEND: str = "auto"
    # CPU threads for ONNX Runtime/OpenCV inference; 0 = min(4, cpu_count). Set 1 on tiny hosts (Render free)
    INFERENCE_THREADS: int = 0
    # Run the OpenCV heuristic detector even when the trained crack model returns no detections
    CRACK_CV_FALLBACK: bool = False
    # Ground sampling distance of the stitched mosaic; 0 = uncalibrated (sizes reported in pixels only)
    MOSAIC_MM_PER_PIXEL: float = 0.0


    @field_validator("CAPTURES_DIR", "OUTPUTS_DIR", "DEBUG_DIR")
    @classmethod
    def _resolve_data_dir(cls, value: Path) -> Path:
        """Relative data dirs (e.g. from .env) resolve against the writable data root, not the process CWD."""
        return value if value.is_absolute() else DATA_DIR / value

    @field_validator("CRACK_MODEL_PATH")
    @classmethod
    def _resolve_relative_to_backend(cls, value: Path) -> Path:
        """Relative model paths resolve against the backend directory, not the process CWD."""
        return value if value.is_absolute() else BASE_DIR / value

    model_config = ConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist upon initialization
settings.CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
settings.OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
settings.DEBUG_DIR.mkdir(parents=True, exist_ok=True)
