"""
YOLO Model Evaluation Utility for Crack Detection / Segmentation.
Evaluates trained weights on the test split and reports box (and mask, for -seg models) Precision,
Recall, mAP@50, mAP@50-95, inference latency, and the false-positive image rate on crack-free floor
hard negatives (tile grout, stains, bare textures).
"""

import argparse
import tempfile
from pathlib import Path
from ultralytics import YOLO

SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent
DEFAULT_MODEL = ML_DIR / "models" / "best.pt"
DEFAULT_DATA = ML_DIR / "data_floor_seg.yaml"
DATASETS_DIR = ML_DIR / "datasets"

# Test subsets reported separately so floor-domain performance is visible on its own
SUBSETS = {
    "real_cracks": DATASETS_DIR / "crack-seg" / "images" / "test",
    "floor_aug": DATASETS_DIR / "floor_aug" / "images" / "test",
}


def _subset_yaml(images_dir: Path, tmp_dir: Path) -> str:
    yaml_path = tmp_dir / f"{images_dir.parent.parent.name}_test.yaml"
    yaml_path.write_text(
        f"path: {images_dir.parent.parent.as_posix()}\n"
        f"train: images/{images_dir.name}\n"
        f"val: images/{images_dir.name}\n"
        "names:\n  0: crack\n"
    )
    return str(yaml_path)


def _summarize(results) -> dict:
    out = {
        "box_precision": results.box.mp,
        "box_recall": results.box.mr,
        "box_map50": results.box.map50,
        "box_map50_95": results.box.map,
        "inference_speed_ms": getattr(results, "speed", {}).get("inference", 0.0),
    }
    seg = getattr(results, "seg", None)
    if seg is not None:
        out.update({
            "mask_precision": seg.mp,
            "mask_recall": seg.mr,
            "mask_map50": seg.map50,
            "mask_map50_95": seg.map,
        })
    return out


def negative_false_positive_rate(model: YOLO, conf: float) -> float | None:
    """Fraction of crack-free floor test images on which the model reports any crack."""
    neg_images = sorted((SUBSETS["floor_aug"]).glob("*_neg_*.jpg"))
    if not neg_images:
        return None
    flagged = 0
    for img in neg_images:
        r = model.predict(source=str(img), conf=conf, verbose=False)[0]
        flagged += int(r.boxes is not None and len(r.boxes) > 0)
    return flagged / len(neg_images)


def evaluate_model(model_path: str = str(DEFAULT_MODEL), data_path: str = str(DEFAULT_DATA), conf: float = 0.25):
    model_file = Path(model_path)
    if not model_file.exists():
        print(f"Error: Model file not found at {model_path}. Train the model first or provide valid weights.")
        return None

    print("=" * 60)
    print("YOLO CRACK MODEL TEST EVALUATION")
    print(f" Model Weights: {model_path}")
    print(f" Data Config:   {data_path}")
    print("=" * 60)

    yolo_model = YOLO(str(model_file))
    report = {"overall": _summarize(yolo_model.val(data=data_path, split="test", plots=False, verbose=False))}

    with tempfile.TemporaryDirectory() as tmp:
        for name, images_dir in SUBSETS.items():
            if images_dir.exists():
                res = yolo_model.val(data=_subset_yaml(images_dir, Path(tmp)), split="val", plots=False, verbose=False)
                report[name] = _summarize(res)

    fp_rate = negative_false_positive_rate(yolo_model, conf)

    print("\n" + "=" * 60)
    print("TEST EVALUATION RESULTS SUMMARY")
    print("=" * 60)
    for name, m in report.items():
        print(f" [{name}]")
        print(f"   Box   P={m['box_precision']:.3f} R={m['box_recall']:.3f} "
              f"mAP50={m['box_map50']:.3f} mAP50-95={m['box_map50_95']:.3f}")
        if "mask_map50" in m:
            print(f"   Mask  P={m['mask_precision']:.3f} R={m['mask_recall']:.3f} "
                  f"mAP50={m['mask_map50']:.3f} mAP50-95={m['mask_map50_95']:.3f}")
        print(f"   Inference: {m['inference_speed_ms']:.2f} ms / frame")
    if fp_rate is not None:
        print(f" Hard-negative false-positive image rate @conf={conf}: {fp_rate:.1%}")
    print("=" * 60)

    report["negative_fp_rate"] = fp_rate
    return report

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate YOLO Crack Model")
    parser.add_argument("--model", type=str, default=str(DEFAULT_MODEL), help="Path to best.pt weights")
    parser.add_argument("--data", type=str, default=str(DEFAULT_DATA), help="Path to data yaml")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence for hard-negative FP check")

    args = parser.parse_args()
    evaluate_model(model_path=args.model, data_path=args.data, conf=args.conf)
