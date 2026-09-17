'use client';

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { MosaicResult } from '@/types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Grid,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MosaicViewerProps {
  mosaicResult: MosaicResult | null;
}

export const MosaicViewer: React.FC<MosaicViewerProps> = ({ mosaicResult }) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Grid className="w-4 h-4 text-emerald-400" />
          <span>Floor Mosaic</span>
        </div>
      }
      action={
        mosaicResult && (
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-md border border-slate-800">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono text-slate-300 select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-slate-800 mx-1" />
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        )
      }
      className="h-full"
    >
      <div
        ref={containerRef}
        className={cn(
          'relative w-full aspect-video min-h-[380px] bg-slate-950 border border-slate-800/80 rounded-lg overflow-hidden flex items-center justify-center select-none',
          isFullscreen && 'bg-slate-950 p-4'
        )}
      >
        {mosaicResult ? (
          <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
            <div
              className="transition-transform duration-200 ease-out origin-center max-w-full max-h-full"
              style={{ transform: `scale(${zoom})` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mosaicResult.imageUrl}
                alt="Generated Floor Mosaic"
                className="rounded border border-slate-700/80 shadow-2xl object-contain max-h-[600px]"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Grid className="w-8 h-8 text-slate-600" />
            </div>
            <div className="space-y-1 max-w-md">
              <p className="text-sm font-semibold text-slate-300">No mosaic generated</p>
              <p className="text-xs text-slate-500">
                Select 2 or more captured frames from the acquisition gallery and run feature matching to stitch the floor surface preview.
              </p>
            </div>
          </div>
        )}

        {mosaicResult && (
          <div className="absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MOSAIC PREVIEW ACTIVE</span>
          </div>
        )}
      </div>
    </Card>
  );
};
