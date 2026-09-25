"""
Real-Data Floor Crack Dataset Builder.

1. Downloads the public Ultralytics crack-seg dataset (4,029 real concrete/wall crack photos
   with polygon masks, sourced from Roboflow) into datasets/crack-seg.
2. Builds a floor-domain supplement in datasets/floor_aug:
   - tile_crack:  real crack shading transferred onto procedurally rendered tiled floors
                  (teaches crack vs. grout line in the same image).
   - tile_neg:    tiled floors with grout, stains and veins but no cracks (hard negatives).
   - texture_neg: crack-free crops of the real crack-seg photos (real-texture negatives).

Each split of floor_aug is derived only from the same split of crack-seg, so val/test stay leak-free.
"""

import argparse
import random
import shutil
import urllib.request
import zipfile
from pathlib import Path

import cv2
import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent
DATASETS_DIR = ML_DIR / "datasets"
CRACK_SEG_DIR = DATASETS_DIR / "crack-seg"
FLOOR_AUG_DIR = DATASETS_DIR / "floor_aug"
CRACK_SEG_URL = "https://github.com/ultralytics/assets/releases/download/v0.0.0/crack-seg.zip"

IMG_SIZE = 416
# (tile_crack, tile_neg, texture_neg) images generated per split
COUNTS = {"train": (900, 600, 400), "val": (80, 50, 40), "test": (60, 40, 30)}


def download_crack_seg():
    if (CRACK_SEG_DIR / "images" / "train").exists():
        print(f"[crack-seg] Already present at {CRACK_SEG_DIR}")
        return
    CRACK_SEG_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = DATASETS_DIR / "crack-seg.zip"
    print(f"[crack-seg] Downloading {CRACK_SEG_URL} ...")
    urllib.request.urlretrieve(CRACK_SEG_URL, zip_path)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(CRACK_SEG_DIR)
    zip_path.unlink()
    print(f"[crack-seg] Extracted to {CRACK_SEG_DIR}")


def read_polygons(label_path: Path) -> list[np.ndarray]:
    polys = []
    if not label_path.exists():
        return polys
    for line in label_path.read_text().splitlines():
        vals = line.split()
        if len(vals) >= 7:
            polys.append(np.array(vals[1:], dtype=np.float32).reshape(-1, 2))
    return polys


def polygons_to_mask(polys: list[np.ndarray], w: int, h: int) -> np.ndarray:
    mask = np.zeros((h, w), dtype=np.uint8)
    for p in polys:
        pts = np.round(p * [w, h]).astype(np.int32)
        cv2.fillPoly(mask, [pts], 255)
    return mask


def smooth_noise(h: int, w: int, scale: int) -> np.ndarray:
    """Low-frequency noise in [-1, 1]."""
    small = np.random.randn(max(2, h // scale), max(2, w // scale)).astype(np.float32)
    big = cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)
    return big / (np.abs(big).max() + 1e-6)


def render_tile_floor(size: int = IMG_SIZE) -> np.ndarray:
    """Procedural tiled floor: per-tile colour variation, texture, grout, lighting, stains, perspective."""
    canvas = int(size * 1.4)
    palette = [
        (225, 225, 220), (200, 195, 185), (170, 170, 170), (120, 120, 125), (205, 185, 160),
        (160, 110, 80), (235, 230, 215), (90, 90, 95), (180, 160, 140), (215, 210, 200),
    ]
    # Palette is RGB; OpenCV images are BGR
    base = np.array(random.choice(palette)[::-1], dtype=np.float32) + np.random.uniform(-15, 15, 3)
    img = np.empty((canvas, canvas, 3), dtype=np.float32)
    img[:] = base

    # Fine grain + soft marble-like mottling (kept low-contrast so it is not crack-like)
    img += np.random.normal(0, random.uniform(2, 9), (canvas, canvas, 1))
    img += smooth_noise(canvas, canvas, random.choice([8, 16, 32]))[..., None] * random.uniform(3, 14)

    # Tiles with per-tile brightness offset
    tile_w = random.randint(55, 190)
    tile_h = tile_w if random.random() < 0.7 else random.randint(40, 190)
    grout_w = random.randint(1, 6)
    offset_rows = random.random() < 0.3
    grout_delta = random.uniform(-70, -15) if random.random() < 0.8 else random.uniform(15, 45)
    grout = np.zeros((canvas, canvas), dtype=np.uint8)
    for r, y in enumerate(range(0, canvas, tile_h)):
        shift = (tile_w // 2) if (offset_rows and r % 2) else 0
        for x in range(-shift, canvas, tile_w):
            x0, x1 = max(0, x), min(canvas, x + tile_w)
            img[y:y + tile_h, x0:x1] += random.uniform(-8, 8)
            cv2.rectangle(grout, (x, y), (x + tile_w, y + tile_h), 255, grout_w)
    grout_f = cv2.GaussianBlur(grout, (3, 3), 0).astype(np.float32)[..., None] / 255.0
    img += grout_f * grout_delta

    # Stains, dirt blobs and scuffs (non-crack dark marks)
    for _ in range(random.randint(0, 6)):
        blob = np.zeros((canvas, canvas), dtype=np.uint8)
        cx, cy = random.randint(0, canvas), random.randint(0, canvas)
        axes = (random.randint(5, 60), random.randint(5, 60))
        cv2.ellipse(blob, (cx, cy), axes, random.randint(0, 180), 0, 360, 255, -1)
        blob = cv2.GaussianBlur(blob, (0, 0), random.uniform(3, 15)).astype(np.float32) / 255.0
        img += blob[..., None] * random.uniform(-40, 15)
    for _ in range(random.randint(0, 3)):
        p1 = (random.randint(0, canvas), random.randint(0, canvas))
        p2 = (p1[0] + random.randint(-80, 80), p1[1] + random.randint(-80, 80))
        scuff = np.zeros((canvas, canvas), dtype=np.uint8)
        cv2.line(scuff, p1, p2, 255, random.randint(3, 10))
        scuff = cv2.GaussianBlur(scuff, (0, 0), 4).astype(np.float32)[..., None] / 255.0
        img -= scuff * random.uniform(5, 20)

    # Lighting gradient / vignette
    yy, xx = np.mgrid[0:canvas, 0:canvas].astype(np.float32) / canvas
    gx, gy = random.uniform(-1, 1), random.uniform(-1, 1)
    img *= (1.0 + random.uniform(0, 0.35) * ((xx - 0.5) * gx + (yy - 0.5) * gy))[..., None]

    # Mild perspective warp (camera not perfectly nadir), then centre crop
    d = canvas * random.uniform(0.0, 0.12)
    src = np.float32([[0, 0], [canvas, 0], [canvas, canvas], [0, canvas]])
    dst = src + np.random.uniform(-d, d, (4, 2)).astype(np.float32)
    img = cv2.warpPerspective(np.clip(img, 0, 255), cv2.getPerspectiveTransform(src, dst),
                              (canvas, canvas), borderMode=cv2.BORDER_REFLECT)
    angle = random.choice([0, 0, 90, random.uniform(-10, 10)])
    rot = cv2.getRotationMatrix2D((canvas / 2, canvas / 2), angle, 1.0)
    img = cv2.warpAffine(img, rot, (canvas, canvas), borderMode=cv2.BORDER_REFLECT)
    o = (canvas - size) // 2
    return np.clip(img[o:o + size, o:o + size], 0, 255).astype(np.uint8)


def transfer_crack(tile: np.ndarray, crack_img: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Multiply the crack's relative darkening (crack / local background) into the tile image."""
    gray = cv2.cvtColor(crack_img, cv2.COLOR_BGR2GRAY).astype(np.float32) + 1.0
    background = cv2.medianBlur(gray.astype(np.uint8), 31).astype(np.float32) + 1.0
    ratio = np.clip(gray / background, 0.15, 1.05)
    region = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    region = cv2.GaussianBlur(region, (5, 5), 0).astype(np.float32) / 255.0
    strength = random.uniform(0.7, 1.0)
    shade = 1.0 - region * (1.0 - ratio) * strength
    return np.clip(tile.astype(np.float32) * shade[..., None], 0, 255).astype(np.uint8)


def crack_free_crop(img: np.ndarray, mask: np.ndarray, tries: int = 40):
    h, w = mask.shape
    guard = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
    for _ in range(tries):
        cs = random.randint(int(min(h, w) * 0.3), int(min(h, w) * 0.5))
        x, y = random.randint(0, w - cs), random.randint(0, h - cs)
        if guard[y:y + cs, x:x + cs].max() == 0:
            crop = img[y:y + cs, x:x + cs]
            # Skip rotated-image black padding corners
            if (cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) < 8).mean() > 0.02:
                continue
            return cv2.resize(crop, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_CUBIC)
    return None


def finish(img: np.ndarray) -> np.ndarray:
    """Camera-like degradations: blur, sensor noise."""
    if random.random() < 0.3:
        img = cv2.GaussianBlur(img, (0, 0), random.uniform(0.5, 1.3))
    if random.random() < 0.4:
        noise = np.random.normal(0, random.uniform(1, 5), img.shape)
        img = np.clip(img.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    return img


def save(split: str, name: str, img: np.ndarray, polys: list[np.ndarray]):
    img_dir = FLOOR_AUG_DIR / "images" / split
    lbl_dir = FLOOR_AUG_DIR / "labels" / split
    cv2.imwrite(str(img_dir / f"{name}.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, random.randint(80, 95)])
    lines = ["0 " + " ".join(f"{v:.6f}" for v in p.flatten()) for p in polys]
    (lbl_dir / f"{name}.txt").write_text("\n".join(lines) + ("\n" if lines else ""))


def build_split(split: str, n_tile_crack: int, n_tile_neg: int, n_texture_neg: int):
    for sub in ("images", "labels"):
        d = FLOOR_AUG_DIR / sub / split
        if d.exists():
            shutil.rmtree(d)
        d.mkdir(parents=True)

    sources = []
    for img_p in sorted((CRACK_SEG_DIR / "images" / split).glob("*.jpg")):
        polys = read_polygons(CRACK_SEG_DIR / "labels" / split / f"{img_p.stem}.txt")
        if polys:
            sources.append((img_p, polys))
    random.shuffle(sources)

    for i in range(n_tile_crack):
        img_p, polys = sources[i % len(sources)]
        crack = cv2.resize(cv2.imread(str(img_p)), (IMG_SIZE, IMG_SIZE))
        mask = polygons_to_mask(polys, IMG_SIZE, IMG_SIZE)
        k = random.randint(0, 3)  # random 90-degree rotation of the crack
        if k:
            crack, mask = np.rot90(crack, k).copy(), np.rot90(mask, k).copy()
            polys = [rotate_poly90(p, k) for p in polys]
        save(split, f"tile_crack_{i:05d}", finish(transfer_crack(render_tile_floor(), crack, mask)), polys)

    for i in range(n_tile_neg):
        save(split, f"tile_neg_{i:05d}", finish(render_tile_floor()), [])

    made, idx = 0, 0
    while made < n_texture_neg and idx < len(sources) * 3:
        img_p, polys = sources[idx % len(sources)]
        idx += 1
        img = cv2.imread(str(img_p))
        crop = crack_free_crop(img, polygons_to_mask(polys, img.shape[1], img.shape[0]))
        if crop is not None:
            save(split, f"texture_neg_{made:05d}", finish(crop), [])
            made += 1

    print(f"[floor_aug/{split}] tile_crack={n_tile_crack} tile_neg={n_tile_neg} texture_neg={made}")


def rotate_poly90(p: np.ndarray, k: int) -> np.ndarray:
    """Rotate normalized polygon points to match np.rot90(img, k) (counter-clockwise)."""
    for _ in range(k):
        p = np.stack([p[:, 1], 1.0 - p[:, 0]], axis=1)
    return p


def preview(split: str = "train", n: int = 12):
    out = DATASETS_DIR / "preview"
    out.mkdir(exist_ok=True)
    tiles = []
    for img_p in sorted((FLOOR_AUG_DIR / "images" / split).glob("*.jpg"))[:: max(1, 2000 // n)][:n]:
        img = cv2.imread(str(img_p))
        for p in read_polygons(FLOOR_AUG_DIR / "labels" / split / f"{img_p.stem}.txt"):
            cv2.polylines(img, [np.round(p * IMG_SIZE).astype(np.int32)], True, (0, 0, 255), 1)
        tiles.append(cv2.resize(img, (240, 240)))
    while len(tiles) % 4:
        tiles.append(np.zeros_like(tiles[0]))
    grid = np.vstack([np.hstack(tiles[i:i + 4]) for i in range(0, len(tiles), 4)])
    cv2.imwrite(str(out / "floor_aug_preview.jpg"), grid)
    print(f"[preview] {out / 'floor_aug_preview.jpg'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download real crack data and build floor-domain supplement")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--skip-download", action="store_true")
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)
    if not args.skip_download:
        download_crack_seg()
    for split, counts in COUNTS.items():
        build_split(split, *counts)
    preview()
