import { CrackSeverity, LocalizedCrack } from '@/types';

export const SEVERITY_ORDER: CrackSeverity[] = ['high', 'medium', 'low', 'unknown'];

export const SEVERITY_STYLE: Record<CrackSeverity, { label: string; color: string; badge: string }> = {
  high: { label: 'High', color: '#ef4444', badge: 'bg-red-950/80 text-red-300 border-red-800' },
  medium: { label: 'Medium', color: '#f59e0b', badge: 'bg-amber-950/80 text-amber-300 border-amber-800' },
  low: { label: 'Low', color: '#84cc16', badge: 'bg-lime-950/80 text-lime-300 border-lime-800' },
  unknown: { label: 'Unmeasured', color: '#22d3ee', badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800' },
};

export const DUPLICATE_COLOR = '#a855f7';
export const SELECTED_COLOR = '#3b82f6';
export const OUT_OF_BOUNDS_COLOR = '#6b7280';

export function crackColor(crack: LocalizedCrack, isSelected = false): string {
  if (isSelected) return SELECTED_COLOR;
  if (crack.possibleDuplicateOf) return DUPLICATE_COLOR;
  if (crack.isOutOfBounds) return OUT_OF_BOUNDS_COLOR;
  return SEVERITY_STYLE[crack.severity].color;
}

/** Formats a size using mm when the mosaic is calibrated, otherwise mosaic pixels. */
export function formatSize(px: number | null, mm: number | null): string {
  if (mm != null) return mm >= 1000 ? `${(mm / 1000).toFixed(2)} m` : `${mm} mm`;
  if (px != null) return `${Math.round(px)} px`;
  return '—';
}

/** Outline if the model produced a mask, otherwise the projected bounding quadrilateral. */
export function crackShape(crack: LocalizedCrack) {
  return crack.mosaicOutline.length >= 3 ? crack.mosaicOutline : crack.mosaicPolygon;
}

export function crackBounds(crack: LocalizedCrack) {
  const pts = crackShape(crack);
  if (!pts.length) {
    return { minX: crack.mosaicPosition.x, minY: crack.mosaicPosition.y, maxX: crack.mosaicPosition.x, maxY: crack.mosaicPosition.y };
  }
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

export function sortBySeverity(cracks: LocalizedCrack[]): LocalizedCrack[] {
  return [...cracks].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
      (b.maxWidthPx ?? 0) - (a.maxWidthPx ?? 0) ||
      b.confidence - a.confidence
  );
}
