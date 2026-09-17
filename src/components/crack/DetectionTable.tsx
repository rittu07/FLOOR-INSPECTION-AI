import React from 'react';
import { Card } from '@/components/ui/Card';
import { CrackDetectionItem } from '@/types';
import { Table, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface DetectionTableProps {
  detections?: CrackDetectionItem[];
}

export const DetectionTable: React.FC<DetectionTableProps> = ({ detections = [] }) => {
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-emerald-400" />
          <span>Detected Crack Manifest</span>
        </div>
      }
    >
      {detections.length === 0 ? (
        <div className="py-8 text-center text-slate-500 space-y-1">
          <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto opacity-40 mb-2" />
          <p className="text-sm font-medium">No detections available.</p>
          <p className="text-xs text-slate-600 font-mono">
            Execute AI Crack Detection to populate bounding box coordinate telemetry.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Class Label</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Bounding Box [X, Y, W, H]</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {detections.map((det) => (
                <tr key={det.id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-200">{det.id}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant="error">{det.label}</Badge>
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">
                    {(det.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    [{det.box.x}, {det.box.y}, {det.box.width}, {det.box.height}]
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
