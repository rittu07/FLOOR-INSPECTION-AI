"""
Deploy the FastAPI backend to a Hugging Face Docker Space (free CPU tier, public HTTPS URL).

Prerequisites (one time):
    pip install huggingface_hub
    hf auth login            # paste a token with "write" access from https://huggingface.co/settings/tokens

Usage (from the backend/ directory):
    python scripts/deploy_hf_space.py                         # -> <your-username>/floor-inspection-api
    python scripts/deploy_hf_space.py --space myorg/my-space --model ml/crack_detection/runs/crack_seg_v2/weights/best.pt

The script strips optimizer state from the model (~92 MB -> ~20 MB), creates the Space if needed,
uploads the backend source + model in a single commit (one rebuild), and sets runtime variables.
"""

import argparse
import tempfile
from pathlib import Path

from huggingface_hub import CommitOperationAdd, HfApi

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MODEL = BACKEND_DIR / "ml" / "crack_detection" / "models" / "best.pt"
MODEL_PATH_IN_REPO = "ml/crack_detection/models/best.pt"
DEFAULT_FRONTEND_URL = "https://floor-inspection-ai.vercel.app"

# Source files shipped to the Space (everything else is excluded)
INCLUDE_DIRS = ["app"]
INCLUDE_FILES = ["Dockerfile", ".dockerignore", "requirements.txt"]

SPACE_README = """---
title: Floor Inspection API
emoji: 🧱
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
short_description: FastAPI backend for floor crack detection and damage mapping
---

# Floor Inspection AI — Backend API

FastAPI service for frame capture, OpenCV mosaicking, YOLO crack segmentation and crack localization.
Frontend: {frontend_url}

- Health: `/health`
- API docs: `/docs`

Storage on the free tier is ephemeral: captured frames and mosaics are cleared when the Space restarts.
"""


def space_url(space_id: str) -> str:
    owner, name = space_id.split("/", 1)
    return f"https://{owner}-{name}".lower().replace("_", "-").replace(".", "-") + ".hf.space"


def collect_source_operations() -> list[CommitOperationAdd]:
    ops = []
    for rel in INCLUDE_FILES:
        ops.append(CommitOperationAdd(path_in_repo=rel, path_or_fileobj=str(BACKEND_DIR / rel)))
    for rel_dir in INCLUDE_DIRS:
        for path in sorted((BACKEND_DIR / rel_dir).rglob("*")):
            if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc":
                ops.append(CommitOperationAdd(
                    path_in_repo=path.relative_to(BACKEND_DIR).as_posix(),
                    path_or_fileobj=str(path),
                ))
    return ops


def strip_model(src: Path, dst: Path) -> Path:
    from ultralytics.utils.torch_utils import strip_optimizer

    strip_optimizer(str(src), s=str(dst))
    print(f"[model] {src.name}: {src.stat().st_size / 1e6:.1f} MB -> stripped {dst.stat().st_size / 1e6:.1f} MB")
    return dst


def main():
    parser = argparse.ArgumentParser(description="Deploy backend to a Hugging Face Docker Space")
    parser.add_argument("--space", help="Space id owner/name (default: <your-username>/floor-inspection-api)")
    parser.add_argument("--model", default=str(DEFAULT_MODEL), help="YOLO weights to deploy")
    parser.add_argument("--frontend-url", default=DEFAULT_FRONTEND_URL, help="Allowed frontend origin (CORS)")
    parser.add_argument("--private", action="store_true", help="Create the Space as private")
    args = parser.parse_args()

    api = HfApi()
    username = api.whoami()["name"]
    space_id = args.space or f"{username}/floor-inspection-api"
    url = space_url(space_id)

    api.create_repo(space_id, repo_type="space", space_sdk="docker", private=args.private, exist_ok=True)
    print(f"[space] {space_id}")

    for key, value in {
        "FRONTEND_URL": args.frontend_url,
        "CRACK_CONFIDENCE_THRESHOLD": "0.25",
    }.items():
        api.add_space_variable(space_id, key, value)

    with tempfile.TemporaryDirectory() as tmp:
        model = strip_model(Path(args.model), Path(tmp) / "best.pt")
        readme = Path(tmp) / "README.md"
        readme.write_text(SPACE_README.format(frontend_url=args.frontend_url), encoding="utf-8")

        ops = collect_source_operations()
        ops.append(CommitOperationAdd(path_in_repo="README.md", path_or_fileobj=str(readme)))
        ops.append(CommitOperationAdd(path_in_repo=MODEL_PATH_IN_REPO, path_or_fileobj=str(model)))
        api.create_commit(
            space_id,
            repo_type="space",
            operations=ops,
            commit_message="Deploy floor inspection backend",
        )

    print(f"[deploy] Uploaded {len(ops)} files. The Space is now building (first build ~5-10 min).")
    print(f"[deploy] Build logs: https://huggingface.co/spaces/{space_id}")
    print(f"[deploy] API URL:    {url}")
    print(f"[deploy] Set NEXT_PUBLIC_API_URL={url} for the frontend and redeploy it.")


if __name__ == "__main__":
    main()
