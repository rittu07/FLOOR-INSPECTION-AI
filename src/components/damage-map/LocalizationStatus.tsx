'use client';

import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Loader2, Play } from 'lucide-react';

interface LocalizationStatusProps {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  confThreshold: number;
  onConfThresholdChange: (val: number) => void;
  onProcess: () => void;
  hasMosaic: boolean;
  errorMessage?: string | null;
}

export const LocalizationStatus: React.FC<LocalizationStatusProps> = ({
  status,
  confThreshold,
  onConfThresholdChange,
  onProcess,
  hasMosaic,
  errorMessage,
}) => {
  return (
    <div className="rounded-xl bg-gray-900/80 p-4 border border-gray-800 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
      {/* Left Status Indicator */}
      <div className="flex items-center gap-3">
        <div className="relative">
          {status === 'processing' ? (
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          ) : status === 'completed' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          ) : status === 'failed' ? (
            <AlertTriangle className="w-6 h-6 text-red-400" />
          ) : (
            <Activity className="w-6 h-6 text-cyan-400" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Phase 4: Crack Localization Pipeline</h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                status === 'completed'
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                  : status === 'processing'
                  ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800 animate-pulse'
                  : status === 'failed'
                  ? 'bg-red-950/80 text-red-400 border-red-800'
                  : 'bg-gray-800 text-gray-300 border-gray-700'
              }`}
            >
              {status.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {status === 'processing'
              ? 'Running multi-frame YOLO detection and perspective homography transformation...'
              : status === 'completed'
              ? 'Damage mapping complete. Select markers to inspect coordinates.'
              : status === 'failed'
              ? errorMessage || 'Localization failed during matrix transformation.'
              : 'Ready to extract and map crack detections onto global floor mosaic.'}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Confidence Threshold Slider */}
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/60 px-3 py-1.5 rounded-lg border border-gray-700/60">
          <span>Conf Threshold:</span>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={confThreshold}
            onChange={(e) => onConfThresholdChange(parseFloat(e.target.value))}
            className="w-20 accent-cyan-500 cursor-pointer"
            disabled={status === 'processing'}
          />
          <span className="font-mono font-bold text-cyan-400 w-8 text-right">
            {Math.round(confThreshold * 100)}%
          </span>
        </div>

        {/* Process Button */}
        <button
          onClick={onProcess}
          disabled={!hasMosaic || status === 'processing'}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 shadow-lg ${
            !hasMosaic || status === 'processing'
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {status === 'processing' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing Damage Map...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Process Damage Map</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
