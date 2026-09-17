'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FrameThumbnail } from '@/components/camera/FrameThumbnail';
import { MosaicControls } from '@/components/mosaic/MosaicControls';
import { MosaicProgress, StepState } from '@/components/mosaic/MosaicProgress';
import { MosaicViewer } from '@/components/mosaic/MosaicViewer';
import { MosaicStats } from '@/components/mosaic/MosaicStats';
import { useInspection } from '@/context/InspectionContext';
import { createMosaicApi, ApiErrorResponse } from '@/lib/api';
import { Grid, CheckSquare, Square, Layers, AlertOctagon, RefreshCw } from 'lucide-react';

const defaultSteps: StepState[] = [
  { id: '1', label: 'Preparing Images & Equalizing Exposure', status: 'pending' },
  { id: '2', label: 'Detecting ORB Keypoints & Feature Descriptors', status: 'pending' },
  { id: '3', label: 'Matching Features via BFMatcher (KNN)', status: 'pending' },
  { id: '4', label: 'Estimating Homography Matrix via RANSAC', status: 'pending' },
  { id: '5', label: 'Warping Perspective & Multi-band Blending', status: 'pending' },
  { id: '6', label: 'Finalizing Composite Floor Mosaic', status: 'pending' },
];

export default function MosaickingPage() {
  const {
    capturedFrames,
    selectedFrameIds,
    toggleFrameSelection,
    selectAllFrames,
    deselectAllFrames,
    mosaicResult,
    setMosaicResult,
  } = useInspection();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressSteps, setProgressSteps] = useState<StepState[]>(defaultSteps);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDiagnostic, setErrorDiagnostic] = useState<ApiErrorResponse | null>(null);

  // FastAPI Mosaicking Execution & Progress Simulation
  const handleGenerateMosaic = async () => {
    if (selectedFrameIds.length < 2) return;

    setIsProcessing(true);
    setShowProgressModal(true);
    setErrorMessage(null);
    setErrorDiagnostic(null);

    // Reset steps
    const initial = defaultSteps.map((s, idx) => ({
      ...s,
      status: idx === 0 ? ('processing' as const) : ('pending' as const),
    }));
    setProgressSteps(initial);
    setCurrentStepIdx(0);

    // Animate progress steps while running OpenCV pipeline
    const progressTimer = setInterval(() => {
      setCurrentStepIdx((prev) => {
        const next = Math.min(prev + 1, defaultSteps.length - 1);
        setProgressSteps((steps) =>
          steps.map((step, idx) => {
            if (idx < next) return { ...step, status: 'completed' as const };
            if (idx === next) return { ...step, status: 'processing' as const };
            return { ...step, status: 'pending' as const };
          })
        );
        return next;
      });
    }, 450);

    const { data: apiResult, error, errorDetails } = await createMosaicApi(selectedFrameIds);

    clearInterval(progressTimer);

    if (apiResult) {
      setProgressSteps((prev) => prev.map((s) => ({ ...s, status: 'completed' as const })));
      setMosaicResult(apiResult);
      setTimeout(() => {
        setIsProcessing(false);
        setShowProgressModal(false);
      }, 400);
      return;
    }

    // Backend error or failure handling
    setProgressSteps((prev) =>
      prev.map((s, idx) => (idx === currentStepIdx ? { ...s, status: 'failed' as const } : s))
    );

    const detailMsg = errorDetails?.message || error || 'Failed to generate floor mosaic.';
    setErrorMessage(detailMsg);
    if (errorDetails) {
      setErrorDiagnostic(errorDetails);
    }

    setTimeout(() => {
      setIsProcessing(false);
      setShowProgressModal(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Grid className="w-5 h-5 text-emerald-400" />
            <span>Floor Image Mosaicking</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sequentially stitch up to 10 floor images in capture order into a high-resolution composite floor map.
          </p>
        </div>
      </div>

      {/* Structured Diagnostic Failure Card */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold font-mono text-rose-300">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              <span>
                Stitching Failure {errorDiagnostic?.failed_step !== undefined ? `at Step #${errorDiagnostic.failed_step}` : ''}
              </span>
            </div>
            <button
              onClick={() => {
                setErrorMessage(null);
                setErrorDiagnostic(null);
              }}
              className="text-rose-400 hover:text-white font-mono font-bold"
            >
              ✕
            </button>
          </div>

          <p className="text-rose-200/90 leading-relaxed font-sans">
            {errorMessage}
          </p>

          {errorDiagnostic && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-rose-900/60 text-[11px] font-mono">
              <div className="bg-rose-950/60 p-2.5 rounded border border-rose-900/50 space-y-1">
                <span className="text-rose-400 uppercase font-bold text-[10px]">Failure Context</span>
                <p className="text-slate-300">
                  Failed Step: <strong className="text-rose-300">{errorDiagnostic.failed_step ?? 'N/A'}</strong>
                </p>
                <p className="text-slate-300">
                  Successful Frames Prior: <strong className="text-emerald-400">{errorDiagnostic.successful_images ?? 'N/A'}</strong>
                </p>
                <p className="text-slate-300">
                  Error Code: <strong className="text-rose-400">{errorDiagnostic.code}</strong>
                </p>
              </div>

              {errorDiagnostic.diagnostics && (
                <div className="bg-rose-950/60 p-2.5 rounded border border-rose-900/50 space-y-1">
                  <span className="text-rose-400 uppercase font-bold text-[10px]">Keypoint Diagnostics</span>
                  {Object.entries(errorDiagnostic.diagnostics).map(([k, v]) => (
                    <p key={k} className="text-slate-300">
                      {k}: <strong className="text-slate-100">{String(v)}</strong>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-rose-300/80">
              Suggested Action: Reorder frames, capture additional overlapping frame, or adjust feature matcher settings.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateMosaic}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Retry Mosaicking
            </Button>
          </div>
        </div>
      )}

      {/* Input Frame Selection */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Input Images Selection</span>
          </div>
        }
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 mr-2">
              Images Selected: <strong className="text-emerald-400">{selectedFrameIds.length}</strong>
            </span>
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
              disabled={selectedFrameIds.length === 0}
              icon={<Square className="w-3.5 h-3.5" />}
            >
              Clear Selection
            </Button>
          </div>
        }
      >
        {capturedFrames.length === 0 ? (
          <div className="py-8 text-center text-slate-500 space-y-2">
            <p className="text-sm font-semibold">No captured frames available.</p>
            <p className="text-xs text-slate-600">
              Navigate to the Camera Acquisition page to capture floor images first.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 max-h-60 overflow-y-auto pr-1">
            {capturedFrames.map((frame, index) => (
              <FrameThumbnail
                key={frame.id}
                frame={frame}
                index={index}
                isSelected={selectedFrameIds.includes(frame.id)}
                onSelect={() => toggleFrameSelection(frame.id)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* SECTION 2 & 3: Mosaic Controls & Interactive Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-4 space-y-4">
          <MosaicControls
            onGenerateMosaic={handleGenerateMosaic}
            isProcessing={isProcessing}
          />
        </div>

        {/* Right: Large Viewer */}
        <div className="lg:col-span-8 space-y-4">
          <MosaicViewer mosaicResult={mosaicResult} />
        </div>
      </div>

      {/* Mosaicking Statistics */}
      <MosaicStats
        mosaicResult={mosaicResult}
        selectedCount={selectedFrameIds.length}
      />

      {/* Mock Process Dialog Modal */}
      <MosaicProgress
        isOpen={showProgressModal}
        steps={progressSteps}
        currentStepIndex={currentStepIdx}
      />
    </div>
  );
}
