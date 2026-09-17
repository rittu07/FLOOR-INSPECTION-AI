'use client';

import React, { useRef, useEffect } from 'react';
import { Camera, AlertTriangle, RefreshCw, Crosshair } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export type CameraState = 'offline' | 'starting' | 'ready' | 'error';

interface CameraViewerProps {
  cameraState: CameraState;
  errorMessage?: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isCapturing?: boolean;
}

export const CameraViewer: React.FC<CameraViewerProps> = ({
  cameraState,
  errorMessage,
  videoRef,
  isCapturing = false,
}) => {
  const getBadgeVariant = () => {
    switch (cameraState) {
      case 'ready':
        return 'success';
      case 'starting':
        return 'warning';
      case 'error':
        return 'error';
      case 'offline':
      default:
        return 'neutral';
    }
  };

  const getStatusText = () => {
    switch (cameraState) {
      case 'ready':
        return 'Camera Ready';
      case 'starting':
        return 'Starting Camera...';
      case 'error':
        return 'Camera Error';
      case 'offline':
      default:
        return 'Camera Offline';
    }
  };

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex flex-col items-center justify-center group select-none shadow-inner">
      {/* Top HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <Badge variant={getBadgeVariant()}>{getStatusText()}</Badge>
        {cameraState === 'ready' && (
          <div className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 font-mono text-[10px] text-slate-300 backdrop-blur-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>LIVE WEBSTREAM | 1280x720</span>
          </div>
        )}
      </div>

      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          cameraState === 'ready' ? 'opacity-100' : 'opacity-0 hidden'
        )}
      />

      {/* Crosshair Overlay HUD */}
      {cameraState === 'ready' && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity">
          <Crosshair className="w-16 h-16 text-emerald-400 stroke-[1]" />
          <div className="absolute inset-8 border border-dashed border-emerald-500/30 rounded" />
        </div>
      )}

      {/* Flash effect animation on frame capture */}
      {isCapturing && (
        <div className="absolute inset-0 z-30 bg-white/40 animate-out fade-out duration-300 pointer-events-none" />
      )}

      {/* Camera Offline / Starting / Error Placeholder overlay */}
      {cameraState !== 'ready' && (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
          {cameraState === 'starting' ? (
            <RefreshCw className="w-12 h-12 text-amber-400 animate-spin opacity-80" />
          ) : cameraState === 'error' ? (
            <AlertTriangle className="w-12 h-12 text-rose-400 opacity-80" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Camera className="w-8 h-8 text-slate-500" />
            </div>
          )}

          <div className="space-y-1 max-w-sm">
            <p className="text-sm font-semibold text-slate-200">
              {cameraState === 'starting'
                ? 'Requesting webcam permissions...'
                : cameraState === 'error'
                ? 'Failed to access camera'
                : 'No camera connected'}
            </p>
            <p className="text-xs text-slate-400">
              {errorMessage ||
                (cameraState === 'offline'
                  ? 'Click "Start Camera" to initiate live floor preview stream.'
                  : 'Ensure browser webcam permissions are granted.')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
