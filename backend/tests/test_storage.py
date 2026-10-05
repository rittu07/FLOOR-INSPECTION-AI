import io
import shutil
import types

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.config.settings import settings
from app.main import app
from app.services import storage


class FakeBlobStore:
    """In-memory stand-in for vercel.blob (put/get) to exercise the serverless storage path."""

    def __init__(self):
        self.files = {}

    def put(self, path, body, *, access="public", content_type=None, overwrite=False, **_):
        self.files[path] = bytes(body)
        return types.SimpleNamespace(url=f"https://store.public.blob.vercel-storage.com/{path}", pathname=path)

    def get(self, path, *, access="public", **_):
        if path not in self.files:
            raise self.not_found(path)
        return types.SimpleNamespace(content=self.files[path], pathname=path)


@pytest.fixture
def blob_store(monkeypatch, tmp_path):
    import vercel.blob as vb

    store = FakeBlobStore()
    store.not_found = vb.BlobNotFoundError
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "test-token")
    monkeypatch.setattr(vb, "put", store.put)
    monkeypatch.setattr(vb, "get", store.get)
    monkeypatch.setattr(settings, "CAPTURES_DIR", tmp_path / "captures")
    monkeypatch.setattr(settings, "OUTPUTS_DIR", tmp_path / "outputs")
    settings.CAPTURES_DIR.mkdir()
    settings.OUTPUTS_DIR.mkdir()
    return store


def _wipe_local_cache():
    """Simulates the next request landing on a fresh serverless instance."""
    for d in (settings.CAPTURES_DIR, settings.OUTPUTS_DIR):
        shutil.rmtree(d)
        d.mkdir()


def _jpeg(seed: int = 0) -> bytes:
    rng = np.random.default_rng(seed)
    img = rng.integers(0, 255, size=(240, 320, 3), dtype=np.uint8)
    return cv2.imencode(".jpg", img)[1].tobytes()


def test_frame_upload_returns_blob_url_and_survives_fresh_instance(blob_store):
    client = TestClient(app)
    res = client.post("/api/camera/capture", files={"file": ("f.jpg", io.BytesIO(_jpeg()), "image/jpeg")})
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["url"].startswith("https://store.public.blob.vercel-storage.com/captures/")
    assert f"captures/{body['filename']}" in blob_store.files

    _wipe_local_cache()
    path = storage.resolve_frame(body["id"])
    assert path is not None and path.exists()
    assert path.read_bytes() == blob_store.files[f"captures/{body['filename']}"]


def test_missing_file_returns_none(blob_store):
    assert storage.resolve_frame("frame_does_not_exist") is None


def test_local_mode_without_token(monkeypatch, tmp_path):
    monkeypatch.delenv("BLOB_READ_WRITE_TOKEN", raising=False)
    monkeypatch.setattr(settings, "OUTPUTS_DIR", tmp_path)
    f = tmp_path / "x.jpg"
    f.write_bytes(b"data")
    assert storage.publish("outputs", f) == "/outputs/x.jpg"
    assert storage.ensure_local("outputs", "x.jpg") == f
