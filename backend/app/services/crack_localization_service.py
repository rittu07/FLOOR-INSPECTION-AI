import logging
import math
import numpy as np
import cv2
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from fastapi import HTTPException, status

from app.config.settings import settings
from app.services.mosaic_service import MosaicService
from app.services.crack_service import CrackService
from app.models.schemas import (
    Point2DSchema,
    BoundingBoxSchema,
    LocalizedCrackItemSchema,
    LocalizationMapRequestItem,
    LocalizationResponse,
    MosaicMetadataResponse,
    FrameTransformSchema,
)

logger = logging.getLogger("floor_inspection.localization")
DUPLICATE_DISTANCE_PX = 30.0  # Threshold in pixels to flag duplicate detections across overlapping frames

class CrackLocalizationService:
    @staticmethod
    def transform_points(points: List[Tuple[float, float]], H: np.ndarray) -> List[Point2DSchema]:
        """
        Transforms a list of 2D points (x, y) using 3x3 Homography matrix H via OpenCV perspectiveTransform.
        """
        if not points or H is None:
            return []
        
        pts_np = np.float32(points).reshape(-1, 1, 2)
        transformed_pts = cv2.perspectiveTransform(pts_np, H)
        
        result: List[Point2DSchema] = []
        for pt in transformed_pts:
            x_m, y_m = pt[0]
            result.append(Point2DSchema(x=round(float(x_m), 2), y=round(float(y_m), 2)))
        return result

    @classmethod
    def transform_bbox(
        cls, bbox: BoundingBoxSchema, H: np.ndarray
    ) -> Tuple[Point2DSchema, List[Point2DSchema]]:
        """
        Calculates bounding box center point and 4 corners, transforms them using Homography H.
        Returns (center_point, 4_corner_polygon).
        """
        cx = bbox.x + (bbox.width / 2.0)
        cy = bbox.y + (bbox.height / 2.0)
        
        corners = [
            (bbox.x, bbox.y),                           # Top-Left
            (bbox.x + bbox.width, bbox.y),               # Top-Right
            (bbox.x + bbox.width, bbox.y + bbox.height), # Bottom-Right
            (bbox.x, bbox.y + bbox.height),              # Bottom-Left
        ]
        
        center_transformed = cls.transform_points([(cx, cy)], H)[0]
        polygon_transformed = cls.transform_points(corners, H)
        
        return center_transformed, polygon_transformed

    @staticmethod
    def check_out_of_bounds(point: Point2DSchema, mosaic_w: int, mosaic_h: int) -> bool:
        """
        Returns True if transformed mosaic coordinate falls outside valid mosaic bounds [0, W] x [0, H].
        """
        return point.x < 0 or point.x > mosaic_w or point.y < 0 or point.y > mosaic_h

    @classmethod
    def localize_detections(
        cls, mosaic_id: str, detections: List[LocalizationMapRequestItem]
    ) -> LocalizationResponse:
        """
        Maps a list of frame-level YOLO crack detections to global mosaic coordinates using composed homographies.
        Applies duplicate detection flagging based on spatial proximity.
        """
        metadata: MosaicMetadataResponse = MosaicService.get_mosaic_metadata(mosaic_id)
        
        if not metadata.transforms:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "code": "TRANSFORM_NOT_FOUND",
                    "message": f"Mosaic '{mosaic_id}' does not contain valid frame transformation matrices."
                }
            )

        # Build transform lookup map by frame ID and filename
        transforms_map: Dict[str, FrameTransformSchema] = {}
        for t in metadata.transforms:
            transforms_map[t.frame_id] = t
            transforms_map[t.filename] = t
            transforms_map[Path(t.frame_id).name] = t
            transforms_map[Path(t.filename).name] = t

        localized_items: List[LocalizedCrackItemSchema] = []

        for idx, det in enumerate(detections):
            clean_frame_key = Path(det.frame_id).name
            transform = transforms_map.get(det.frame_id) or transforms_map.get(clean_frame_key)

            if not transform:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "status": "error",
                        "code": "FRAME_NOT_FOUND",
                        "message": f"Frame '{det.frame_id}' not found in metadata for mosaic '{mosaic_id}'."
                    }
                )

            try:
                H_mat = np.array(transform.homography, dtype=np.float32)
                if H_mat.shape != (3, 3):
                    raise ValueError("Homography matrix is not 3x3")
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "status": "error",
                        "code": "INVALID_COORDINATES",
                        "message": f"Invalid homography matrix for frame '{det.frame_id}': {str(e)}"
                    }
                )

            center_m, polygon_m = cls.transform_bbox(det.bbox, H_mat)
            out_of_bounds = cls.check_out_of_bounds(center_m, metadata.width, metadata.height)

            # Spatial proximity duplicate detection
            duplicate_id: Optional[str] = None
            for prev in localized_items:
                dist = math.sqrt((center_m.x - prev.mosaic_position.x)**2 + (center_m.y - prev.mosaic_position.y)**2)
                if dist < DUPLICATE_DISTANCE_PX:
                    duplicate_id = prev.id
                    break

            crack_id = f"crack_{mosaic_id[:12]}_{idx+1:03d}"

            item = LocalizedCrackItemSchema(
                id=crack_id,
                frame_id=det.frame_id,
                confidence=round(det.confidence, 4),
                bbox=det.bbox,
                mosaic_position=center_m,
                mosaic_polygon=polygon_m,
                is_out_of_bounds=out_of_bounds,
                possible_duplicate_of=duplicate_id,
            )
            localized_items.append(item)

        frames_with_cracks_set = set(item.frame_id for item in localized_items)
        avg_conf = (
            round(sum(item.confidence for item in localized_items) / len(localized_items), 4)
            if localized_items else 0.0
        )

        return LocalizationResponse(
            status="completed",
            mosaic_id=mosaic_id,
            mosaic_image_url=metadata.image_url,
            total_frames=len(metadata.frames),
            frames_with_cracks=len(frames_with_cracks_set),
            total_cracks=len(detections),
            localized_cracks=len(localized_items),
            average_confidence=avg_conf,
            cracks=localized_items,
        )

    @classmethod
    def process_mosaic_localization(
        cls, mosaic_id: str, confidence_threshold: float = 0.25
    ) -> LocalizationResponse:
        """
        Executes complete multi-frame localization pipeline:
        1. Retrieves mosaic metadata and source frames.
        2. Runs YOLO crack detection across all source frames.
        3. Aggregates detections and transforms them into global mosaic space.
        """
        metadata: MosaicMetadataResponse = MosaicService.get_mosaic_metadata(mosaic_id)

        all_detections: List[LocalizationMapRequestItem] = []

        for frame_id in metadata.frames:
            clean_name = Path(frame_id).name
            file_path = settings.CAPTURES_DIR / clean_name
            if not file_path.exists() and not clean_name.endswith(".jpg"):
                file_path = settings.CAPTURES_DIR / f"{clean_name}.jpg"

            if not file_path.exists():
                logger.warning(f"Frame image file '{frame_id}' not found on disk during localization processing.")
                continue

            try:
                # Run YOLO crack detection on source frame
                crack_res = CrackService.detect_cracks(file_path, conf_threshold=confidence_threshold)
                for det in crack_res.detections:
                    req_item = LocalizationMapRequestItem(
                        frame_id=frame_id,
                        confidence=det.confidence,
                        bbox=det.box,
                    )
                    all_detections.append(req_item)
            except Exception as e:
                logger.error(f"Error running crack detection on frame '{frame_id}': {e}")

        return cls.localize_detections(mosaic_id, all_detections)
