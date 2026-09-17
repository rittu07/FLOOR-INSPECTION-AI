'use client';

import React from 'react';
import { LocalizationResult } from '@/types';
import { AlertCircle, CheckCircle, Frame, MapPin, Target } from 'lucide-react';

interface LocalizationStatsProps {
  result: LocalizationResult | null;
}

export const LocalizationStats: React.FC<LocalizationStatsProps> = ({ result }) => {
  if (!result) {
    return null;
  }

  const {
    totalFrames,
    framesWithCracks,
    totalCracks,
    localizedCracks,
    averageConfidence,
  } = result;

  const avgConfPercent = Math.round(averageConfidence * 100);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {/* Total Frames */}
      <div className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
          <Frame className="w-3.5 h-3.5 text-cyan-400" />
          <span>Frames Analyzed</span>
        </div>
        <div className="text-xl font-extrabold text-white font-mono">{totalFrames}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">Source Mosaic Input</div>
      </div>

      {/* Frames with Cracks */}
      <div className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Frames w/ Cracks</span>
        </div>
        <div className="text-xl font-extrabold text-amber-400 font-mono">{framesWithCracks}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          {totalFrames > 0 ? `${Math.round((framesWithCracks / totalFrames) * 100)}% ratio` : '0%'}
        </div>
      </div>

      {/* Total Cracks */}
      <div className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
          <Target className="w-3.5 h-3.5 text-red-400" />
          <span>Total Cracks</span>
        </div>
        <div className="text-xl font-extrabold text-red-400 font-mono">{totalCracks}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">YOLO Detections</div>
      </div>

      {/* Localized Cracks */}
      <div className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>Localized Cracks</span>
        </div>
        <div className="text-xl font-extrabold text-emerald-400 font-mono">{localizedCracks}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">Mapped to Mosaic</div>
      </div>

      {/* Avg Confidence */}
      <div className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 shadow-md backdrop-blur-md col-span-2 md:col-span-1">
        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
          <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
          <span>Avg Confidence</span>
        </div>
        <div className="text-xl font-extrabold text-blue-400 font-mono">{avgConfPercent}%</div>
        <div className="text-[10px] text-gray-500 mt-0.5">Precision Metric</div>
      </div>
    </div>
  );
};
