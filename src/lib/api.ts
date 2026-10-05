import { CapturedFrame, MosaicResult, MosaicMetadata, CrackDetectionResult, LocalizedCrack, LocalizationResult } from '@/types';

/** Build-time default backend (NEXT_PUBLIC_API_URL), e.g. an ngrok or Render URL for the hosted app. */
export const DEFAULT_API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
const API_URL_STORAGE_KEY = 'backendUrl';

/**
 * Backend URL in use: a URL saved on the Settings page (this browser only) overrides the build-time
 * default, so a new ngrok/tunnel URL can be used without redeploying the frontend.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(API_URL_STORAGE_KEY);
      if (saved && /^https?:\/\/[^/\s]+/.test(saved)) return saved.trim().replace(/\/+$/, '');
    } catch {
      // storage unavailable (private mode): fall back to the default
    }
  }
  return DEFAULT_API_BASE_URL;
}

/** Saves a backend URL override for this browser; pass null (or the default) to clear it. */
export function setApiBaseUrl(url: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = url?.trim().replace(/\/+$/, '');
    if (!clean || clean === DEFAULT_API_BASE_URL) window.localStorage.removeItem(API_URL_STORAGE_KEY);
    else window.localStorage.setItem(API_URL_STORAGE_KEY, clean);
  } catch {
    // ignore storage failures
  }
}

/** Free ngrok tunnels show an HTML warning page to browsers unless this header is sent. */
function backendHeaders(url: string): Record<string, string> {
  return /\.ngrok(-free)?\.(app|dev|io)/.test(url) ? { 'ngrok-skip-browser-warning': 'true' } : {};
}

/**
 * Applies a backend passed in the page link (`?backend=https://xxxx.ngrok-free.app`, as opened/shared by the
 * launcher), saves it for this browser and removes it from the address bar. Only https URLs (or a
 * localhost backend) are accepted.
 */
export function applyBackendFromLink(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const backend = url.searchParams.get('backend')?.trim().replace(/\/+$/, '');
    if (backend === undefined) return;
    const isValid =
      /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(backend) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(backend);
    if (isValid) setApiBaseUrl(backend);
    url.searchParams.delete('backend');
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // malformed link: keep the current backend
  }
}

const tunnelImageCache = new Map<string, Promise<string>>();

/** True for URLs served through a free ngrok tunnel (plain <img> loads get ngrok's HTML warning page). */
export function isTunnelUrl(url: string): boolean {
  return 'ngrok-skip-browser-warning' in backendHeaders(url);
}

/**
 * Returns a URL an <img>/canvas can load: for ngrok-tunnelled backend images the file is fetched with the
 * skip-warning header and exposed as a blob: URL (cached); other URLs are returned unchanged.
 */
export function resolveImageUrl(url: string): Promise<string> {
  if (!isTunnelUrl(url)) return Promise.resolve(url);
  let pending = tunnelImageCache.get(url);
  if (!pending) {
    pending = fetch(url, { headers: backendHeaders(url) })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => URL.createObjectURL(blob));
    tunnelImageCache.set(url, pending);
    pending.catch(() => tunnelImageCache.delete(url));
  }
  return pending;
}

/** Absolute URL for a backend path such as /outputs/x.jpg. */
export function backendUrl(path: string): string {
  return path.startsWith('http') || path.startsWith('data:') ? path : `${getApiBaseUrl()}${path}`;
}

export interface ApiErrorResponse {
  status: string;
  code: string;
  message: string;
  diagnostics?: Record<string, unknown>;
  failed_step?: number;
  successful_images?: number;
}

export interface BackendFrameUploadResponse {
  id: string;
  filename: string;
  status: string;
  url: string;
}

export interface BackendMosaicStepStats {
  step: number;
  base_image: string;
  new_image: string;
  good_matches: number;
  inliers: number;
  inlier_ratio: number;
  processing_time_seconds: number;
  status: string;
}

export interface BackendMosaicStats {
  total_images: number;
  successful_pairs: number;
  failed_pairs: number;
  total_good_matches: number;
  total_inliers: number;
  average_inlier_ratio: number;
  steps: BackendMosaicStepStats[];
}

export interface BackendFrameTransform {
  frame_id: string;
  filename: string;
  homography: number[][];
  source_width: number;
  source_height: number;
  mosaic_width: number;
  mosaic_height: number;
}

export interface BackendMosaicResponse {
  id: string;
  status: string;
  image_url: string;
  images_used: number;
  statistics: BackendMosaicStats;
  processing_time_seconds: number;
  width?: number;
  height?: number;
  frames?: string[];
  transforms?: BackendFrameTransform[];
}

export interface BackendMosaicMetadataResponse extends BackendMosaicResponse {
  width: number;
  height: number;
  frames: string[];
  transforms: BackendFrameTransform[];
}

export interface BackendCrackItem {
  id: string;
  class_id: number;
  label: string;
  confidence: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface BackendCrackResponse {
  id: string;
  status: string;
  image_url: string;
  source_image_url?: string | null;
  annotated_image_url: string;
  detections: BackendCrackItem[];
  summary: {
    cracks_detected: number;
    average_confidence: number;
  };
  crack_count: number;
  avg_confidence: number;
  highest_confidence: number;
  processing_time_seconds: number;
}

export interface BackendLocalizedCrack {
  id: string;
  frame_id: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  mosaic_position: { x: number; y: number };
  mosaic_polygon: Array<{ x: number; y: number }>;
  mosaic_outline?: Array<{ x: number; y: number }>;
  length_px?: number | null;
  max_width_px?: number | null;
  length_mm?: number | null;
  max_width_mm?: number | null;
  severity?: string;
  is_out_of_bounds: boolean;
  possible_duplicate_of?: string | null;
}

export interface BackendLocalizationResponse {
  status: string;
  mosaic_id: string;
  mosaic_image_url: string;
  total_frames: number;
  frames_with_cracks: number;
  total_cracks: number;
  localized_cracks: number;
  average_confidence: number;
  mm_per_pixel?: number | null;
  cracks: BackendLocalizedCrack[];
}

function mapLocalizedCrack(c: BackendLocalizedCrack): LocalizedCrack {
  return {
    id: c.id,
    frameId: c.frame_id,
    confidence: c.confidence,
    bbox: c.bbox,
    mosaicPosition: c.mosaic_position,
    mosaicPolygon: c.mosaic_polygon,
    mosaicOutline: c.mosaic_outline ?? [],
    lengthPx: c.length_px ?? null,
    maxWidthPx: c.max_width_px ?? null,
    lengthMm: c.length_mm ?? null,
    maxWidthMm: c.max_width_mm ?? null,
    severity: (['low', 'medium', 'high'].includes(c.severity ?? '') ? c.severity : 'unknown') as LocalizedCrack['severity'],
    isOutOfBounds: c.is_out_of_bounds,
    possibleDuplicateOf: c.possible_duplicate_of,
  };
}

/**
 * Helper to convert dataUrl or relative URL to Blob for FormData upload.
 */
async function imageInputToBlob(imageInput: string | Blob): Promise<Blob> {
  if (imageInput instanceof Blob) {
    return imageInput;
  }
  if (typeof imageInput === 'string') {
    if (imageInput.startsWith('data:')) {
      const res = await fetch(imageInput);
      return await res.blob();
    }
    const fullUrl = imageInput.startsWith('http') ? imageInput : `${getApiBaseUrl()}${imageInput}`;
    const res = await fetch(fullUrl, { headers: backendHeaders(fullUrl) });
    return await res.blob();
  }
  throw new Error('Unsupported image input type');
}

/**
 * Explains the common hosted-frontend failure: a deployed site (e.g. on Vercel) calling a backend
 * that only runs on this computer's localhost.
 */
function describeConnectionError(message: string): string {
  const apiIsLocal = /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(getApiBaseUrl());
  const pageIsLocal =
    typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (apiIsLocal && !pageIsLocal) {
    return (
      `Cannot reach the inspection backend at ${getApiBaseUrl()}. This hosted app runs the AI model on a ` +
      'separate backend: start it on this computer (and allow local network access if the browser asks), ' +
      'or set NEXT_PUBLIC_API_URL to a publicly hosted backend.'
    );
  }
  return `${message} (backend: ${getApiBaseUrl()})`;
}

/**
 * Helper to fetch from FastAPI backend and handle structured error responses.
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null; errorDetails?: ApiErrorResponse | null }> {
  try {
    const isFormData = options?.body instanceof FormData;
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = {
      ...backendHeaders(baseUrl),
      ...(options?.headers as Record<string, string>),
    };

    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      if (json && json.status === 'error') {
        return {
          data: null,
          error: json.message || `Backend Error (${json.code})`,
          errorDetails: json as ApiErrorResponse,
        };
      }
      return {
        data: null,
        error: `HTTP Error ${res.status}: ${res.statusText}`,
        errorDetails: null,
      };
    }

    return { data: json as T, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Backend connection unavailable';
    return { data: null, error: describeConnectionError(message), errorDetails: null };
  }
}

/**
 * Uploads a captured webcam frame Blob/File to FastAPI POST /api/camera/capture.
 */
export async function captureFrameApi(imageBlob: Blob, filename = 'capture.jpg') {
  const formData = new FormData();
  formData.append('file', imageBlob, filename);

  const { data, error, errorDetails } = await fetchApi<BackendFrameUploadResponse>('/api/camera/capture', {
    method: 'POST',
    body: formData,
  });

  if (data) {
    const fullUrl = data.url.startsWith('http') ? data.url : `${getApiBaseUrl()}${data.url}`;
    return {
      data: {
        ...data,
        url: fullUrl,
      },
      error: null,
    };
  }

  return { data: null, error, errorDetails };
}

/**
 * Sends selected frame IDs to FastAPI POST /api/mosaic/create.
 */
export async function createMosaicApi(frameIds: string[]) {
  const { data, error, errorDetails } = await fetchApi<BackendMosaicMetadataResponse>('/api/mosaic/create', {
    method: 'POST',
    body: JSON.stringify({ image_ids: frameIds }),
  });

  if (data) {
    const fullImageUrl = data.image_url.startsWith('http') ? data.image_url : `${getApiBaseUrl()}${data.image_url}`;

    const mosaicMetadata: MosaicMetadata = {
      id: data.id,
      imageUrl: fullImageUrl,
      createdAt: new Date().toISOString(),
      status: 'success',
      width: data.width || 0,
      height: data.height || 0,
      frames: data.frames || frameIds,
      transforms: (data.transforms || []).map((t) => ({
        frameId: t.frame_id,
        filename: t.filename,
        homography: t.homography,
        sourceWidth: t.source_width,
        sourceHeight: t.source_height,
        mosaicWidth: t.mosaic_width,
        mosaicHeight: t.mosaic_height,
      })),
      stats: {
        imagesUsedCount: data.images_used,
        featureMatches: data.statistics.total_good_matches,
        inliersCount: data.statistics.total_inliers,
        processingTimeMs: Math.round(data.processing_time_seconds * 1000),
        totalImages: data.statistics.total_images,
        successfulPairs: data.statistics.successful_pairs,
        failedPairs: data.statistics.failed_pairs,
        averageInlierRatio: data.statistics.average_inlier_ratio,
        steps: (data.statistics.steps || []).map((s) => ({
          step: s.step,
          baseImage: s.base_image,
          newImage: s.new_image,
          goodMatches: s.good_matches,
          inliers: s.inliers,
          inlierRatio: s.inlier_ratio,
          processingTimeSeconds: s.processing_time_seconds,
          status: s.status,
        })),
      },
    };

    return { data: mosaicMetadata, rawData: data, error: null };
  }

  return { data: null, rawData: null, error, errorDetails };
}

/**
 * Retrieves mosaic metadata and frame transformation matrices by ID.
 */
export async function getMosaicMetadataApi(mosaicId: string) {
  const { data, error, errorDetails } = await fetchApi<BackendMosaicMetadataResponse>(`/api/mosaic/${mosaicId}`, {
    method: 'GET',
  });

  if (data) {
    const fullImageUrl = data.image_url.startsWith('http') ? data.image_url : `${getApiBaseUrl()}${data.image_url}`;

    const mosaicMetadata: MosaicMetadata = {
      id: data.id,
      imageUrl: fullImageUrl,
      createdAt: new Date().toISOString(),
      status: 'success',
      width: data.width,
      height: data.height,
      frames: data.frames || [],
      transforms: (data.transforms || []).map((t) => ({
        frameId: t.frame_id,
        filename: t.filename,
        homography: t.homography,
        sourceWidth: t.source_width,
        sourceHeight: t.source_height,
        mosaicWidth: t.mosaic_width,
        mosaicHeight: t.mosaic_height,
      })),
      stats: {
        imagesUsedCount: data.images_used,
        featureMatches: data.statistics.total_good_matches,
        inliersCount: data.statistics.total_inliers,
        processingTimeMs: Math.round(data.processing_time_seconds * 1000),
        totalImages: data.statistics.total_images,
        successfulPairs: data.statistics.successful_pairs,
        failedPairs: data.statistics.failed_pairs,
        averageInlierRatio: data.statistics.average_inlier_ratio,
        steps: (data.statistics.steps || []).map((s) => ({
          step: s.step,
          baseImage: s.base_image,
          newImage: s.new_image,
          goodMatches: s.good_matches,
          inliers: s.inliers,
          inlierRatio: s.inlier_ratio,
          processingTimeSeconds: s.processing_time_seconds,
          status: s.status,
        })),
      },
    };

    return { data: mosaicMetadata, rawData: data, error: null };
  }

  return { data: null, rawData: null, error, errorDetails };
}

/**
 * Sends image payload (Blob, DataURL, or URL string) to FastAPI POST /api/crack/detect.
 */
export async function detectCracksApi(
  imageInput: string | Blob,
  confThreshold?: number,
  sensitivity: string = 'high',
  minArea?: number
) {
  try {
    const blob = await imageInputToBlob(imageInput);
    const formData = new FormData();
    formData.append('file', blob, 'crack_input.jpg');

    const params = new URLSearchParams();
    if (confThreshold !== undefined) params.append('conf_threshold', confThreshold.toString());
    if (sensitivity) params.append('sensitivity', sensitivity);
    if (minArea !== undefined) params.append('min_area', minArea.toString());

    const endpoint = `/api/crack/detect?${params.toString()}`;


    const { data, error, errorDetails } = await fetchApi<BackendCrackResponse>(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (data) {
      const fullAnnotatedUrl = data.annotated_image_url.startsWith('http')
        ? data.annotated_image_url
        : `${getApiBaseUrl()}${data.annotated_image_url}`;

      const fullSourceUrl = typeof imageInput === 'string'
        ? (imageInput.startsWith('http') ? imageInput : (imageInput.startsWith('data:') ? imageInput : `${getApiBaseUrl()}${imageInput}`))
        : fullAnnotatedUrl;

      const mappedResult: CrackDetectionResult = {
        id: data.id,
        sourceImageUrl: fullSourceUrl,
        annotatedImageUrl: fullAnnotatedUrl,
        createdAt: new Date().toISOString(),
        crackCount: data.crack_count,
        avgConfidence: data.avg_confidence,
        highestConfidence: data.highest_confidence,
        processingTimeMs: Math.round(data.processing_time_seconds * 1000),
        detections: (data.detections || []).map((d) => ({
          id: d.id,
          label: (d.label as any) || 'Crack',
          confidence: d.confidence,
          box: d.box,
        })),
      };

      return { data: mappedResult, rawData: data, error: null };
    }

    return { data: null, rawData: null, error, errorDetails };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Crack detection request failed';
    return { data: null, rawData: null, error: message, errorDetails: null };
  }
}

/**
 * Sends detections payload to FastAPI POST /api/localization/map.
 */
export async function localizeDetectionsApi(
  mosaicId: string,
  detections: Array<{ frame_id: string; confidence: number; bbox: { x: number; y: number; width: number; height: number } }>
) {
  const { data, error, errorDetails } = await fetchApi<BackendLocalizationResponse>('/api/localization/map', {
    method: 'POST',
    body: JSON.stringify({ mosaic_id: mosaicId, detections }),
  });

  if (data) {
    const fullImageUrl = data.mosaic_image_url.startsWith('http')
      ? data.mosaic_image_url
      : `${getApiBaseUrl()}${data.mosaic_image_url}`;

    const result: LocalizationResult = {
      status: 'completed',
      mosaicId: data.mosaic_id,
      mosaicImageUrl: fullImageUrl,
      totalFrames: data.total_frames,
      framesWithCracks: data.frames_with_cracks,
      totalCracks: data.total_cracks,
      localizedCracks: data.localized_cracks,
      averageConfidence: data.average_confidence,
      mmPerPixel: data.mm_per_pixel ?? null,
      cracks: (data.cracks || []).map(mapLocalizedCrack),
    };
    return { data: result, rawData: data, error: null };
  }

  return { data: null, rawData: null, error, errorDetails };
}

/**
 * Triggers backend automated multi-frame crack detection & localization for a mosaic.
 */
export async function processMosaicLocalizationApi(mosaicId: string, confThreshold = 0.25) {
  const { data, error, errorDetails } = await fetchApi<BackendLocalizationResponse>('/api/localization/process', {
    method: 'POST',
    body: JSON.stringify({ mosaic_id: mosaicId, confidence_threshold: confThreshold }),
  });

  if (data) {
    const fullImageUrl = data.mosaic_image_url.startsWith('http')
      ? data.mosaic_image_url
      : `${getApiBaseUrl()}${data.mosaic_image_url}`;

    const result: LocalizationResult = {
      status: 'completed',
      mosaicId: data.mosaic_id,
      mosaicImageUrl: fullImageUrl,
      totalFrames: data.total_frames,
      framesWithCracks: data.frames_with_cracks,
      totalCracks: data.total_cracks,
      localizedCracks: data.localized_cracks,
      averageConfidence: data.average_confidence,
      mmPerPixel: data.mm_per_pixel ?? null,
      cracks: (data.cracks || []).map(mapLocalizedCrack),
    };
    return { data: result, rawData: data, error: null };
  }

  return { data: null, rawData: null, error, errorDetails };
}

// Backend Health check endpoint
export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // free-tier hosts can be slow to respond
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/health`, { signal: controller.signal, headers: backendHeaders(base) });
    clearTimeout(timeoutId);
    if (!res.ok) return false;
    const json = await res.json();
    return json.status === 'ok';
  } catch {
    return false;
  }
}


