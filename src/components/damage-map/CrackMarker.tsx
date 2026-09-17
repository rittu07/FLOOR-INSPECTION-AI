'use client';

import React from 'react';
import { LocalizedCrack } from '@/types';

interface CrackMarkerProps {
  crack: LocalizedCrack;
  scaleX: number;
  scaleY: number;
  isSelected: boolean;
  onSelect: (crack: LocalizedCrack) => void;
}

export const CrackMarker: React.FC<CrackMarkerProps> = ({
  crack,
  scaleX,
  scaleY,
  isSelected,
  onSelect,
}) => {
  const displayX = crack.mosaicPosition.x * scaleX;
  const displayY = crack.mosaicPosition.y * scaleY;

  // Transform polygon points to display coordinates
  const polygonPointsStr = crack.mosaicPolygon
    .map((pt) => `${pt.x * scaleX},${pt.y * scaleY}`)
    .join(' ');

  const isDuplicate = Boolean(crack.possibleDuplicateOf);
  const isOutOfBounds = crack.isOutOfBounds;

  let strokeColor = '#f59e0b'; // Amber (normal crack)
  let fillColor = 'rgba(245, 158, 11, 0.2)';
  let pinColor = '#ef4444'; // Red pin

  if (isDuplicate) {
    strokeColor = '#a855f7'; // Purple (duplicate)
    fillColor = 'rgba(168, 85, 247, 0.2)';
    pinColor = '#a855f7';
  } else if (isOutOfBounds) {
    strokeColor = '#6b7280'; // Gray (out of bounds)
    fillColor = 'rgba(107, 114, 128, 0.2)';
    pinColor = '#6b7280';
  }

  if (isSelected) {
    strokeColor = '#3b82f6'; // Bright blue (selected)
    fillColor = 'rgba(59, 130, 246, 0.35)';
    pinColor = '#3b82f6';
  }

  return (
    <g
      className="cursor-pointer transition-all duration-200 hover:opacity-90 group"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(crack);
      }}
    >
      {/* Transformed 4-corner bounding polygon quadrilateral */}
      {polygonPointsStr && (
        <polygon
          points={polygonPointsStr}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isSelected ? 3 : 1.5}
          strokeDasharray={isDuplicate ? '4 2' : undefined}
          className="transition-all duration-200"
        />
      )}

      {/* Center Marker Pin */}
      <g transform={`translate(${displayX}, ${displayY})`}>
        {/* Pulsing selection aura */}
        {isSelected && (
          <circle
            r={16}
            fill={pinColor}
            fillOpacity={0.25}
            className="animate-ping"
          />
        )}

        {/* Pin Outer Ring */}
        <circle
          r={isSelected ? 10 : 7}
          fill={pinColor}
          stroke="#ffffff"
          strokeWidth={2}
          className="shadow-lg drop-shadow-md transition-all duration-200 group-hover:scale-125"
        />

        {/* Inner core dot */}
        <circle r={isSelected ? 4 : 2.5} fill="#ffffff" />

        {/* Hover / Selection Tooltip Pin Label */}
        <g
          transform="translate(0, -14)"
          className={`transition-opacity duration-200 ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <rect
            x={-36}
            y={-18}
            width={72}
            height={20}
            rx={4}
            fill="#1f2937"
            fillOpacity={0.9}
            stroke={pinColor}
            strokeWidth={1}
          />
          <text
            x={0}
            y={-5}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={10}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {(crack.confidence * 100).toFixed(0)}%
          </text>
        </g>
      </g>
    </g>
  );
};
