'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { CrackDetectionResult } from '@/types';
import { Scan, ShieldAlert, Sparkles } from 'lucide-react';

interface CrackResultProps {
  crackResult: CrackDetectionResult | null;
  isProcessing: boolean;
}

export const CrackResult: React.FC<CrackResultProps> = ({
  crackResult,
  isProcessing,
}) => {
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Scan className="w-4 h-4 text-emerald-400" />
          <span>Detection Result</span>
        </div>
      }
      className="h-full"
    >
      <div className="relative w-full aspect-video min-h-[380px] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center select-none">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center space-y-3 p-8">
            <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin flex items-center justify-center">
              <Scan className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-slate-200">Running AI Crack Detection...</p>
            <p className="text-xs text-slate-400 font-mono">Inference model: YOLOv8-Crack-v2</p>
          </div>
        ) : crackResult ? (
          <div className="relative w-full h-full flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={crackResult.annotatedImageUrl}
              alt="Annotated Crack Detection Result"
              className="max-h-full max-w-full object-contain rounded border border-slate-700/80 shadow-xl"
            />

            {/* AI Detection Overlay Bounding Boxes Simulation overlay */}
            {crackResult.detections.map((det) => (
              <div
                key={det.id}
                className="absolute border-2 border-rose-500 bg-rose-500/10 pointer-events-none rounded-xs flex items-start"
                style={{
                  left: `${det.box.x}%`,
                  top: `${det.box.y}%`,
                  width: `${det.box.width}%`,
                  height: `${det.box.height}%`,
                }}
              >
                <span className="bg-rose-600 text-white text-[9px] font-mono px-1 py-0.5 font-bold leading-none shadow-xs">
                  {det.label} ({(det.confidence * 100).toFixed(0)}%)
                </span>
              </div>
            ))}

            <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-slate-900/90 border border-emerald-500/50 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Detection Complete</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-slate-600" />
            </div>
            <div className="space-y-1 max-w-md">
              <p className="text-sm font-semibold text-slate-300">No detection performed</p>
              <p className="text-xs text-slate-500">
                Select or upload a floor inspection image on the left panel and click &quot;Run Crack Detection&quot; to execute computer vision analysis.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
