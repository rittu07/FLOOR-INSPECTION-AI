import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useInspection } from '@/context/InspectionContext';
import { Camera, Cpu, Server, Layers } from 'lucide-react';

export const SystemStatus: React.FC = () => {
  const { settings, capturedFrames, mosaicResult } = useInspection();

  const isOnline = settings.apiStatus === 'online';

  const statusItems: Array<{
    name: string;
    desc: string;
    icon: typeof Camera;
    status: string;
    variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  }> = [
    {
      name: 'Webcam Acquisition',
      desc: capturedFrames.length > 0 ? `${capturedFrames.length} frames ready` : 'Camera ready',
      icon: Camera,
      status: 'Ready',
      variant: 'info',
    },
    {
      name: 'Mosaicking Engine',
      desc: settings.featureDetector + ' + ' + settings.matchingAlgorithm,
      icon: Layers,
      status: mosaicResult ? 'Mosaic Active' : 'Idle',
      variant: mosaicResult ? 'success' : 'neutral',
    },
    {
      name: 'AI Model Service',
      desc: settings.aiModel,
      icon: Cpu,
      status: 'Loaded',
      variant: 'success',
    },
    {
      name: 'FastAPI Backend Endpoint',
      desc: settings.backendUrl,
      icon: Server,
      status: isOnline ? 'Online' : 'Not Connected',
      variant: isOnline ? 'success' : 'warning',
    },
  ];

  return (
    <Card title="System Diagnostic Status" subtitle="Computer vision system health and service telemetry">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statusItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                className="p-3.5 rounded-lg bg-slate-950/50 border border-slate-800/80 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <Badge variant={item.variant} dot={item.variant === 'success'}>
                    {item.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">{item.name}</p>
                  <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Software Pipeline Roadmap */}
        <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/60">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Inspection Pipeline Architecture Roadmap
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
            <div className="p-2 rounded bg-slate-900/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-between font-mono">
              <span>CAMERA</span>
              <span className="font-bold">✓</span>
            </div>
            <div className="p-2 rounded bg-slate-900/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-between font-mono">
              <span>CAPTURE</span>
              <span className="font-bold">✓</span>
            </div>
            <div className="p-2 rounded bg-slate-900/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-between font-mono">
              <span>MOSAIC</span>
              <span className="font-bold">✓</span>
            </div>
            <div className="p-2 rounded bg-slate-900/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-between font-mono">
              <span>CRACK AI</span>
              <span className="font-bold">✓</span>
            </div>
            <div className="p-2 rounded bg-slate-900/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-between font-mono">
              <span>LOCALIZATION</span>
              <span className="font-bold">✓</span>
            </div>
            <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500 text-emerald-300 flex items-center justify-between font-mono font-bold">
              <span>DAMAGE MAP</span>
              <span className="animate-pulse">✓ Active</span>
            </div>
            <div className="p-2 rounded bg-slate-900/40 border border-slate-800 text-slate-500 flex items-center justify-between font-mono">
              <span>AMR</span>
              <span>○ Next</span>
            </div>
          </div>

        </div>
      </div>
    </Card>

  );
};
