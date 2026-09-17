'use client';

import React, { useState, useEffect } from 'react';
import { MosaicMetadata, LocalizedCrack, LocalizationResult } from '@/types';
import { getMosaicMetadataApi, processMosaicLocalizationApi } from '@/lib/api';
import { DamageMap } from '@/components/damage-map/DamageMap';
import { CrackDetails } from '@/components/damage-map/CrackDetails';
import { LocalizationStats } from '@/components/damage-map/LocalizationStats';
import { LocalizationStatus } from '@/components/damage-map/LocalizationStatus';
import { Map, Layers, RefreshCw, AlertCircle } from 'lucide-react';

export default function DamageMapPage() {
  const [mosaicId, setMosaicId] = useState<string>('');
  const [mosaicMetadata, setMosaicMetadata] = useState<MosaicMetadata | null>(null);
  const [localizationResult, setLocalizationResult] = useState<LocalizationResult | null>(null);
  const [selectedCrack, setSelectedCrack] = useState<LocalizedCrack | null>(null);

  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [confThreshold, setConfThreshold] = useState<number>(0.25);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState<boolean>(false);

  // Check for stored mosaic in localStorage on mount
  useEffect(() => {
    try {
      const storedMosaicJson = localStorage.getItem('latestMosaicResult');
      if (storedMosaicJson) {
        const parsed = JSON.parse(storedMosaicJson);
        if (parsed?.id) {
          setMosaicId(parsed.id);
          fetchMetadata(parsed.id);
        }
      }
    } catch (e) {
      console.error('Error reading stored mosaic:', e);
    }
  }, []);

  const fetchMetadata = async (idToFetch: string) => {
    if (!idToFetch.trim()) return;
    setLoadingMetadata(true);
    setErrorMsg(null);

    const { data, error } = await getMosaicMetadataApi(idToFetch.trim());
    setLoadingMetadata(false);

    if (data) {
      setMosaicMetadata(data);
    } else {
      setErrorMsg(error || 'Failed to load mosaic metadata from backend.');
    }
  };

  const handleProcessLocalization = async () => {
    if (!mosaicId && !mosaicMetadata?.id) return;
    const targetId = mosaicId || mosaicMetadata?.id || '';
    
    setStatus('processing');
    setErrorMsg(null);
    setSelectedCrack(null);

    const { data, error } = await processMosaicLocalizationApi(targetId, confThreshold);

    if (data) {
      setLocalizationResult(data);
      setStatus('completed');
    } else {
      setStatus('failed');
      setErrorMsg(error || 'Failed to process localization on backend.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <Map className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Digital Damage Map & Crack Localization
            </h1>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Global homography transformation mapping frame-level YOLO crack detections into orthomosaic floor coordinates.
          </p>
        </div>

        {/* Mosaic ID Selector Input */}
        <div className="flex items-center gap-2 bg-gray-900/90 p-2 rounded-xl border border-gray-800 shadow-md">
          <Layers className="w-4 h-4 text-cyan-400 ml-1" />
          <input
            type="text"
            placeholder="Enter Mosaic ID (e.g. mosaic_20260917...)"
            value={mosaicId}
            onChange={(e) => setMosaicId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchMetadata(mosaicId)}
            className="bg-gray-800 text-white text-xs px-2 py-1.5 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 w-56 font-mono"
          />
          <button
            onClick={() => fetchMetadata(mosaicId)}
            disabled={loadingMetadata || !mosaicId.trim()}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-400 disabled:opacity-50 transition-colors"
            title="Fetch Mosaic Metadata"
          >
            <RefreshCw className={`w-4 h-4 ${loadingMetadata ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error alert banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Status & Control Panel */}
      <LocalizationStatus
        status={status}
        confThreshold={confThreshold}
        onConfThresholdChange={setConfThreshold}
        onProcess={handleProcessLocalization}
        hasMosaic={Boolean(mosaicMetadata || mosaicId)}
        errorMessage={errorMsg}
      />

      {/* High Level Statistics */}
      {localizationResult && <LocalizationStats result={localizationResult} />}

      {/* Main Canvas + Side Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Interactive Damage Map Canvas (3 cols) */}
        <div className="lg:col-span-3">
          {mosaicMetadata?.imageUrl || localizationResult?.mosaicImageUrl ? (
            <DamageMap
              mosaicUrl={localizationResult?.mosaicImageUrl || mosaicMetadata?.imageUrl || ''}
              mosaicWidth={mosaicMetadata?.width || 2000}
              mosaicHeight={mosaicMetadata?.height || 1500}
              cracks={localizationResult?.cracks || []}
              selectedCrack={selectedCrack}
              onSelectCrack={setSelectedCrack}
            />
          ) : (
            <div className="h-[450px] rounded-xl bg-gray-900/60 border border-gray-800/80 flex flex-col items-center justify-center text-center p-6 backdrop-blur-md">
              <Layers className="w-12 h-12 text-gray-700 mb-3 animate-bounce" />
              <h3 className="text-sm font-semibold text-gray-300">No Floor Orthomosaic Selected</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Please generate a floor mosaic in the Mosaicking page or paste a valid Mosaic ID above to begin damage map localization.
              </p>
            </div>
          )}
        </div>

        {/* Side Telemetry Inspector (1 col) */}
        <div className="lg:col-span-1 min-h-[400px]">
          <CrackDetails selectedCrack={selectedCrack} onClose={() => setSelectedCrack(null)} />
        </div>
      </div>
    </div>
  );
}
