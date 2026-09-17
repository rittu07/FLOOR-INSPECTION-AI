import time
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional

import cv2
import numpy as np
from fastapi import HTTPException, status

from app.config.settings import settings
from app.utils.image_utils import (
    load_image,
    save_image,
    resize_image,
    convert_to_grayscale,
    crop_black_borders,
    crop_black_borders_with_offset,
)
from app.models.schemas import (
    MosaicResponse,
    MosaicMetadataResponse,
    MosaicStatsSchema,
    MosaicStepStats,
    FrameTransformSchema,
)

logger = logging.getLogger("floor_inspection.mosaic")
logging.basicConfig(level=logging.INFO)

class MosaicService:
    @staticmethod
    def preprocess_image(img: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Validates, resizes image if width exceeds MAX_IMAGE_WIDTH,
        and returns both resized color image and grayscale version for feature extraction.
        """
        resized_color = resize_image(img, settings.MAX_IMAGE_WIDTH)
        gray = convert_to_grayscale(resized_color)
        return resized_color, gray

    @staticmethod
    def detect_features(gray_img: np.ndarray) -> Tuple[List[cv2.KeyPoint], np.ndarray]:
        """
        Extracts ORB keypoints and descriptors.
        Raises ValueError if feature extraction yields insufficient keypoints.
        """
        orb = cv2.ORB_create(nfeatures=settings.ORB_NFEATURES)
        keypoints, descriptors = orb.detectAndCompute(gray_img, None)
        
        if keypoints is None or len(keypoints) < 4 or descriptors is None:
            raise ValueError("Insufficient ORB keypoints detected in image.")
            
        return list(keypoints), descriptors

    @staticmethod
    def match_features(descriptors1: np.ndarray, descriptors2: np.ndarray) -> Tuple[List[cv2.DMatch], int]:
        """
        Matches descriptors using BFMatcher with KNN (k=2) and applies Lowe's ratio test.
        Returns good matches and raw match count.
        """
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
        raw_matches = bf.knnMatch(descriptors1, descriptors2, k=2)
        
        good_matches: List[cv2.DMatch] = []
        for m_n in raw_matches:
            if len(m_n) == 2:
                m, n = m_n
                if m.distance < settings.LOWE_RATIO * n.distance:
                    good_matches.append(m)
                    
        return good_matches, len(raw_matches)

    @staticmethod
    def draw_matches_debug(
        img1: np.ndarray,
        kp1: List[cv2.KeyPoint],
        img2: np.ndarray,
        kp2: List[cv2.KeyPoint],
        matches: List[cv2.DMatch],
        out_filename: str = "debug_matches.jpg"
    ) -> None:
        """
        Draws matching points between two images for visual debugging.
        """
        try:
            debug_img = cv2.drawMatches(
                img1, kp1, img2, kp2, matches, None,
                flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS
            )
            debug_path = settings.DEBUG_DIR / out_filename
            save_image(debug_img, debug_path)
            logger.info(f"Saved debug matches visualization to {debug_path}")
        except Exception as e:
            logger.warning(f"Failed to generate debug matches image: {e}")

    @staticmethod
    def estimate_homography(
        kp1: List[cv2.KeyPoint],
        kp2: List[cv2.KeyPoint],
        matches: List[cv2.DMatch]
    ) -> Tuple[np.ndarray, int, float]:
        """
        Estimates homography matrix mapping image2 keypoints into image1 perspective using RANSAC.
        Returns Homography matrix, inlier count, and inlier ratio.
        """
        if len(matches) < 4:
            raise ValueError(f"Need at least 4 point matches to estimate homography, found {len(matches)}.")
            
        src_pts = np.float32([kp2[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp1[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
        
        H, mask = cv2.findHomography(
            src_pts, dst_pts, cv2.RANSAC, settings.RANSAC_REPROJECTION_THRESHOLD
        )
        
        if H is None or mask is None:
            raise ValueError("Homography estimation failed (RANSAC matrix returned None).")
            
        inliers = int(np.sum(mask))
        inlier_ratio = float(inliers / len(matches)) if len(matches) > 0 else 0.0
        
        if inliers < 4:
            raise ValueError(f"Homography has insufficient RANSAC inliers ({inliers} inliers found).")
            
        return H, inliers, inlier_ratio

    MOSAIC_STORE: Dict[str, Dict[str, Any]] = {}

    @staticmethod
    def warp_and_stitch_with_transforms(
        img1: np.ndarray, img2: np.ndarray, H: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Warps img2 onto img1 coordinate system using Homography H.
        Calculates expanding canvas, applies translation to prevent floor clipping,
        blends overlapping region, crops black margins, and returns:
        (cropped_mosaic, M_step, H_img2_final)
        where:
          - M_step: transformation matrix mapping img1 (previous cumulative canvas) to cropped canvas
          - H_img2_final: homography matrix mapping img2 (new frame) to cropped canvas
        """
        h1, w1 = img1.shape[:2]
        h2, w2 = img2.shape[:2]

        corners_img2 = np.float32([[0, 0], [0, h2], [w2, h2], [w2, 0]]).reshape(-1, 1, 2)
        warped_corners = cv2.perspectiveTransform(corners_img2, H)

        corners_img1 = np.float32([[0, 0], [0, h1], [w1, h1], [w1, 0]]).reshape(-1, 1, 2)
        all_corners = np.vstack((corners_img1, warped_corners))

        [x_min, y_min] = np.int32(all_corners.min(axis=0).ravel() - 0.5)
        [x_max, y_max] = np.int32(all_corners.max(axis=0).ravel() + 0.5)

        shift_x = -x_min if x_min < 0 else 0
        shift_y = -y_min if y_min < 0 else 0

        translation_matrix = np.array([
            [1, 0, shift_x],
            [0, 1, shift_y],
            [0, 0, 1]
        ], dtype=np.float32)

        H_final_step = translation_matrix @ H

        canvas_w = x_max - x_min
        canvas_h = y_max - y_min

        warped_img2 = cv2.warpPerspective(img2, H_final_step, (canvas_w, canvas_h))
        canvas = warped_img2.copy()

        img1_x = shift_x
        img1_y = shift_y
        roi = canvas[img1_y:img1_y + h1, img1_x:img1_x + w1]

        img1_mask = (img1 > 0).astype(np.uint8)
        warped_roi_mask = (roi > 0).astype(np.uint8)
        overlap_mask = cv2.bitwise_and(img1_mask, warped_roi_mask)

        non_overlap = cv2.bitwise_and(img1, cv2.bitwise_not(overlap_mask) * 255)
        overlap_blend = cv2.addWeighted(img1, 0.5, roi, 0.5, 0)
        overlap_blend = cv2.bitwise_and(overlap_blend, overlap_mask * 255)

        canvas_bg_non_overlap = cv2.bitwise_and(roi, cv2.bitwise_not(img1_mask) * 255)
        blended_roi = cv2.add(cv2.add(non_overlap, overlap_blend), canvas_bg_non_overlap)
        canvas[img1_y:img1_y + h1, img1_x:img1_x + w1] = blended_roi

        cropped, crop_x, crop_y = crop_black_borders_with_offset(canvas)

        crop_matrix = np.array([
            [1, 0, -crop_x],
            [0, 1, -crop_y],
            [0, 0, 1]
        ], dtype=np.float32)

        M_step = crop_matrix @ translation_matrix
        H_img2_final = crop_matrix @ H_final_step

        return cropped, M_step, H_img2_final

    @staticmethod
    def warp_and_stitch(img1: np.ndarray, img2: np.ndarray, H: np.ndarray) -> np.ndarray:
        """
        Warps img2 onto img1 coordinate system using Homography H.
        Backward-compatible helper returning cropped mosaic array.
        """
        cropped, _, _ = MosaicService.warp_and_stitch_with_transforms(img1, img2, H)
        return cropped

    @classmethod
    def stitch_pair(cls, img1: np.ndarray, img2: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any], np.ndarray, np.ndarray]:
        """
        Executes complete 2-image OpenCV stitching pipeline.
        Returns (mosaic_img, stats, M_step, H_img2_final).
        """
        start_time = time.time()

        # Step 1: Preprocess images
        img1_color, gray1 = cls.preprocess_image(img1)
        img2_color, gray2 = cls.preprocess_image(img2)

        # Step 2: ORB Feature Detection
        try:
            kp1, des1 = cls.detect_features(gray1)
            kp2, des2 = cls.detect_features(gray2)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "code": "INSUFFICIENT_FEATURES",
                    "message": str(e)
                }
            )

        # Step 3: Feature Matching & Lowe Ratio Test
        good_matches, raw_match_count = cls.match_features(des1, des2)

        if settings.SAVE_DEBUG_IMAGES:
            cls.draw_matches_debug(img1_color, kp1, img2_color, kp2, good_matches)

        if len(good_matches) < settings.MIN_GOOD_MATCHES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "code": "INSUFFICIENT_MATCHES",
                    "message": f"Only {len(good_matches)} reliable feature matches found. Minimum required: {settings.MIN_GOOD_MATCHES}.",
                    "diagnostics": {
                        "keypoints_image1": len(kp1),
                        "keypoints_image2": len(kp2),
                        "raw_matches": raw_match_count,
                        "good_matches": len(good_matches)
                    }
                }
            )

        # Step 4: Homography Estimation
        try:
            H, inliers, inlier_ratio = cls.estimate_homography(kp1, kp2, good_matches)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "code": "HOMOGRAPHY_FAILED",
                    "message": f"Homography estimation failed: {str(e)}",
                    "diagnostics": {
                        "keypoints_image1": len(kp1),
                        "keypoints_image2": len(kp2),
                        "good_matches": len(good_matches)
                    }
                }
            )

        # Step 5: Perspective Warping, Canvas Translation, Blending & Cropping
        try:
            mosaic_img, M_step, H_img2_final = cls.warp_and_stitch_with_transforms(img1_color, img2_color, H)
        except Exception as e:
            logger.error(f"Stitching/Warping error: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "status": "error",
                    "code": "STITCHING_FAILED",
                    "message": f"Image perspective warping failed: {str(e)}"
                }
            )

        elapsed = round(time.time() - start_time, 3)

        stats = {
            "keypoints_image1": len(kp1),
            "keypoints_image2": len(kp2),
            "raw_matches": raw_match_count,
            "good_matches": len(good_matches),
            "inliers": inliers,
            "inlier_ratio": round(inlier_ratio, 4),
            "processing_time_seconds": elapsed,
        }

        return mosaic_img, stats, M_step, H_img2_final

    @classmethod
    def stitch_sequence(cls, resolved_paths: List[Path], image_ids: List[str]) -> MosaicMetadataResponse:
        """
        Sequentially stitches 2 to 10 floor images in specified capture order.
        Accurately tracks and composes step homographies into global frame-to-mosaic transforms.
        Persists metadata JSON to outputs/{mosaic_id}.json and memory cache.
        """
        import json
        from app.models.schemas import FrameTransformSchema, MosaicMetadataResponse

        overall_start_time = time.time()
        num_images = len(resolved_paths)

        logger.info(f"Starting sequential floor mosaicking for {num_images} images...")

        # Load first image as initial cumulative mosaic
        try:
            first_raw_img = load_image(resolved_paths[0])
            cumulative_mosaic = first_raw_img
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "code": "INVALID_IMAGE",
                    "message": f"Failed to load initial image '{image_ids[0]}': {str(e)}"
                }
            )

        # Homography matrices mapping processed frame coordinates to current cumulative canvas space
        cum_homographies: List[np.ndarray] = [np.eye(3, dtype=np.float32)]
        steps_telemetry: List[MosaicStepStats] = []

        for idx in range(1, num_images):
            step_num = idx
            base_label = image_ids[0] if idx == 1 else f"mosaic_step_{idx-1}"
            next_img_id = image_ids[idx]

            logger.info(f"--- Mosaicking Step {step_num}/{num_images - 1}: Stitching '{next_img_id}' onto '{base_label}' ---")

            try:
                next_img = load_image(resolved_paths[idx])
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "status": "error",
                        "code": "INVALID_IMAGE",
                        "message": f"Failed to load image '{next_img_id}' at step {step_num}: {str(e)}"
                    }
                )

            step_start = time.time()
            try:
                step_mosaic, pair_stats, M_step, H_img2_final = cls.stitch_pair(cumulative_mosaic, next_img)
            except HTTPException as exc:
                logger.error(f"Sequential stitching failed at step {step_num} ({base_label} + {next_img_id}): {exc.detail}")
                if settings.SAVE_DEBUG_IMAGES:
                    debug_fail_path = settings.DEBUG_DIR / f"failed_step_{step_num:02d}_{next_img_id}.jpg"
                    save_image(cumulative_mosaic, debug_fail_path)

                detail_dict = exc.detail if isinstance(exc.detail, dict) else {"message": str(exc.detail)}
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "status": "error",
                        "code": "STITCHING_FAILED",
                        "message": f"Failed while stitching frame '{next_img_id}' at step {step_num}: {detail_dict.get('message', 'Insufficient matches or homography failure')}.",
                        "failed_step": step_num,
                        "successful_images": len(steps_telemetry) + 1,
                        "diagnostics": detail_dict.get("diagnostics", {})
                    }
                )

            step_time = round(time.time() - step_start, 3)

            step_stat = MosaicStepStats(
                step=step_num,
                base_image=base_label,
                new_image=next_img_id,
                good_matches=pair_stats["good_matches"],
                inliers=pair_stats["inliers"],
                inlier_ratio=pair_stats["inlier_ratio"],
                processing_time_seconds=step_time,
                status="completed"
            )
            steps_telemetry.append(step_stat)

            # Update all existing cumulative homographies by pre-multiplying M_step
            for k in range(len(cum_homographies)):
                cum_homographies[k] = M_step @ cum_homographies[k]

            # Append current step's frame homography
            cum_homographies.append(H_img2_final)

            # Update cumulative mosaic array
            cumulative_mosaic = step_mosaic

            if settings.SAVE_DEBUG_IMAGES:
                debug_step_path = settings.DEBUG_DIR / f"mosaic_step_{step_num:02d}.jpg"
                save_image(cumulative_mosaic, debug_step_path)
                logger.info(f"Saved intermediate debug mosaic to {debug_step_path}")

        total_elapsed = round(time.time() - overall_start_time, 3)
        mosaic_h, mosaic_w = cumulative_mosaic.shape[:2]

        # Compute composed H_frame_to_final_mosaic for each input frame incorporating resize scaling
        transforms: List[FrameTransformSchema] = []

        for i in range(num_images):
            img_path = resolved_paths[i]
            frame_id = image_ids[i]
            raw_img = load_image(img_path)
            orig_h, orig_w = raw_img.shape[:2]
            proc_img, _ = cls.preprocess_image(raw_img)
            proc_h, proc_w = proc_img.shape[:2]

            # Scale matrix mapping original frame coordinates to processing resolution
            scale_x = float(proc_w) / float(orig_w) if orig_w > 0 else 1.0
            scale_y = float(proc_h) / float(orig_h) if orig_h > 0 else 1.0

            S_frame = np.array([
                [scale_x, 0.0, 0.0],
                [0.0, scale_y, 0.0],
                [0.0, 0.0, 1.0]
            ], dtype=np.float32)

            H_proc_to_mosaic = cum_homographies[i]
            H_orig_to_mosaic = H_proc_to_mosaic @ S_frame

            transform_schema = FrameTransformSchema(
                frame_id=frame_id,
                filename=img_path.name,
                homography=H_orig_to_mosaic.tolist(),
                source_width=orig_w,
                source_height=orig_h,
                mosaic_width=mosaic_w,
                mosaic_height=mosaic_h,
            )
            transforms.append(transform_schema)

        total_good_matches = sum(s.good_matches for s in steps_telemetry)
        total_inliers = sum(s.inliers for s in steps_telemetry)
        avg_inlier_ratio = round(sum(s.inlier_ratio for s in steps_telemetry) / len(steps_telemetry), 4) if steps_telemetry else 0.0

        summary_stats = MosaicStatsSchema(
            total_images=num_images,
            successful_pairs=len(steps_telemetry),
            failed_pairs=0,
            total_good_matches=total_good_matches,
            total_inliers=total_inliers,
            average_inlier_ratio=avg_inlier_ratio,
            steps=steps_telemetry
        )

        now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_suffix = uuid.uuid4().hex[:6]
        mosaic_id = f"mosaic_{now_str}_{unique_suffix}"
        filename = f"{mosaic_id}.jpg"

        output_path = settings.OUTPUTS_DIR / filename
        save_image(cumulative_mosaic, output_path)

        metadata_response = MosaicMetadataResponse(
            id=mosaic_id,
            status="completed",
            image_url=f"/outputs/{filename}",
            images_used=num_images,
            width=mosaic_w,
            height=mosaic_h,
            frames=image_ids,
            transforms=transforms,
            statistics=summary_stats,
            processing_time_seconds=total_elapsed,
        )

        # Persist metadata JSON sidecar file to disk
        json_path = settings.OUTPUTS_DIR / f"{mosaic_id}.json"
        try:
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(metadata_response.model_dump(), f, indent=2)
        except Exception as err:
            logger.warning(f"Failed to save mosaic metadata JSON sidecar: {err}")

        # Cache in memory
        cls.MOSAIC_STORE[mosaic_id] = metadata_response.model_dump()

        logger.info(f"Sequential Mosaicking COMPLETE! Output saved to {output_path} with {len(transforms)} frame transforms.")
        return metadata_response

    @classmethod
    def get_mosaic_metadata(cls, mosaic_id: str) -> MosaicMetadataResponse:
        """
        Retrieves mosaic metadata and frame transformation matrices by ID.
        Checks memory store first, then disk storage outputs/{mosaic_id}.json.
        """
        import json
        from app.models.schemas import MosaicMetadataResponse

        clean_id = Path(mosaic_id).stem
        if clean_id in cls.MOSAIC_STORE:
            return MosaicMetadataResponse(**cls.MOSAIC_STORE[clean_id])

        json_path = settings.OUTPUTS_DIR / f"{clean_id}.json"
        if json_path.exists():
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                cls.MOSAIC_STORE[clean_id] = data
                return MosaicMetadataResponse(**data)
            except Exception as e:
                logger.error(f"Error reading metadata JSON for {clean_id}: {e}")

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "code": "MOSAIC_NOT_FOUND",
                "message": f"Mosaic metadata for '{mosaic_id}' was not found in storage."
            }
        )

    @classmethod
    def create_mosaic(cls, image_ids: List[str]) -> MosaicMetadataResponse:
        """
        Validates 2 to 10 image IDs, resolves file paths, and executes sequential mosaicking.
        """
        if not image_ids or len(image_ids) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "code": "INVALID_REQUEST",
                    "message": "At least 2 images are required to generate a floor mosaic."
                }
            )

        if len(image_ids) > settings.MAX_MOSAIC_IMAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "code": "TOO_MANY_IMAGES",
                    "message": f"A maximum of {settings.MAX_MOSAIC_IMAGES} images can be processed in one mosaic. Provided: {len(image_ids)}."
                }
            )

        resolved_paths: List[Path] = []
        for img_id in image_ids:
            clean_id = Path(img_id).name
            file_path = settings.CAPTURES_DIR / clean_id
            if not file_path.exists() and not clean_id.endswith(".jpg"):
                file_path = settings.CAPTURES_DIR / f"{clean_id}.jpg"
                
            if not file_path.exists():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "status": "error",
                        "code": "IMAGE_NOT_FOUND",
                        "message": f"Captured frame file '{img_id}' not found in storage."
                    }
                )
            resolved_paths.append(file_path)

        return cls.stitch_sequence(resolved_paths, image_ids)

