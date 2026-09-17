'use client';

import React from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { SystemStatus } from '@/components/dashboard/SystemStatus';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useInspection } from '@/context/InspectionContext';
import {
  Camera,
  Grid,
  Scan,
  Activity,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function DashboardPage() {
  const {
    capturedFrames,
    mosaicResult,
    crackResult,
    session,
    activityEvents,
  } = useInspection();

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-6 rounded-lg bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/30 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
            FLOOR INSPECTION AI
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            Industrial Computer Vision Inspection System
          </h2>
          <p className="text-xs text-slate-400">
            AI-powered floor image acquisition, mosaicking and crack detection overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/camera">
            <Button variant="primary" icon={<Camera className="w-4 h-4" />}>
              Start Acquisition
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Captured Frames"
          value={capturedFrames.length}
          subtitle="Webcam acquisition count"
          badgeText={capturedFrames.length > 0 ? `${capturedFrames.length} Frames` : '0 Frames'}
          badgeVariant={capturedFrames.length > 0 ? 'info' : 'neutral'}
          icon={<Camera className="w-5 h-5 text-cyan-400" />}
          iconBgColor="bg-cyan-950/50 border-cyan-800/60"
        />

        <StatCard
          title="Mosaic Status"
          value={session.mosaicStatus}
          subtitle="Homography image stitching"
          badgeText={mosaicResult ? 'Generated' : 'Not Generated'}
          badgeVariant={mosaicResult ? 'success' : 'neutral'}
          icon={<Grid className="w-5 h-5 text-emerald-400" />}
          iconBgColor="bg-emerald-950/50 border-emerald-800/60"
        />

        <StatCard
          title="Detected Cracks"
          value={crackResult?.crackCount !== null && crackResult?.crackCount !== undefined ? crackResult.crackCount : '--'}
          subtitle="AI model crack telemetry"
          badgeText={crackResult ? 'Completed' : 'Not Performed'}
          badgeVariant={crackResult ? 'warning' : 'neutral'}
          icon={<Scan className="w-5 h-5 text-amber-400" />}
          iconBgColor="bg-amber-950/50 border-amber-800/60"
        />

        <StatCard
          title="Current Session"
          value={session.status}
          subtitle={`ID: ${session.id}`}
          badgeText="Session Ready"
          badgeVariant="success"
          icon={<Activity className="w-5 h-5 text-purple-400" />}
          iconBgColor="bg-purple-950/50 border-purple-800/60"
        />
      </div>

      {/* Two Large Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: Live Camera Preview */}
        <Card
          title="Live Camera"
          subtitle="Connected acquisition device"
          action={
            <Link href="/camera">
              <Button variant="outline" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                Open Camera Page
              </Button>
            </Link>
          }
        >
          <div className="relative aspect-video bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Camera className="w-8 h-8 text-slate-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-200">
                {capturedFrames.length > 0 ? `${capturedFrames.length} Frames Captured` : 'No camera connected'}
              </p>
              <p className="text-xs text-slate-500 max-w-xs">
                Acquire floor imagery via HTML5 webcam stream for downstream mosaicking and crack detection.
              </p>
            </div>
            <Link href="/camera">
              <Button variant="primary" icon={<Camera className="w-4 h-4" />}>
                Open Camera
              </Button>
            </Link>
          </div>
        </Card>

        {/* CARD 2: Floor Mosaic Preview */}
        <Card
          title="Floor Mosaic"
          subtitle="Stitched floor view preview"
          action={
            <Link href="/mosaicking">
              <Button variant="outline" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                Open Mosaicking Page
              </Button>
            </Link>
          }
        >
          <div className="relative aspect-video bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex flex-col items-center justify-center text-center p-6 space-y-4">
            {mosaicResult ? (
              <div className="relative w-full h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mosaicResult.imageUrl}
                  alt="Mosaic Preview"
                  className="w-full h-full object-cover rounded"
                />
                <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                  <Link href="/mosaicking">
                    <Button variant="primary" icon={<Grid className="w-4 h-4" />}>
                      View Full Mosaic
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <Grid className="w-8 h-8 text-slate-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-200">No mosaic generated</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Combine multiple overlapping floor images into a composite orthomosaic.
                  </p>
                </div>
                <Link href="/mosaicking">
                  <Button variant="secondary" icon={<Grid className="w-4 h-4" />}>
                    Open Mosaicking
                  </Button>
                </Link>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Activity Timeline */}
      <RecentActivity events={activityEvents} />

      {/* System Diagnostic Status */}
      <SystemStatus />
    </div>
  );
}
