'use client';

import React from 'react';
import { LocalizedCrack } from '@/types';
import { crackColor, crackShape } from './severity';

interface CrackMarkerProps {
  crack: LocalizedCrack;
  /** Current map zoom (screen px per mosaic px); keeps pins and labels a constant screen size */
  zoom: number;
  isSelected: boolean;
  showOutline: boolean;
  showQuad: boolean;
  showPin: boolean;
  onSelect: (crack: LocalizedCrack) => void;
}

const toPoints = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

export const CrackMarker: React.FC<CrackMarkerProps> = ({
  crack,
  zoom,
  isSelected,
  showOutline,
  showQuad,
  showPin,
  onSelect,
}) => {
  const color = crackColor(crack, isSelected);
  const isDuplicate = Boolean(crack.possibleDuplicateOf);
  const shape = crackShape(crack);
  const hasMask = crack.mosaicOutline.length >= 3;
  const u = 1 / zoom; // one screen pixel in mosaic units

  return (
    <g
      className="cursor-pointer group"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(crack);
      }}
    >
      {showQuad && crack.mosaicPolygon.length > 0 && (
        <polygon
          points={toPoints(crack.mosaicPolygon)}
          fill="none"
          stroke={color}
          strokeOpacity={0.7}
          strokeWidth={1}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {showOutline && shape.length > 0 && (
        <polygon
          points={toPoints(shape)}
          fill={color}
          fillOpacity={isSelected ? 0.55 : hasMask ? 0.4 : 0.15}
          stroke={color}
          strokeWidth={isSelected ? 2.5 : 1.5}
          strokeDasharray={isDuplicate ? '5 3' : undefined}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {showPin && (
        <g transform={`translate(${crack.mosaicPosition.x}, ${crack.mosaicPosition.y}) scale(${u})`}>
          {isSelected && <circle r={15} fill={color} fillOpacity={0.25} />}
          <circle r={isSelected ? 9 : 6} fill={color} stroke="#ffffff" strokeWidth={2} />
          <circle r={isSelected ? 3.5 : 2} fill="#ffffff" />
          <g
            transform="translate(0, -13)"
            className={isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          >
            <rect x={-30} y={-17} width={60} height={18} rx={4} fill="#111827" fillOpacity={0.92} stroke={color} />
            <text x={0} y={-4.5} textAnchor="middle" fill="#ffffff" fontSize={10} fontWeight="bold" fontFamily="monospace">
              {(crack.confidence * 100).toFixed(0)}%
            </text>
          </g>
        </g>
      )}
    </g>
  );
};
