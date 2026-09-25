# Dockerfile for Floor Inspection AI FastAPI Backend
# Runs on CPU-only hosts (Hugging Face Spaces, VPS, docker-compose). Listens on $PORT (default 7860).
FROM python:3.11-slim

# Install system dependencies required for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces run containers as UID 1000; use the same user everywhere
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    YOLO_CONFIG_DIR=/home/user/.config/Ultralytics \
    PORT=7860

WORKDIR /app

# CPU-only PyTorch first (the default Linux wheel bundles ~3 GB of CUDA libraries)
COPY requirements.txt .
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# Copy backend codebase (see .dockerignore) including ml/crack_detection/models/best.pt
COPY --chown=user . .

# Writable storage directories
RUN mkdir -p outputs captures debug ml/crack_detection/models && chown -R user:user /app

USER user

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s CMD curl -fsS http://localhost:${PORT}/health || exit 1

# Start Uvicorn server
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
