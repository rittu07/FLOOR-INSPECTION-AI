import os
from pathlib import Path
from pydantic import ConfigDict, field_validator
from pydantic_settings import BaseSettings

# Absolute path to backend directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    FRONTEND_URL: str = "http://localhost:3000"
    # Extra allowed browser origins, comma-separated (e.g. "https://my-app.vercel.app,https://inspect.example.com")
    CORS_ORIGINS: str = ""
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Paths using pathlib
    CAPTURES_DIR: Path = BASE_DIR / "captures"
    OUTPUTS_DIR: Path = BASE_DIR / "outputs"
    DEBUG_DIR: Path = BASE_DIR / "debug"

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
    # Run the OpenCV heuristic detector even when the trained crack model returns no detections
    CRACK_CV_FALLBACK: bool = False
    # Ground sampling distance of the stitched mosaic; 0 = uncalibrated (sizes reported in pixels only)
    MOSAIC_MM_PER_PIXEL: float = 0.0


    @field_validator("CAPTURES_DIR", "OUTPUTS_DIR", "DEBUG_DIR", "CRACK_MODEL_PATH")
    @classmethod
    def _resolve_relative_to_backend(cls, value: Path) -> Path:
        """Relative paths (e.g. from .env) resolve against the backend directory, not the process CWD."""
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
