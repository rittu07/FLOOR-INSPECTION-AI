import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  icon: React.ReactNode;
  iconBgColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  badgeText,
  badgeVariant = 'neutral',
  icon,
  iconBgColor = 'bg-slate-800 text-slate-300 border-slate-700',
}) => {
  return (
    <Card className="hover:border-slate-700/80 transition-all duration-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-100 tracking-tight">
              {value}
            </span>
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>

        <div className={cn('p-2.5 rounded-lg border flex items-center justify-center shrink-0', iconBgColor)}>
          {icon}
        </div>
      </div>

      {badgeText && (
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">Status</span>
          <Badge variant={badgeVariant}>{badgeText}</Badge>
        </div>
      )}
    </Card>
  );
};
