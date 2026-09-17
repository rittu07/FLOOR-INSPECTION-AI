import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number; // 0 to 100
  className?: string;
  barClassName?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  className,
  barClassName,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn('w-full bg-slate-800 rounded-full h-2 overflow-hidden', className)}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('bg-emerald-500 h-full transition-all duration-300 ease-out', barClassName)}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
};
