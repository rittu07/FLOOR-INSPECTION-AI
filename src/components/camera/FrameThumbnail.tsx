import React from 'react';
import { CapturedFrame } from '@/types';
import { formatDate } from '@/lib/utils';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FrameThumbnailProps {
  frame: CapturedFrame;
  index: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
}

export const FrameThumbnail: React.FC<FrameThumbnailProps> = ({
  frame,
  index,
  isSelected = false,
  onSelect,
  onDelete,
}) => {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative bg-slate-900 border rounded-lg overflow-hidden transition-all cursor-pointer flex flex-col select-none',
        isSelected
          ? 'border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
          : 'border-slate-800 hover:border-slate-700'
      )}
    >
      {/* Thumbnail Aspect Ratio Box */}
      <div className="relative aspect-video bg-slate-950 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frame.dataUrl}
          alt={`Frame ${index + 1}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Selection Badge Overlay */}
        <div className="absolute top-2 left-2 z-10">
          <div
            className={cn(
              'w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
              isSelected
                ? 'bg-emerald-500 border-emerald-400 text-white'
                : 'bg-slate-900/80 border-slate-600 text-transparent group-hover:border-slate-400'
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
          </div>
        </div>

        {/* Delete button on hover */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 p-1.5 rounded-md bg-rose-950/80 border border-rose-500/50 text-rose-300 hover:bg-rose-900 hover:text-white transition-all shadow-sm"
            title="Delete frame"
            aria-label="Delete frame"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Info Bar */}
      <div className="p-2.5 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <span className="font-mono font-bold text-slate-200">Frame {index + 1}</span>
        <span className="font-mono text-[10px] text-slate-400">{formatDate(frame.timestamp)}</span>
      </div>
    </div>
  );
};
