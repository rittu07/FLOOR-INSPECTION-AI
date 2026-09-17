'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { MosaicResult } from '@/types';
import { BarChart3, CheckCircle2, Table } from 'lucide-react';

interface MosaicStatsProps {
  mosaicResult: MosaicResult | null;
  selectedCount: number;
}

export const MosaicStats: React.FC<MosaicStatsProps> = ({
  mosaicResult,
  selectedCount,
}) => {
  const stats = mosaicResult?.stats;
  const steps = stats?.steps || [];

  const summaryItems = [
    {
      label: 'Total Images Used',
      value: stats ? (stats.totalImages ?? stats.imagesUsedCount) : selectedCount > 0 ? selectedCount : '--',
    },
    {
      label: 'Successful Steps',
      value: stats?.successfulPairs !== undefined ? `${stats.successfulPairs} / ${steps.length}` : (stats ? '1 / 1' : '--'),
    },
    {
      label: 'Avg Inlier Ratio',
      value: stats?.averageInlierRatio !== undefined && stats?.averageInlierRatio !== null
        ? `${(stats.averageInlierRatio * 100).toFixed(1)}%`
        : (stats?.featureMatches && stats?.inliersCount)
        ? `${((stats.inliersCount / stats.featureMatches) * 100).toFixed(1)}%`
        : '--',
    },
    {
      label: 'Total Processing Time',
      value: stats?.processingTimeMs !== null && stats?.processingTimeMs !== undefined
        ? `${(stats.processingTimeMs / 1000).toFixed(2)}s`
        : '--',
    },
  ];

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span>Mosaicking Statistics & Telemetry</span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col justify-between"
            >
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                {item.label}
              </span>
              <span className="mt-2 text-xl font-bold font-mono text-slate-100">
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Per-step Telemetry Breakdown Table */}
        {steps.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Table className="w-3.5 h-3.5 text-emerald-400" />
                Sequential Step Telemetry Breakdown
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                {steps.length} sequential pairs processed
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Step</th>
                    <th className="px-3 py-2.5">Base Image</th>
                    <th className="px-3 py-2.5">New Image</th>
                    <th className="px-3 py-2.5 text-right">Good Matches</th>
                    <th className="px-3 py-2.5 text-right">Inliers</th>
                    <th className="px-3 py-2.5 text-right">Inlier Ratio</th>
                    <th className="px-3 py-2.5 text-right">Step Time</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-200">
                  {steps.map((step) => (
                    <tr key={step.step} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2.5 font-bold text-emerald-400">
                        #{step.step}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300 max-w-[120px] truncate" title={step.baseImage}>
                        {step.baseImage}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300 max-w-[120px] truncate" title={step.newImage}>
                        {step.newImage}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-100 font-semibold">
                        {step.goodMatches}
                      </td>
                      <td className="px-3 py-2.5 text-right text-emerald-300">
                        {step.inliers}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-300">
                        {(step.inlierRatio * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-400">
                        {step.processingTimeSeconds.toFixed(2)}s
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          {step.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

