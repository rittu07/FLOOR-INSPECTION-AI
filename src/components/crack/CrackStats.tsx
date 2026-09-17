import React from 'react';
import { Card } from '@/components/ui/Card';
import { CrackDetectionResult } from '@/types';
import { ShieldAlert } from 'lucide-react';

interface CrackStatsProps {
  crackResult: CrackDetectionResult | null;
}

export const CrackStats: React.FC<CrackStatsProps> = ({ crackResult }) => {
  const items = [
    {
      label: 'Cracks Detected',
      value: crackResult?.crackCount !== null && crackResult?.crackCount !== undefined ? crackResult.crackCount : '--',
      color: crackResult && (crackResult.crackCount ?? 0) > 0 ? 'text-rose-400' : 'text-slate-100',
    },
    {
      label: 'Average Confidence',
      value: crackResult?.avgConfidence !== null && crackResult?.avgConfidence !== undefined ? `${(crackResult.avgConfidence * 100).toFixed(1)}%` : '--',
      color: 'text-slate-100',
    },
    {
      label: 'Highest Confidence',
      value: crackResult?.highestConfidence !== null && crackResult?.highestConfidence !== undefined ? `${(crackResult.highestConfidence * 100).toFixed(1)}%` : '--',
      color: 'text-slate-100',
    },
    {
      label: 'Processing Time',
      value: crackResult?.processingTimeMs !== null && crackResult?.processingTimeMs !== undefined ? `${crackResult.processingTimeMs} ms` : '--',
      color: 'text-slate-100',
    },
  ];

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
          <span>Crack Detection Statistics</span>
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col justify-between"
          >
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              {item.label}
            </span>
            <span className={`mt-2 text-xl font-bold font-mono ${item.color}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
