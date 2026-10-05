'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { MosaicMetadata, LocalizedCrack, LocalizationResult, CrackDetectionResult } from '@/types';
import { getMosaicMetadataApi, processMosaicLocalizationApi } from '@/lib/api';
import { useInspection } from '@/context/InspectionContext';
import { DamageMap } from '@/components/damage-map/DamageMap';
import { CrackDetails } from '@/components/damage-map/CrackDetails';
import { CrackList } from '@/components/damage-map/CrackList';
import { LocalizationStats } from '@/components/damage-map/LocalizationStats';
import { LocalizationStatus } from '@/components/damage-map/LocalizationStatus';
import { severityFromWidthPx } from '@/components/damage-map/severity';
import { Map, Layers, RefreshCw, AlertCircle, Image as ImageIcon, Scan } from 'lucide-react';

type MapSource = 'detection' | 'mosaic';

/** Presents a single-image crack detection result as a digital damage map (image pixels = map coordinates). */
function detectionToMap(result: CrackDetectionResult): LocalizationResult {
  const cracks: LocalizedCrack[] = result.detections.map((d, i) => {
    const { x, y, width, height } = d.box;
    return {
      id: `det_${String(i + 1).padStart(3, '0')}`,
      frameId: 'Uploaded image',
      confidence: d.confidence,
      bbox: d.box,
      mosaicPosition: { x: x + width / 2, y: y + height / 2 },
      mosaicPolygon: [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ],
      mosaicOutline: d.outline ?? [],
      lengthPx: d.lengthPx ?? null,
      maxWidthPx: d.maxWidthPx ?? null,
      lengthMm: null,
      maxWidthMm: null,
      severity: severityFromWidthPx(d.maxWidthPx),
      isOutOfBounds: false,
      possibleDuplicateOf: null,
    };
  });
  return {
    status: 'completed',
    mosaicId: result.id,
    mosaicImageUrl: result.sourceImageUrl,
    totalFrames: 1,
    framesWithCracks: cracks.length > 0 ? 1 : 0,
    totalCracks: cracks.length,
    localizedCracks: cracks.length,
    averageConfidence: result.avgConfidence ?? 0,
    mmPerPixel: null,
    cracks,
  };
}

export default function DamageMapPage() {
  const { crackResult } = useInspection();

  const [mosaicId, setMosaicId] = useState<string>('');
  const [mosaicMetadata, setMosaicMetadata] = useState<MosaicMetadata | null>(null);
  const [localizationResult, setLocalizationResult] = useState<LocalizationResult | null>(null);
  const [selectedCrack, setSelectedCrack] = useState<LocalizedCrack | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ id: string; nonce: number } | null>(null);
  const [sourceChoice, setSourceChoice] = useState<MapSource | null>(null);

  const pickCrackFromList = (crack: LocalizedCrack) => {
    setSelectedCrack(crack);
    setFocusRequest((prev) => ({ id: crack.id, nonce: (prev?.nonce ?? 0) + 1 }));
  };

  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [confThreshold, setConfThreshold] = useState<number>(0.25);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState<boolean>(false);

  const detectionMap = useMemo(
    () => (crackResult && crackResult.sourceImageUrl ? detectionToMap(crackResult) : null),
    [crackResult]
  );
  const hasMosaic = Boolean(mosaicMetadata?.imageUrl || localizationResult?.mosaicImageUrl);

  // Show what the user chose; otherwise prefer a processed mosaic, then the latest detection
  const source: MapSource =
    sourceChoice ?? (localizationResult || (mosaicMetadata && !detectionMap) ? 'mosaic' : detectionMap ? 'detection' : 'mosaic');
  const activeResult = source === 'detection' ? detectionMap : localizationResult;

  const switchSource = (next: MapSource) => {
    setSourceChoice(next);
    setSelectedCrack(null);
  };

  const handleProcessLocalization = async (idOverride?: string) => {
    const targetId = idOverride || mosaicId || mosaicMetadata?.id || '';
    if (!targetId) return;

    setStatus('processing');
    setErrorMsg(null);
    setSelectedCrack(null);

    const { data, error } = await processMosaicLocalizationApi(targetId, confThreshold);

    if (data) {
      setLocalizationResult(data);
      setSourceChoice('mosaic');
      setStatus('completed');
    } else {
      setStatus('failed');
      setErrorMsg(error || 'Failed to process localization on backend.');
    }
  };

  /**
   * Loads mosaic metadata. When `auto` (page load with the last generated mosaic), failures stay quiet
   * (hosted backends clear old mosaics on restart) and the crack map is generated straight away.
   */
  const fetchMetadata = async (idToFetch: string, auto = false) => {
    if (!idToFetch.trim()) return;
    setLoadingMetadata(true);
    if (!auto) setErrorMsg(null);

    const { data, error } = await getMosaicMetadataApi(idToFetch.trim());
    setLoadingMetadata(false);

    if (data) {
      setMosaicMetadata(data);
      if (auto) await handleProcessLocalization(data.id);
    } else if (!auto) {
      setErrorMsg(error || 'Failed to load mosaic metadata from backend.');
    }
  };

  // Load the most recently generated mosaic (saved by the Mosaicking page) and map its cracks
  useEffect(() => {
    try {
      const storedMosaicJson = localStorage.getItem('latestMosaicResult');
      if (storedMosaicJson) {
        const parsed = JSON.parse(storedMosaicJson);
        if (parsed?.id) {
          setMosaicId(parsed.id);
          fetchMetadata(parsed.id, true);
        }
      }
    } catch (e) {
      console.error('Error reading stored mosaic:', e);
    }
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapUrl = source === 'detection' ? detectionMap?.mosaicImageUrl : localizationResult?.mosaicImageUrl || mosaicMetadata?.imageUrl;

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
            Crack detections drawn on an interactive floor map: your latest detection result, or a stitched floor mosaic.
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

      {/* Map source switch (only when both a detection result and a mosaic are available) */}
      {detectionMap && hasMosaic && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">Show on map:</span>
          {(
            [
              ['detection', 'Latest crack detection', ImageIcon],
              ['mosaic', 'Floor mosaic', Layers],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => switchSource(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                source === value
                  ? 'bg-cyan-950/70 border-cyan-700 text-cyan-300'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Status & Control Panel (mosaic localization) */}
      {source === 'mosaic' && (
        <LocalizationStatus
          status={status}
          confThreshold={confThreshold}
          onConfThresholdChange={setConfThreshold}
          onProcess={() => handleProcessLocalization()}
          hasMosaic={Boolean(mosaicMetadata || mosaicId)}
          errorMessage={errorMsg}
        />
      )}

      {/* High Level Statistics */}
      {activeResult && <LocalizationStats result={activeResult} />}

      {/* Main Canvas + Side Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Interactive Damage Map Canvas (3 cols) */}
        <div className="lg:col-span-3">
          {mapUrl ? (
            <DamageMap
              key={`${source}-${mapUrl}`}
              mosaicUrl={mapUrl}
              mosaicWidth={source === 'mosaic' ? mosaicMetadata?.width || 2000 : 1000}
              mosaicHeight={source === 'mosaic' ? mosaicMetadata?.height || 1500 : 750}
              cracks={activeResult?.cracks || []}
              selectedCrack={selectedCrack}
              onSelectCrack={setSelectedCrack}
              focusRequest={focusRequest}
              mmPerPixel={activeResult?.mmPerPixel}
              exportName={`damage-map-${activeResult?.mosaicId || mosaicMetadata?.id || 'floor'}`}
            />
          ) : (
            <div className="h-[450px] rounded-xl bg-gray-900/60 border border-gray-800/80 flex flex-col items-center justify-center text-center p-6 backdrop-blur-md">
              <Layers className="w-12 h-12 text-gray-700 mb-3 animate-bounce" />
              <h3 className="text-sm font-semibold text-gray-300">No damage map yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Run a crack detection, or stitch a floor mosaic, and its cracks will appear here as an interactive digital map.
              </p>
              <div className="flex gap-2 mt-4">
                <Link
                  href="/crack-detection"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                >
                  <Scan className="w-3.5 h-3.5" /> Run crack detection
                </Link>
                <Link
                  href="/mosaicking"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold"
                >
                  <Layers className="w-3.5 h-3.5" /> Create a mosaic
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Side column: crack register + telemetry inspector (1 col) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <CrackList
            cracks={activeResult?.cracks || []}
            selectedCrack={selectedCrack}
            onPick={pickCrackFromList}
          />
          <div className="flex-1 min-h-[320px]">
            <CrackDetails selectedCrack={selectedCrack} onClose={() => setSelectedCrack(null)} />
          </div>
        </div>
      </div>
    </div>
  );
}
