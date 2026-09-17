'use client';

import React from 'react';
import { LocalizedCrack } from '@/types';
import { AlertTriangle, CheckCircle2, Crosshair, HelpCircle, Image as ImageIcon, MapPin, X } from 'lucide-react';

interface CrackDetailsProps {
  selectedCrack: LocalizedCrack | null;
  onClose: () => void;
}

export const CrackDetails: React.FC<CrackDetailsProps> = ({ selectedCrack, onClose }) => {
  if (!selectedCrack) {
    return (
      <div className="h-full rounded-xl bg-gray-900/80 p-6 border border-gray-800 shadow-xl backdrop-blur-md flex flex-col items-center justify-center text-center text-gray-400">
        <HelpCircle className="w-10 h-10 text-gray-600 mb-3 animate-pulse" />
        <h3 className="text-sm font-semibold text-gray-200">No Marker Selected</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-[220px]">
          Click on any crack marker or polygon on the damage map to inspect detailed spatial telemetry.
        </p>
      </div>
    );
  }

  const {
    id,
    frameId,
    confidence,
    bbox,
    mosaicPosition,
    mosaicPolygon,
    isOutOfBounds,
    possibleDuplicateOf,
  } = selectedCrack;

  const confPercentage = Math.round(confidence * 100);

  return (
    <div className="h-full rounded-xl bg-gray-900/90 p-5 border border-cyan-900/50 shadow-2xl backdrop-blur-md flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between pb-3 mb-4 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <h3 className="text-sm font-bold text-white font-mono">{id}</h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Localized Damage Telemetry</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Duplicate / Out of bounds Warnings */}
        {possibleDuplicateOf && (
          <div className="mb-4 p-2.5 rounded-lg bg-purple-950/60 border border-purple-800 text-purple-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Spatial Duplicate Flagged</span>
              <p className="text-[11px] text-purple-400 mt-0.5">
                Within 30px of primary crack <span className="font-mono">{possibleDuplicateOf}</span>.
              </p>
            </div>
          </div>
        )}

        {isOutOfBounds && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Out of Bounds</span>
              <p className="text-[11px] text-red-400 mt-0.5">
                Transformed coordinates fall outside mosaic image boundaries.
              </p>
            </div>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="space-y-3 text-xs">
          {/* Confidence Bar */}
          <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/50">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-gray-400 font-medium">Detection Confidence</span>
              <span className="text-cyan-400 font-bold font-mono text-sm">{confPercentage}%</span>
            </div>
            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  confPercentage > 85 ? 'bg-emerald-500' : confPercentage > 60 ? 'bg-cyan-500' : 'bg-amber-500'
                }`}
                style={{ width: `${confPercentage}%` }}
              />
            </div>
          </div>

          {/* Source Frame */}
          <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-400">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              <span>Source Frame</span>
            </div>
            <span className="font-mono font-semibold text-gray-200">{frameId}</span>
          </div>

          {/* Global Mosaic Center Coordinates */}
          <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <MapPin className="w-4 h-4 text-red-400" />
              <span className="font-medium">Mosaic Center (X, Y)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
              <div className="p-1.5 rounded bg-gray-900 border border-gray-800">
                <span className="text-gray-500 text-[10px] block">X POS</span>
                <span className="text-cyan-300 font-bold">{mosaicPosition.x} px</span>
              </div>
              <div className="p-1.5 rounded bg-gray-900 border border-gray-800">
                <span className="text-gray-500 text-[10px] block">Y POS</span>
                <span className="text-cyan-300 font-bold">{mosaicPosition.y} px</span>
              </div>
            </div>
          </div>

          {/* 4-Point Quadrilateral Polygon */}
          <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Crosshair className="w-4 h-4 text-amber-400" />
              <span className="font-medium">Perspective Quadrilateral (4 Corners)</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
              {mosaicPolygon.map((pt, i) => (
                <div key={i} className="p-1 rounded bg-gray-900 text-gray-300 border border-gray-800/80">
                  <span className="text-gray-500 mr-1">P{i + 1}:</span>
                  ({pt.x}, {pt.y})
                </div>
              ))}
            </div>
          </div>

          {/* Raw Bounding Box */}
          <div className="p-3 rounded-lg bg-gray-800/40 border border-gray-700/30 text-[11px] font-mono text-gray-400 flex justify-between">
            <span>Frame BBox:</span>
            <span>x:{bbox.x}, y:{bbox.y}, w:{bbox.width}, h:{bbox.height}</span>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-4 pt-3 border-t border-gray-800 text-[10px] text-gray-500 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Homography Transformed
        </span>
        <span>CV-Engine v4.0</span>
      </div>
    </div>
  );
};
