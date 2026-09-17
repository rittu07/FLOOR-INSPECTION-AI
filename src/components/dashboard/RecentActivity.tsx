import React from 'react';
import { Card } from '@/components/ui/Card';
import { ActivityEvent } from '@/types';
import { formatDate } from '@/lib/utils';
import { Camera, Grid, Scan, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RecentActivityProps {
  events: ActivityEvent[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ events }) => {
  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'camera_started':
      case 'camera_stopped':
      case 'frame_captured':
        return <Camera className="w-3.5 h-3.5 text-cyan-400" />;
      case 'mosaic_generated':
        return <Grid className="w-3.5 h-3.5 text-emerald-400" />;
      case 'crack_detected':
        return <Scan className="w-3.5 h-3.5 text-amber-400" />;
      case 'system_alert':
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <Card
      title="Recent Activity"
      subtitle="Inspection timeline events and system diagnostic logs"
    >
      {events.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-sm">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
          <p>No inspection activity yet.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-800">
          {events.slice(0, 8).map((evt) => (
            <div key={evt.id} className="relative flex items-start justify-between gap-4 text-xs">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                {getEventIcon(evt.type)}
              </div>
              <div>
                <p className="font-medium text-slate-200">{evt.message}</p>
                {evt.details && (
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{evt.details}</p>
                )}
              </div>
              <span className="shrink-0 font-mono text-[10px] text-slate-400">
                {formatDate(evt.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
