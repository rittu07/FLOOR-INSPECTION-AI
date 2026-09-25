export interface CapturedFrame {
  id: string;
  timestamp: string;
  dataUrl: string;
  width: number;
  height: number;
  selectedForMosaic?: boolean;
}

export type MosaicStatus = 'idle' | 'processing' | 'success' | 'error';

export interface MosaicProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface MosaicStepStats {
  step: number;
  baseImage: string;
  newImage: string;
  goodMatches: number;
  inliers: number;
  inlierRatio: number;
  processingTimeSeconds: number;
  status: string;
}

export interface MosaicStats {
  imagesUsedCount: number;
  featureMatches: number | null;
  inliersCount: number | null;
  processingTimeMs: number | null;
  resolution?: string;
  coverageAreaM2?: number | null;
  totalImages?: number;
  successfulPairs?: number;
  failedPairs?: number;
  averageInlierRatio?: number;
  steps?: MosaicStepStats[];
}

export interface MosaicResult {
  id: string;
  imageUrl: string;
  createdAt: string;
  status: MosaicStatus;
  stats: MosaicStats;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CrackDetectionItem {
  id: string;
  label: 'Hairline Crack' | 'Structural Crack' | 'Surface Spalling' | 'Joint Separation';
  confidence: number;
  box: BoundingBox;
}

export interface CrackDetectionResult {
  id: string;
  sourceImageId?: string;
  sourceImageUrl: string;
  annotatedImageUrl: string;
  createdAt: string;
  crackCount: number | null;
  avgConfidence: number | null;
  highestConfidence: number | null;
  processingTimeMs: number | null;
  detections: CrackDetectionItem[];
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'camera_started' | 'camera_stopped' | 'frame_captured' | 'mosaic_generated' | 'crack_detected' | 'system_alert';
  message: string;
  details?: string;
}

export interface SystemSettings {
  cameraDeviceId: string;
  resolution: '1920x1080' | '1280x720' | '640x480';
  fps: number;
  featureDetector: 'ORB' | 'SIFT' | 'AKAZE';
  matchingAlgorithm: 'FlannBased' | 'BFMatcher';
  blendingEnabled: boolean;
  aiModel: 'YOLOv8-Crack-v2' | 'DeepCrack-ResNet' | 'Custom-CV-UNet';
  backendUrl: string;
  apiStatus: 'online' | 'offline' | 'checking';
}

export interface InspectionSession {
  id: string;
  startTime: string;
  framesCapturedCount: number;
  mosaicStatus: 'Not Generated' | 'Generated' | 'In Progress';
  crackDetectionStatus: 'Not Performed' | 'Completed' | 'In Progress';
  status: 'Ready' | 'Active' | 'Completed';
}

export interface FrameTransform {
  frameId: string;
  filename: string;
  homography: number[][];
  sourceWidth: number;
  sourceHeight: number;
  mosaicWidth: number;
  mosaicHeight: number;
}

export interface MosaicMetadata extends MosaicResult {
  width: number;
  height: number;
  frames: string[];
  transforms: FrameTransform[];
}

export interface Point2D {
  x: number;
  y: number;
}

export type CrackSeverity = 'low' | 'medium' | 'high' | 'unknown';

export interface LocalizedCrack {
  id: string;
  frameId: string;
  confidence: number;
  bbox: BoundingBox;
  mosaicPosition: Point2D;
  mosaicPolygon: Point2D[];
  mosaicOutline: Point2D[];
  lengthPx: number | null;
  maxWidthPx: number | null;
  lengthMm: number | null;
  maxWidthMm: number | null;
  severity: CrackSeverity;
  isOutOfBounds: boolean;
  possibleDuplicateOf?: string | null;
}

export interface LocalizationResult {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  mosaicId: string;
  mosaicImageUrl: string;
  totalFrames: number;
  framesWithCracks: number;
  totalCracks: number;
  localizedCracks: number;
  averageConfidence: number;
  mmPerPixel: number | null;
  cracks: LocalizedCrack[];
}

