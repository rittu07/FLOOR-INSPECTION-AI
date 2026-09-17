'use client';

import React, { useState } from 'react';
import { CrackInput } from '@/components/crack/CrackInput';
import { CrackResult } from '@/components/crack/CrackResult';
import { CrackStats } from '@/components/crack/CrackStats';
import { DetectionTable } from '@/components/crack/DetectionTable';
import { useInspection } from '@/context/InspectionContext';
import { detectCracksApi } from '@/lib/api';
import { Scan, Sliders, Target, Zap } from 'lucide-react';

export default function CrackDetectionPage() {
  const {
    capturedFrames,
    mosaicResult,
    crackResult,
    setCrackResult,
    settings,
  } = useInspection();

  const [selectedImage, setSelectedImage] = useState<string | null>(
    mosaicResult ? mosaicResult.imageUrl : capturedFrames.length > 0 ? capturedFrames[0].dataUrl : null
  );

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sensitivity, setSensitivity] = useState<'high' | 'balanced' | 'low'>('high');
  const [confThreshold, setConfThreshold] = useState<number>(0.25);
  const [minArea, setMinArea] = useState<number>(8);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  const handleRunDetection = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setErrorMsg(null);

    // Call API service wrapper with sensitivity and minArea controls
    const { data: apiData, error } = await detectCracksApi(selectedImage, confThreshold, sensitivity, minArea);

    if (apiData) {
      setCrackResult(apiData);
      setIsProcessing(false);
      return;
    }

    if (error) {
      setErrorMsg(error);
    }

    // Fallback UI state when backend unreachable
    setCrackResult({
      id: `crack-${Date.now()}`,
      sourceImageUrl: selectedImage,
      annotatedImageUrl: selectedImage,
      createdAt: new Date().toISOString(),
      crackCount: 0,
      avgConfidence: 0,
      highestConfidence: 0,
      processingTimeMs: 0,
      detections: [],
    });
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Tuning Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Scan className="w-5 h-5 text-emerald-400" />
            <span>AI Crack Detection</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Detect surface fractures and minute micro-cracks on floor tiles & orthomosaics.
          </p>
        </div>

        {/* Sensitivity & Crack Size Limit Control Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 shadow-lg text-xs backdrop-blur-md">
          {/* Sensitivity Mode Selector */}
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 font-medium">Sensitivity:</span>
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => { setSensitivity('high'); setMinArea(8); }}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                  sensitivity === 'high'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Detect minute micro-cracks and fine surface fissures"
              >
                Micro (High)
              </button>
              <button
                onClick={() => { setSensitivity('balanced'); setMinArea(25); }}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                  sensitivity === 'balanced'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Balanced
              </button>
              <button
                onClick={() => { setSensitivity('low'); setMinArea(100); }}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                  sensitivity === 'low'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Major Only
              </button>
            </div>
          </div>

          {/* Min Size Limit */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Min Area:</span>
            <select
              value={minArea}
              onChange={(e) => setMinArea(Number(e.target.value))}
              className="bg-slate-900 text-cyan-300 font-mono text-[11px] font-bold rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none"
            >
              <option value={5}>5 px (Micro)</option>
              <option value={8}>8 px (Fine)</option>
              <option value={25}>25 px (Medium)</option>
              <option value={100}>100 px (Large)</option>
            </select>
          </div>

          {/* Confidence Slider */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Conf:</span>
            <input
              type="range"
              min={0.05}
              max={0.90}
              step={0.05}
              value={confThreshold}
              onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
              className="w-16 accent-emerald-400 cursor-pointer"
            />
            <span className="font-mono text-[11px] font-bold text-emerald-400 w-7 text-right">
              {Math.round(confThreshold * 100)}%
            </span>
          </div>
        </div>
      </div>


      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Input Image Panel */}
        <div className="lg:col-span-5 space-y-4">
          <CrackInput
            selectedImage={selectedImage}
            onSelectImage={(img) => setSelectedImage(img)}
            onRunDetection={handleRunDetection}
            isProcessing={isProcessing}
          />
        </div>

        {/* RIGHT: Detection Result Panel */}
        <div className="lg:col-span-7 space-y-4">
          <CrackResult
            crackResult={crackResult}
            isProcessing={isProcessing}
          />
        </div>
      </div>

      {/* Crack Statistics Cards */}
      <CrackStats crackResult={crackResult} />

      {/* Detection Telemetry Table */}
      <DetectionTable detections={crackResult?.detections || []} />
    </div>
  );
}
