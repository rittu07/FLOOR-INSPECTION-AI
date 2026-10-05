"""
File storage for captured frames, mosaics, metadata and crack results.

Files are always written to the local data directories first (CAPTURES_DIR / OUTPUTS_DIR), which act as a
working cache. When a Vercel Blob store is connected (BLOB_READ_WRITE_TOKEN is set), files are also uploaded
there and their public Blob URL is returned, and files missing from the local cache are downloaded on demand.
This makes the backend work on serverless hosts (Vercel), where each request may run on a different instance
with an empty, temporary filesystem.
"""

import logging
import os
from pathlib import Path
from typing import Optional

from app.config.settings import settings

logger = logging.getLogger("floor_inspection.storage")

_CONTENT_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".json": "application/json"}


def _local_dir(kind: str) -> Path:
    if kind == "captures":
        return settings.CAPTURES_DIR
    if kind == "outputs":
        return settings.OUTPUTS_DIR
    raise ValueError(f"Unknown storage kind '{kind}'")


def blob_enabled() -> bool:
    return bool(os.environ.get("BLOB_READ_WRITE_TOKEN")) and settings.STORAGE_BACKEND.lower() in ("auto", "blob")


def publish(kind: str, local_path: Path) -> str:
    """
    Makes a locally written file available to clients and later requests.
    Returns its public URL: the Vercel Blob URL when Blob is enabled, otherwise "/<kind>/<filename>".
    """
    if blob_enabled():
        from vercel.blob import put

        content_type = _CONTENT_TYPES.get(local_path.suffix.lower(), "application/octet-stream")
        result = put(
            f"{kind}/{local_path.name}",
            local_path.read_bytes(),
            access="public",
            content_type=content_type,
            overwrite=True,
        )
        return result.url
    return f"/{kind}/{local_path.name}"


def ensure_local(kind: str, filename: str) -> Optional[Path]:
    """
    Returns a local path for a stored file, downloading it from Blob into the local cache if needed.
    Returns None when the file does not exist anywhere.
    """
    local_path = _local_dir(kind) / Path(filename).name
    if local_path.exists():
        return local_path
    if not blob_enabled():
        return None

    from vercel.blob import BlobNotFoundError, get

    try:
        result = get(f"{kind}/{local_path.name}", access="public")
    except BlobNotFoundError:
        return None
    except Exception as exc:  # network / service errors: treat as missing but log
        logger.error(f"Blob download failed for {kind}/{local_path.name}: {exc}")
        return None
    if result is None or not result.content:
        return None

    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(result.content)
    return local_path


def resolve_frame(frame_id: str) -> Optional[Path]:
    """Finds a captured frame by id or filename (with or without .jpg)."""
    name = Path(frame_id).name
    path = ensure_local("captures", name)
    if path is None and not name.endswith(".jpg"):
        path = ensure_local("captures", f"{name}.jpg")
    return path
