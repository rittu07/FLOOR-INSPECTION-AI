'use client';

import React, { useRef, useState, useEffect } from 'react';
import { LocalizedCrack } from '@/types';
import { CrackMarker } from './CrackMarker';
import { Eye, Filter, Layers } from 'lucide-react';

interface DamageMapProps {
  mosaicUrl: string;
  mosaicWidth: number;
  mosaicHeight: number;
  cracks: LocalizedCrack[];
  selectedCrack: LocalizedCrack | null;
  onSelectCrack: (crack: LocalizedCrack | null) => void;
}

export const DamageMap: React.FC<DamageMapProps> = ({
  mosaicUrl,
  mosaicWidth,
  mosaicHeight,
  cracks,
  selectedCrack,
  onSelectCrack,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const [showPolygons, setShowPolygons] = useState<boolean>(true);
  const [hideDuplicates, setHideDuplicates] = useState<boolean>(false);

  // Update display dimensions when image loads or resizes
  const updateDimensions = () => {
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDisplaySize({ width: rect.width, height: rect.height });
      }
    }
  };

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [mosaicUrl]);

  const scaleX = mosaicWidth > 0 && displaySize.width > 0 ? displaySize.width / mosaicWidth : 1;
  const scaleY = mosaicHeight > 0 && displaySize.height > 0 ? displaySize.height / mosaicHeight : 1;

  const filteredCracks = cracks.filter((c) => {
    if (hideDuplicates && c.possibleDuplicateOf) return false;
    return true;
  });

  return (
    <div className="relative w-full rounded-xl bg-gray-900/80 p-4 border border-gray-800 shadow-2xl backdrop-blur-md">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-800 text-xs">
        <div className="flex items-center gap-2 text-gray-300 font-medium">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Interactive Damage Canvas Overlay</span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 text-[10px] font-mono border border-cyan-800">
            {mosaicWidth && mosaicHeight ? `${mosaicWidth} × ${mosaicHeight} px` : 'Auto-scale'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={showPolygons}
              onChange={(e) => setShowPolygons(e.target.checked)}
              className="rounded bg-gray-800 border-gray-700 text-cyan-500 focus:ring-cyan-500"
            />
            <Eye className="w-3.5 h-3.5" />
            <span>Show Quadrilaterals</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={hideDuplicates}
              onChange={(e) => setHideDuplicates(e.target.checked)}
              className="rounded bg-gray-800 border-gray-700 text-purple-500 focus:ring-purple-500"
            />
            <Filter className="w-3.5 h-3.5" />
            <span>Hide Duplicates</span>
          </label>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg bg-black flex items-center justify-center cursor-crosshair min-h-[400px]"
        onClick={() => onSelectCrack(null)}
      >
        {/* Floor Orthomosaic Image */}
        <img
          ref={imgRef}
          src={mosaicUrl}
          alt="Floor Orthomosaic"
          onLoad={updateDimensions}
          className="w-full h-auto max-h-[70vh] object-contain select-none block"
        />

        {/* Scaled SVG Overlay */}
        {displaySize.width > 0 && displaySize.height > 0 && (
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-auto"
            viewBox={`0 0 ${displaySize.width} ${displaySize.height}`}
            style={{ width: displaySize.width, height: displaySize.height }}
          >
            {filteredCracks.map((crack) => (
              <CrackMarker
                key={crack.id}
                crack={crack}
                scaleX={scaleX}
                scaleY={scaleY}
                isSelected={selectedCrack?.id === crack.id}
                onSelect={onSelectCrack}
              />
            ))}
          </svg>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pt-2 text-[11px] text-gray-400 border-t border-gray-800/60">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Primary Crack Marker
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Duplicate Flagged
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Selected Marker
          </span>
        </div>
        <div className="font-mono text-gray-500">
          Showing {filteredCracks.length} of {cracks.length} localized detections
        </div>
      </div>
    </div>
  );
};
