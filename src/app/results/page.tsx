'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useInspection } from '@/context/InspectionContext';
import { formatFullDate } from '@/lib/utils';
import {
  FileCheck,
  Camera,
  Grid,
  Scan,
  Activity,
  Download,
  ShieldCheck,
} from 'lucide-react';

export default function ResultsPage() {
  const {
    session,
    capturedFrames,
    mosaicResult,
    crackResult,
    settings,
  } = useInspection();

  const handleExportReport = () => {
    const reportData = {
      session,
      framesCount: capturedFrames.length,
      mosaic: mosaicResult,
      crackDetection: crackResult,
      settings,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Inspection_Report_${session.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <span>Inspection Results</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Unified floor inspection metadata, mosaic preview, and crack detection summary.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleExportReport}
          icon={<Download className="w-4 h-4" />}
        >
          Export Report (.JSON)
        </Button>
      </div>

      {/* SECTION 1: Session Information */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Session Metadata</span>
          </div>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Session ID</span>
            <p className="text-sm font-bold font-mono text-slate-200 mt-1">{session.id}</p>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Date & Time</span>
            <p className="text-xs font-mono text-slate-300 mt-1">{formatFullDate(session.startTime)}</p>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Images Captured</span>
            <p className="text-sm font-bold font-mono text-emerald-400 mt-1">{capturedFrames.length}</p>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Mosaic Status</span>
            <div className="mt-1">
              <Badge variant={mosaicResult ? 'success' : 'neutral'}>
                {mosaicResult ? 'Generated' : 'Not Generated'}
              </Badge>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Crack Detection</span>
            <div className="mt-1">
              <Badge variant={crackResult ? 'warning' : 'neutral'}>
                {crackResult ? 'Completed' : 'Not Performed'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 2 & 3: Mosaic Preview & Crack Detection Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mosaic Preview Card */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-emerald-400" />
              <span>Mosaic Preview</span>
            </div>
          }
        >
          {mosaicResult ? (
            <div className="space-y-3">
              <div className="aspect-video bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mosaicResult.imageUrl}
                  alt="Floor Mosaic Preview"
                  className="max-h-full max-w-full object-contain rounded"
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Images Stitched: {mosaicResult.stats.imagesUsedCount}</span>
                <span>Detector: {settings.featureDetector}</span>
              </div>
            </div>
          ) : (
            <div className="py-12 border-2 border-dashed border-slate-800 rounded-lg text-center space-y-2">
              <Grid className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No floor mosaic generated for this session.</p>
              <Link href="/mosaicking">
                <Button variant="outline" size="sm" className="mt-2">
                  Generate Mosaic
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Crack Detection Preview Card */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-emerald-400" />
              <span>Crack Detection Results</span>
            </div>
          }
        >
          {crackResult ? (
            <div className="space-y-3">
              <div className="aspect-video bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={crackResult.annotatedImageUrl}
                  alt="Crack Detection Result"
                  className="max-h-full max-w-full object-contain rounded"
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Cracks Detected: {crackResult.crackCount ?? '--'}</span>
                <span>AI Model: {settings.aiModel}</span>
              </div>
            </div>
          ) : (
            <div className="py-12 border-2 border-dashed border-slate-800 rounded-lg text-center space-y-2">
              <Scan className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No AI crack detection performed yet.</p>
              <Link href="/crack-detection">
                <Button variant="outline" size="sm" className="mt-2">
                  Run Detection
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* SECTION 4: Processing Statistics Summary */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Inspection Diagnostic Telemetry</span>
          </div>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <span className="text-slate-400 block uppercase">Feature Detector</span>
            <span className="text-slate-200 font-bold mt-1 block">{settings.featureDetector}</span>
          </div>
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <span className="text-slate-400 block uppercase">Feature Matcher</span>
            <span className="text-slate-200 font-bold mt-1 block">{settings.matchingAlgorithm}</span>
          </div>
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <span className="text-slate-400 block uppercase">AI Model</span>
            <span className="text-slate-200 font-bold mt-1 block">{settings.aiModel}</span>
          </div>
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <span className="text-slate-400 block uppercase">FastAPI Endpoint</span>
            <span className="text-slate-200 font-bold mt-1 block truncate">{settings.backendUrl}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
