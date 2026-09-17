import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  title,
  subtitle,
  action,
  footer,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-slate-900/90 border border-slate-800 rounded-lg shadow-md backdrop-blur-sm overflow-hidden flex flex-col',
        className
      )}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between gap-4 shrink-0">
          <div>
            {title && typeof title === 'string' ? (
              <h3 className="text-base font-semibold text-slate-100 tracking-tight">{title}</h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className="p-5 flex-1">{children}</div>

      {footer && (
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
          {footer}
        </div>
      )}
    </div>
  );
};
