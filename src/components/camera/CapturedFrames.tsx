'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FrameThumbnail } from './FrameThumbnail';
import { useInspection } from '@/context/InspectionContext';
import { Trash2, Grid, Image as ImageIcon } from 'lucide-react';

export const CapturedFrames: React.FC = () => {
  const {
    capturedFrames,
    selectedFrameIds,
    toggleFrameSelection,
    deleteCapturedFrame,
    clearCapturedFrames,
  } = useInspection();

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-emerald-400" />
          <span>Captured Frames</span>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-emerald-400">
            {capturedFrames.length}
          </span>
        </div>
      }
      action={
        capturedFrames.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearCapturedFrames}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Clear All
            </Button>
            <Link href="/mosaicking">
              <Button
                variant="primary"
                size="sm"
                icon={<Grid className="w-3.5 h-3.5" />}
              >
                Use for Mosaic ({selectedFrameIds.length})
              </Button>
            </Link>
          </div>
        )
      }
    >
      {capturedFrames.length === 0 ? (
        <div className="py-12 border-2 border-dashed border-slate-800/80 rounded-lg text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-slate-600" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-300">No frames captured yet.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start the camera and click &quot;Capture Frame&quot; to build a sequence of overlapping floor images.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {capturedFrames.map((frame, index) => (
            <FrameThumbnail
              key={frame.id}
              frame={frame}
              index={index}
              isSelected={selectedFrameIds.includes(frame.id)}
              onSelect={() => toggleFrameSelection(frame.id)}
              onDelete={() => deleteCapturedFrame(frame.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
};
