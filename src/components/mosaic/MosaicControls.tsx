'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useInspection } from '@/context/InspectionContext';
import { Sliders, Play, CheckSquare, Square, ArrowUp, ArrowDown, AlertTriangle, ListOrdered } from 'lucide-react';

interface MosaicControlsProps {
  onGenerateMosaic: () => void;
  isProcessing: boolean;
}

export const MosaicControls: React.FC<MosaicControlsProps> = ({
  onGenerateMosaic,
  isProcessing,
}) => {
  const {
    capturedFrames,
    selectedFrameIds,
    selectAllFrames,
    deselectAllFrames,
    moveSelectedFrame,
    settings,
    updateSettings,
  } = useInspection();

  const selectedCount = selectedFrameIds.length;
  const MAX_MOSAIC_IMAGES = 10;
  const isOverLimit = selectedCount > MAX_MOSAIC_IMAGES;
  const canGenerate = selectedCount >= 2 && selectedCount <= MAX_MOSAIC_IMAGES && !isProcessing;

  // Find frame metadata for selected IDs in exact sequence order
  const selectedFrames = selectedFrameIds
    .map((id) => capturedFrames.find((f) => f.id === id))
    .filter(Boolean);

  // Quality Warning Checks
  const lowResFrames = selectedFrames.filter((f) => f && f.width < 800);
  const hasQualityWarning = lowResFrames.length > 0;

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>Mosaic Configuration</span>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Frame Selection Overview */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Selected Frames
            </p>
            <p className="text-xl font-mono font-bold text-slate-100">
              {selectedCount}{' '}
              <span className="text-xs text-slate-400 font-sans font-normal">
                / {MAX_MOSAIC_IMAGES} max ({capturedFrames.length} captured)
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllFrames}
              disabled={capturedFrames.length === 0}
              icon={<CheckSquare className="w-3.5 h-3.5" />}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAllFrames}
              disabled={selectedCount === 0}
              icon={<Square className="w-3.5 h-3.5" />}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Quality Warning Indicators */}
        {isOverLimit && (
          <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Maximum Image Limit Exceeded</p>
              <p className="text-[11px] text-rose-300/80 mt-0.5">
                Maximum allowed is {MAX_MOSAIC_IMAGES} images. Please deselect {selectedCount - MAX_MOSAIC_IMAGES} frame(s).
              </p>
            </div>
          </div>
        )}

        {hasQualityWarning && !isOverLimit && (
          <div className="p-3 rounded-lg bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Low Resolution Frame Warning</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                {lowResFrames.length} frame(s) have resolution below 800px width. Feature matching accuracy may be reduced.
              </p>
            </div>
          </div>
        )}

        {/* Frame Reordering Controls */}
        {selectedCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
                Capture Sequence Order
              </span>
              <span className="text-[11px] text-slate-500">Mosaic₁₂ + Image₃ → Mosaic₁₂₃</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {selectedFrameIds.map((id, index) => {
                const frame = capturedFrames.find((f) => f.id === id);
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between px-3 py-1.5 rounded bg-slate-900/80 border border-slate-800 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                        {index + 1}
                      </span>
                      <span className="text-slate-200 truncate max-w-[140px]">
                        {id}
                      </span>
                      {frame && (
                        <span className="text-[10px] text-slate-500 font-sans">
                          {frame.width}x{frame.height}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveSelectedFrame(id, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSelectedFrame(id, 'down')}
                        disabled={index === selectedFrameIds.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Algorithm Settings */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Feature Detection Algorithm
            </label>
            <select
              value={settings.featureDetector}
              onChange={(e) => updateSettings({ featureDetector: e.target.value as 'ORB' | 'SIFT' | 'AKAZE' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-600 font-mono"
            >
              <option value="ORB">ORB + Homography (Recommended)</option>
              <option value="SIFT">SIFT (Scale-Invariant Feature Transform)</option>
              <option value="AKAZE">AKAZE (Accelerated KAZE)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Feature Matcher
            </label>
            <select
              value={settings.matchingAlgorithm}
              onChange={(e) => updateSettings({ matchingAlgorithm: e.target.value as 'BFMatcher' | 'FlannBased' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-600 font-mono"
            >
              <option value="BFMatcher">BFMatcher (Brute Force KNN Matcher)</option>
              <option value="FlannBased">FLANN (Fast Library for Approximate Nearest Neighbors)</option>
            </select>
          </div>

          {/* Toggle Switches */}
          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-slate-300">Feature Matching</span>
              <input
                type="checkbox"
                checked={true}
                readOnly
                className="w-4 h-4 accent-emerald-500 rounded bg-slate-950 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-slate-300">Multi-band Blending</span>
              <input
                type="checkbox"
                checked={settings.blendingEnabled}
                onChange={(e) => updateSettings({ blendingEnabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded bg-slate-950 border-slate-700"
              />
            </label>
          </div>
        </div>

        {/* Generate Mosaic Action Button */}
        <Button
          variant="primary"
          className="w-full py-3"
          onClick={onGenerateMosaic}
          disabled={!canGenerate}
          isLoading={isProcessing}
          icon={<Play className="w-4 h-4 fill-current" />}
        >
          Generate Mosaic ({selectedCount} Frames)
        </Button>

        {selectedCount < 2 && (
          <p className="text-xs text-amber-400/80 text-center font-mono">
            Requires 2 to 10 selected frames in capture order.
          </p>
        )}
      </div>
    </Card>
  );
};
