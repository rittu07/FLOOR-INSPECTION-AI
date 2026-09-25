'use client';

import React, { useMemo } from 'react';
import { LocalizedCrack } from '@/types';
import { ListOrdered } from 'lucide-react';
import { SEVERITY_STYLE, crackColor, formatSize, sortBySeverity } from './severity';

interface CrackListProps {
  cracks: LocalizedCrack[];
  selectedCrack: LocalizedCrack | null;
  onPick: (crack: LocalizedCrack) => void;
}

export const CrackList: React.FC<CrackListProps> = ({ cracks, selectedCrack, onPick }) => {
  const sorted = useMemo(() => sortBySeverity(cracks), [cracks]);

  return (
    <div className="rounded-xl bg-gray-900/80 border border-gray-800 shadow-xl backdrop-blur-md flex flex-col max-h-[340px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 text-xs">
        <div className="flex items-center gap-2 text-gray-200 font-semibold">
          <ListOrdered className="w-4 h-4 text-cyan-400" />
          Crack Register
        </div>
        <span className="font-mono text-gray-500">{cracks.length}</span>
      </div>

      {sorted.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-gray-500">
          No cracks localized yet. Run localization to populate the register.
        </p>
      ) : (
        <ul className="overflow-y-auto divide-y divide-gray-800/70">
          {sorted.map((c) => {
            const isSelected = selectedCrack?.id === c.id;
            return (
              <li key={c.id}>
                <button
                  onClick={() => onPick(c)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-[11px] transition-colors ${
                    isSelected ? 'bg-blue-950/60' : 'hover:bg-gray-800/60'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: crackColor(c) }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-200 truncate">{c.id.split('_').pop()}</span>
                      <span className={`px-1.5 py-px rounded border text-[9px] ${SEVERITY_STYLE[c.severity].badge}`}>
                        {SEVERITY_STYLE[c.severity].label}
                      </span>
                      {c.possibleDuplicateOf && <span className="text-[9px] text-purple-400">dup</span>}
                    </div>
                    <div className="text-gray-500 font-mono mt-0.5">
                      L {formatSize(c.lengthPx, c.lengthMm)} · W {formatSize(c.maxWidthPx, c.maxWidthMm)}
                    </div>
                  </div>
                  <span className="font-mono text-cyan-300">{Math.round(c.confidence * 100)}%</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
