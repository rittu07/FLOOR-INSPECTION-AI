import os
from pathlib import Path
from pydantic import ConfigDict
from pydantic_settings import BaseSettings

# Absolute path to backend directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    FRONTEND_URL: str = "http://localhost:3000"
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
    CRACK_CONFIDENCE_THRESHOLD: float = 0.40


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
