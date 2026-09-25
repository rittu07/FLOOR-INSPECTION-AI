from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "floor-inspection-backend"

class FrameUploadResponse(BaseModel):
    id: str
    filename: str
    status: str = "captured"
    url: str

class MosaicCreateRequest(BaseModel):
    image_ids: List[str] = Field(..., description="List of frame IDs or filenames to stitch in capture sequence order")

class MosaicStepStats(BaseModel):
    step: int
    base_image: str
    new_image: str
    good_matches: int
    inliers: int
    inlier_ratio: float
    processing_time_seconds: float
    status: str = "completed"

class MosaicStatsSchema(BaseModel):
    total_images: int
    successful_pairs: int
    failed_pairs: int
    total_good_matches: int
    total_inliers: int
    average_inlier_ratio: float
    steps: List[MosaicStepStats]

class FrameTransformSchema(BaseModel):
    frame_id: str
    filename: str
    homography: List[List[float]] = Field(..., description="3x3 Homography matrix mapping source frame to final mosaic")
    source_width: int
    source_height: int
    mosaic_width: int
    mosaic_height: int

class MosaicResponse(BaseModel):
    id: str
    status: str = "completed"
    image_url: str
    images_used: int
    statistics: MosaicStatsSchema
    processing_time_seconds: float
    width: Optional[int] = None
    height: Optional[int] = None
    frames: Optional[List[str]] = None
    transforms: Optional[List[FrameTransformSchema]] = None

class MosaicMetadataResponse(MosaicResponse):
    width: int
    height: int
    frames: List[str]
    transforms: List[FrameTransformSchema]

class ErrorResponse(BaseModel):
    status: str = "error"
    code: str
    message: str
    diagnostics: Optional[Dict[str, Any]] = None
    failed_step: Optional[int] = None
    successful_images: Optional[int] = None

class Point2DSchema(BaseModel):
    x: float
    y: float

class BoundingBoxSchema(BaseModel):
    x: float = Field(..., description="Top-left X coordinate in pixels")
    y: float = Field(..., description="Top-left Y coordinate in pixels")
    width: float = Field(..., description="Bounding box width in pixels")
    height: float = Field(..., description="Bounding box height in pixels")

class CrackDetectionItemSchema(BaseModel):
    id: str
    class_id: int = 0
    label: str = "Crack"
    confidence: float
    box: BoundingBoxSchema
    outline: List[Point2DSchema] = Field(default_factory=list, description="Crack mask outline in image pixels (segmentation models)")
    length_px: Optional[float] = Field(None, description="Crack centerline length in image pixels")
    max_width_px: Optional[float] = Field(None, description="Maximum crack width in image pixels")

class CrackSummarySchema(BaseModel):
    cracks_detected: int
    average_confidence: float

class CrackDetectionResponse(BaseModel):
    id: str
    status: str = "completed"
    image_url: str
    source_image_url: Optional[str] = None
    annotated_image_url: str
    detections: List[CrackDetectionItemSchema]
    summary: CrackSummarySchema
    crack_count: int
    avg_confidence: float
    highest_confidence: float
    processing_time_seconds: float

class LocalizedCrackItemSchema(BaseModel):
    id: str
    frame_id: str
    confidence: float
    bbox: BoundingBoxSchema
    mosaic_position: Point2DSchema
    mosaic_polygon: List[Point2DSchema]
    mosaic_outline: List[Point2DSchema] = Field(default_factory=list, description="Crack mask outline in mosaic pixels")
    length_px: Optional[float] = Field(None, description="Crack length in mosaic pixels")
    max_width_px: Optional[float] = Field(None, description="Maximum crack width in mosaic pixels")
    length_mm: Optional[float] = None
    max_width_mm: Optional[float] = None
    severity: str = Field("unknown", description="low | medium | high | unknown")
    is_out_of_bounds: bool = False
    possible_duplicate_of: Optional[str] = None

class LocalizationMapRequestItem(BaseModel):
    frame_id: str
    confidence: float
    bbox: BoundingBoxSchema
    outline: List[Point2DSchema] = Field(default_factory=list)
    length_px: Optional[float] = None
    max_width_px: Optional[float] = None

class LocalizationMapRequest(BaseModel):
    mosaic_id: str
    detections: List[LocalizationMapRequestItem]

class LocalizationProcessRequest(BaseModel):
    mosaic_id: str
    confidence_threshold: float = 0.25

class LocalizationResponse(BaseModel):
    status: str = "completed"
    mosaic_id: str
    mosaic_image_url: str
    total_frames: int
    frames_with_cracks: int
    total_cracks: int
    localized_cracks: int
    average_confidence: float
    mm_per_pixel: Optional[float] = None
    cracks: List[LocalizedCrackItemSchema]


