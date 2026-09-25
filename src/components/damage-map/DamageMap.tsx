'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CrackSeverity, LocalizedCrack } from '@/types';
import { CrackMarker } from './CrackMarker';
import {
  DUPLICATE_COLOR,
  SEVERITY_ORDER,
  SEVERITY_STYLE,
  crackBounds,
  crackColor,
  crackShape,
} from './severity';
import { Download, FileJson, Layers, Maximize, Minus, Plus } from 'lucide-react';

interface DamageMapProps {
  mosaicUrl: string;
  mosaicWidth: number;
  mosaicHeight: number;
  cracks: LocalizedCrack[];
  selectedCrack: LocalizedCrack | null;
  onSelectCrack: (crack: LocalizedCrack | null) => void;
  /** Bump `nonce` to fly the map to crack `id` (e.g. when picked from the crack list) */
  focusRequest?: { id: string; nonce: number } | null;
  mmPerPixel?: number | null;
  exportName?: string;
}

interface View {
  k: number; // screen px per mosaic px
  x: number; // screen offset of mosaic origin
  y: number;
}

const MAX_ZOOM = 8;
const DRAG_THRESHOLD = 4;
const GRID_TARGET_SCREEN_PX = 110;
const MINIMAP_WIDTH = 170;

function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

function formatCoord(px: number, mmPerPixel?: number | null): string {
  if (!mmPerPixel) return `${Math.round(px)}`;
  const mm = px * mmPerPixel;
  return mm >= 1000 ? `${(mm / 1000).toFixed(mm % 1000 === 0 ? 0 : 1)}m` : `${Math.round(mm)}mm`;
}

export const DamageMap: React.FC<DamageMapProps> = ({
  mosaicUrl,
  mosaicWidth,
  mosaicHeight,
  cracks,
  selectedCrack,
  onSelectCrack,
  focusRequest,
  mmPerPixel,
  exportName = 'damage-map',
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; viewX: number; viewY: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [imgSize, setImgSize] = useState({ width: mosaicWidth, height: mosaicHeight });
  // User-adjusted view for a given mosaic; null means "fit to viewport"
  const [viewState, setViewState] = useState<{ url: string; view: View } | null>(null);
  const [handledFocusNonce, setHandledFocusNonce] = useState(0);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [showOutlines, setShowOutlines] = useState(true);
  const [showQuads, setShowQuads] = useState(false);
  const [showPins, setShowPins] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [hideDuplicates, setHideDuplicates] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0);
  const [severityFilter, setSeverityFilter] = useState<Set<CrackSeverity>>(new Set(SEVERITY_ORDER));

  const W = imgSize.width || mosaicWidth;
  const H = imgSize.height || mosaicHeight;

  const fitView = useCallback((): View => {
    const { width: vw, height: vh } = viewportSize;
    if (!vw || !vh || !W || !H) return { k: 1, x: 0, y: 0 };
    const k = Math.min(vw / W, vh / H) * 0.96;
    return { k, x: (vw - W * k) / 2, y: (vh - H * k) / 2 };
  }, [viewportSize, W, H]);

  const view: View = viewState?.url === mosaicUrl ? viewState.view : fitView();
  const setView = (next: View | ((v: View) => View)) =>
    setViewState({ url: mosaicUrl, view: typeof next === 'function' ? next(view) : next });
  const minZoom = fitView().k * 0.5;

  // Track viewport size
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const zoomAt = (factor: number, sx?: number, sy?: number) => {
    const cx = sx ?? viewportSize.width / 2;
    const cy = sy ?? viewportSize.height / 2;
    const k = Math.min(MAX_ZOOM, Math.max(minZoom, view.k * factor));
    const r = k / view.k;
    setView({ k, x: cx - (cx - view.x) * r, y: cy - (cy - view.y) * r });
  };
  const zoomAtRef = useRef(zoomAt);
  useEffect(() => {
    zoomAtRef.current = zoomAt;
  });

  // Wheel zoom around the cursor (non-passive so the page does not scroll)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAtRef.current(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Fly to a crack when the parent issues a new focus request (state adjusted during render)
  if (focusRequest && focusRequest.nonce !== handledFocusNonce && viewportSize.width > 0) {
    setHandledFocusNonce(focusRequest.nonce);
    const crack = cracks.find((c) => c.id === focusRequest.id);
    if (crack) {
      const { width: vw, height: vh } = viewportSize;
      const b = crackBounds(crack);
      const bw = Math.max(b.maxX - b.minX, 40);
      const bh = Math.max(b.maxY - b.minY, 40);
      const k = Math.min(MAX_ZOOM, Math.max(fitView().k, Math.min(vw / (bw * 2.5), vh / (bh * 2.5))));
      const cx = (b.minX + b.maxX) / 2;
      const cy = (b.minY + b.maxY) / 2;
      setView({ k, x: vw / 2 - cx * k, y: vh / 2 - cy * k });
    }
  }

  const toMosaic = (clientX: number, clientY: number) => {
    const rect = viewportRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left - view.x) / view.k, y: (clientY - rect.top - view.y) / view.k };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    suppressClickRef.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const m = toMosaic(e.clientX, e.clientY);
    setCursor(m.x >= 0 && m.y >= 0 && m.x <= W && m.y <= H ? m : null);

    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      d.moved = true;
      setIsDragging(true);
      viewportRef.current?.setPointerCapture(e.pointerId);
    }
    if (d.moved) setView({ ...view, x: d.viewX + dx, y: d.viewY + dy });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    suppressClickRef.current = Boolean(dragRef.current?.moved);
    dragRef.current = null;
    setIsDragging(false);
    if (viewportRef.current?.hasPointerCapture(e.pointerId)) viewportRef.current.releasePointerCapture(e.pointerId);
  };

  const handleSelect = (crack: LocalizedCrack | null) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onSelectCrack(crack);
  };

  const visibleCracks = useMemo(
    () =>
      cracks.filter(
        (c) =>
          !(hideDuplicates && c.possibleDuplicateOf) &&
          c.confidence >= minConfidence &&
          severityFilter.has(c.severity)
      ),
    [cracks, hideDuplicates, minConfidence, severityFilter]
  );

  const severityCounts = useMemo(() => {
    const counts: Record<CrackSeverity, number> = { high: 0, medium: 0, low: 0, unknown: 0 };
    cracks.forEach((c) => counts[c.severity]++);
    return counts;
  }, [cracks]);

  const toggleSeverity = (s: CrackSeverity) =>
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  // Grid lines in mosaic units, labels in screen space
  const gridStep = niceStep(GRID_TARGET_SCREEN_PX / view.k);
  const gridXs: number[] = [];
  const gridYs: number[] = [];
  if (showGrid && W && H) {
    for (let gx = 0; gx <= W; gx += gridStep) gridXs.push(gx);
    for (let gy = 0; gy <= H; gy += gridStep) gridYs.push(gy);
  }

  // Minimap viewport rectangle (mosaic units)
  const miniScale = W ? MINIMAP_WIDTH / W : 0;
  const visRect = {
    x: Math.max(0, -view.x / view.k),
    y: Math.max(0, -view.y / view.k),
    x2: Math.min(W, (viewportSize.width - view.x) / view.k),
    y2: Math.min(H, (viewportSize.height - view.y) / view.k),
  };
  const zoomedIn = view.k > fitView().k * 1.05;

  const onMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / miniScale;
    const my = (e.clientY - rect.top) / miniScale;
    setView({ ...view, x: viewportSize.width / 2 - mx * view.k, y: viewportSize.height / 2 - my * view.k });
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const payload = {
      mosaic: { url: mosaicUrl, width: W, height: H, mmPerPixel: mmPerPixel ?? null },
      exportedAt: new Date().toISOString(),
      cracks: visibleCracks,
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${exportName}.json`);
  };

  const exportPng = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.min(1, 4096 / Math.max(W, H));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(W * scale);
      canvas.height = Math.round(H * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      const lw = Math.max(1.5, 2 / scale);
      visibleCracks.forEach((c, i) => {
        const pts = crackShape(c);
        const color = crackColor(c);
        if (pts.length) {
          ctx.beginPath();
          pts.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
          ctx.closePath();
          ctx.fillStyle = color + '66';
          ctx.fill();
          ctx.lineWidth = lw;
          ctx.strokeStyle = color;
          ctx.stroke();
        }
        const b = crackBounds(c);
        ctx.font = `bold ${Math.round(14 / scale)}px monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3 / scale;
        const label = `#${i + 1} ${SEVERITY_STYLE[c.severity].label}`;
        ctx.strokeText(label, b.minX, b.minY - 4 / scale);
        ctx.fillText(label, b.minX, b.minY - 4 / scale);
      });
      canvas.toBlob((blob) => blob && downloadBlob(blob, `${exportName}.png`), 'image/png');
    };
    img.onerror = () => alert('Could not load the mosaic image for export.');
    img.src = mosaicUrl;
  };

  const toolbarBtn =
    'p-1.5 rounded-lg bg-gray-800/90 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors disabled:opacity-40';

  const layerToggle = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-white transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded bg-gray-800 border-gray-700 text-cyan-500 focus:ring-cyan-500"
      />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="relative w-full rounded-xl bg-gray-900/80 p-4 border border-gray-800 shadow-2xl backdrop-blur-md">
      {/* Toolbar: layers and export */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-gray-800 text-xs">
        <div className="flex items-center gap-2 text-gray-300 font-medium">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Digital Damage Map</span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 text-[10px] font-mono border border-cyan-800">
            {W && H ? `${W} × ${H} px` : 'Auto-scale'}
            {mmPerPixel ? ` · ${mmPerPixel} mm/px` : ''}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {layerToggle('Crack outlines', showOutlines, setShowOutlines)}
          {layerToggle('Bounding quads', showQuads, setShowQuads)}
          {layerToggle('Pins', showPins, setShowPins)}
          {layerToggle('Grid', showGrid, setShowGrid)}
          {layerToggle('Hide duplicates', hideDuplicates, setHideDuplicates)}
          <div className="flex items-center gap-1.5 pl-2 border-l border-gray-800">
            <button onClick={exportPng} className={toolbarBtn} title="Export annotated map (PNG)">
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={exportJson} className={toolbarBtn} title="Export crack data (JSON)">
              <FileJson className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters: severity chips and confidence */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-[11px]">
        <div className="flex flex-wrap items-center gap-1.5">
          {SEVERITY_ORDER.map((s) => {
            const active = severityFilter.has(s);
            return (
              <button
                key={s}
                onClick={() => toggleSeverity(s)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-colors ${
                  active ? SEVERITY_STYLE[s].badge : 'bg-gray-900 text-gray-500 border-gray-800 line-through'
                }`}
                aria-pressed={active}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_STYLE[s].color }} />
                {SEVERITY_STYLE[s].label}
                <span className="font-mono opacity-80">{severityCounts[s]}</span>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-gray-400">
          Min confidence
          <input
            type="range"
            min={0}
            max={0.95}
            step={0.05}
            value={minConfidence}
            onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
            className="w-28 accent-cyan-500"
          />
          <span className="font-mono text-cyan-300 w-8">{Math.round(minConfidence * 100)}%</span>
        </label>
      </div>

      {/* Map viewport */}
      <div
        ref={viewportRef}
        className={`relative w-full h-[62vh] min-h-[420px] overflow-hidden rounded-lg bg-black select-none touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setCursor(null)}
        onClick={() => handleSelect(null)}
        onDoubleClick={(e) => {
          const rect = viewportRef.current!.getBoundingClientRect();
          zoomAt(2, e.clientX - rect.left, e.clientY - rect.top);
        }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ width: W, height: H, transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mosaicUrl}
            alt="Floor orthomosaic"
            draggable={false}
            onLoad={(e) => {
              const { naturalWidth, naturalHeight } = e.currentTarget;
              if (naturalWidth && naturalHeight) setImgSize({ width: naturalWidth, height: naturalHeight });
            }}
            style={{ width: W, height: H, maxWidth: 'none' }}
            className="block"
          />
          <svg className="absolute top-0 left-0 overflow-visible" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            {showGrid && (
              <g stroke="#22d3ee" strokeOpacity={0.35} strokeWidth={1}>
                {gridXs.map((gx) => (
                  <line key={`gx${gx}`} x1={gx} y1={0} x2={gx} y2={H} vectorEffect="non-scaling-stroke" />
                ))}
                {gridYs.map((gy) => (
                  <line key={`gy${gy}`} x1={0} y1={gy} x2={W} y2={gy} vectorEffect="non-scaling-stroke" />
                ))}
              </g>
            )}
            {visibleCracks.map((crack) => (
              <CrackMarker
                key={crack.id}
                crack={crack}
                zoom={view.k}
                isSelected={selectedCrack?.id === crack.id}
                showOutline={showOutlines}
                showQuad={showQuads}
                showPin={showPins}
                onSelect={handleSelect}
              />
            ))}
          </svg>
        </div>

        {/* Grid axis labels (screen space) */}
        {showGrid && (
          <div className="pointer-events-none absolute inset-0 text-[9px] font-mono text-cyan-300/80">
            {gridXs.map((gx) => {
              const sx = view.x + gx * view.k;
              if (sx < 0 || sx > viewportSize.width - 20) return null;
              return (
                <span key={`lx${gx}`} className="absolute top-1 px-0.5 rounded bg-black/60" style={{ left: sx + 2 }}>
                  {formatCoord(gx, mmPerPixel)}
                </span>
              );
            })}
            {gridYs.map((gy) => {
              const sy = view.y + gy * view.k;
              if (sy < 14 || sy > viewportSize.height - 12) return null;
              return (
                <span key={`ly${gy}`} className="absolute left-1 px-0.5 rounded bg-black/60" style={{ top: sy + 2 }}>
                  {formatCoord(gy, mmPerPixel)}
                </span>
              );
            })}
          </div>
        )}

        {/* Zoom controls */}
        <div
          className="absolute top-3 right-3 flex flex-col gap-1.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <button className={toolbarBtn} onClick={() => zoomAt(1.5)} title="Zoom in" disabled={view.k >= MAX_ZOOM}>
            <Plus className="w-4 h-4" />
          </button>
          <button className={toolbarBtn} onClick={() => zoomAt(1 / 1.5)} title="Zoom out" disabled={view.k <= minZoom}>
            <Minus className="w-4 h-4" />
          </button>
          <button className={toolbarBtn} onClick={() => setViewState(null)} title="Fit to view">
            <Maximize className="w-4 h-4" />
          </button>
          <span className="text-center text-[10px] font-mono text-gray-300 bg-gray-900/80 rounded px-1 py-0.5">
            {Math.round(view.k * 100)}%
          </span>
        </div>

        {/* Minimap */}
        {zoomedIn && W > 0 && (
          <div
            className="absolute bottom-3 right-3 rounded-md overflow-hidden border border-gray-600 bg-black/80 shadow-lg cursor-pointer"
            style={{ width: MINIMAP_WIDTH, height: H * miniScale }}
            onClick={onMinimapClick}
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mosaicUrl} alt="" draggable={false} className="w-full h-full opacity-70" />
            <svg className="absolute inset-0" width={MINIMAP_WIDTH} height={H * miniScale}>
              {visibleCracks.map((c) => (
                <circle
                  key={c.id}
                  cx={c.mosaicPosition.x * miniScale}
                  cy={c.mosaicPosition.y * miniScale}
                  r={2}
                  fill={crackColor(c)}
                />
              ))}
              <rect
                x={visRect.x * miniScale}
                y={visRect.y * miniScale}
                width={Math.max(2, (visRect.x2 - visRect.x) * miniScale)}
                height={Math.max(2, (visRect.y2 - visRect.y) * miniScale)}
                fill="#22d3ee"
                fillOpacity={0.12}
                stroke="#22d3ee"
                strokeWidth={1.5}
              />
            </svg>
          </div>
        )}

        {/* Cursor coordinate readout */}
        <div className="pointer-events-none absolute bottom-3 left-3 text-[10px] font-mono text-gray-300 bg-gray-900/85 rounded px-2 py-1 border border-gray-700">
          {cursor
            ? `X ${formatCoord(cursor.x, mmPerPixel)}  Y ${formatCoord(cursor.y, mmPerPixel)}${mmPerPixel ? '' : ' px'}`
            : 'Scroll to zoom · drag to pan · double-click to zoom in'}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pt-2 text-[11px] text-gray-400 border-t border-gray-800/60">
        <div className="flex flex-wrap items-center gap-4">
          {SEVERITY_ORDER.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SEVERITY_STYLE[s].color }} />
              {SEVERITY_STYLE[s].label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm border border-dashed" style={{ borderColor: DUPLICATE_COLOR }} />
            Duplicate
          </span>
        </div>
        <div className="font-mono text-gray-500">
          Showing {visibleCracks.length} of {cracks.length} cracks
        </div>
      </div>
    </div>
  );
};
