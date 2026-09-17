#!/usr/bin/env python3
"""
Manual OpenCV Multi-Image Mosaic Test Script.
Allows testing 2 to 10 image sequential feature detection, matching, RANSAC homography, and stitching directly via CLI.

Usage:
    python backend/tests/manual_test_mosaic.py <img1.jpg> <img2.jpg> <img3.jpg> ...

Output:
    Saves generated mosaic to backend/debug/manual_mosaic.jpg and prints step-by-step telemetry.
"""

import sys
import os
import time
from pathlib import Path

# Add backend directory to sys.path so app imports work
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.utils.image_utils import load_image, save_image
from app.services.mosaic_service import MosaicService
from app.config.settings import settings, BASE_DIR

def main():
    if len(sys.argv) < 3:
        print("Usage: python backend/tests/manual_test_mosaic.py <path_to_img1> <path_to_img2> [path_to_img3 ...]")
        sys.exit(1)

    image_paths = [Path(p) for p in sys.argv[1:]]
    image_ids = [p.name for p in image_paths]

    if len(image_paths) > 10:
        print(f"Error: Maximum 10 images supported. Provided: {len(image_paths)}")
        sys.exit(1)

    print("="*60)
    print(f"FLOOR INSPECTION AI — MANUAL MOSAIC TEST ({len(image_paths)} IMAGES)")
    print("="*60)

    resolved_paths = []
    for p in image_paths:
        if not p.exists():
            print(f"Error: File not found: {p}")
            sys.exit(1)
        resolved_paths.append(p)
        print(f" - Image: {p}")

    print("\nRunning Sequential OpenCV Mosaicking Engine...")
    start_t = time.time()
    try:
        mosaic_res = MosaicService.stitch_sequence(resolved_paths, image_ids)
    except Exception as e:
        print(f"\n[FAILURE] Mosaicking Pipeline Failed: {e}")
        sys.exit(1)

    total_time = round(time.time() - start_t, 3)

    output_path = settings.DEBUG_DIR / "manual_mosaic.jpg"
    
    # Copy generated output to debug/manual_mosaic.jpg
    generated_output = BASE_DIR / mosaic_res.image_url.lstrip("/")
    if generated_output.exists():
        final_img = load_image(generated_output)
        save_image(final_img, output_path)

    stats = mosaic_res.statistics

    print("\n" + "="*60)
    print("SEQUENTIAL MOSAIC STITCHING SUCCESSFUL!")
    print("="*60)
    print(f"Total Images Used       : {stats.total_images}")
    print(f"Successful Stitch Steps : {stats.successful_pairs}")
    print(f"Failed Stitch Steps     : {stats.failed_pairs}")
    print(f"Average Inlier Ratio    : {stats.average_inlier_ratio:.2%}")
    print(f"Total Good Matches      : {stats.total_good_matches}")
    print(f"Total Inliers           : {stats.total_inliers}")
    print(f"Total Processing Time   : {total_time} seconds")
    print(f"Saved Output Image To   : {output_path}")
    print("="*60)

    print("\nPER-STEP TELEMETRY BREAKDOWN:")
    print("-" * 75)
    print(f"{'Step':<6}{'Base Image':<20}{'New Image':<20}{'Matches':<10}{'Inliers':<10}{'Ratio':<8}{'Time':<8}")
    print("-" * 75)
    for step in stats.steps:
        ratio_str = f"{step.inlier_ratio * 100:.1f}%"
        time_str = f"{step.processing_time_seconds:.2f}s"
        print(f"{step.step:<6}{step.base_image:<20}{step.new_image:<20}{step.good_matches:<10}{step.inliers:<10}{ratio_str:<8}{time_str:<8}")
    print("-" * 75)

if __name__ == "__main__":
    main()
