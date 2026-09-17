'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Camera,
  Grid,
  Scan,
  Map,
  FileCheck,
  Settings,
  Activity,
  X,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInspection } from '@/context/InspectionContext';
import { Badge } from '@/components/ui/Badge';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { settings } = useInspection();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/camera', label: 'Camera', icon: Camera },
    { href: '/mosaicking', label: 'Mosaicking', icon: Grid },
    { href: '/crack-detection', label: 'Crack Detection', icon: Scan },
    { href: '/damage-map', label: 'Damage Map', icon: Map },
    { href: '/results', label: 'Results', icon: FileCheck },
  ];


  const secondaryNavItems = [
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const isOnline = settings.apiStatus === 'online';

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/" className="group block" onClick={onClose}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-mono text-lg font-extrabold shadow-inner group-hover:border-emerald-400 transition-colors">
                <Radio className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
                  FLOOR
                </span>
                <span className="block text-sm font-extrabold text-slate-100 tracking-tight">
                  INSPECTION AI
                </span>
              </div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <div className="px-3 mb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
            Inspection Workflow
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-slate-850 text-white border border-slate-700/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                  )}
                />
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-glow" />
                )}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-6 border-t border-slate-800/80" />

          <div className="px-3 mb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
            System & Config
          </div>
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-slate-850 text-white border border-slate-700/80'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* System Diagnostics Status Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span>Backend API</span>
            </div>
            <Badge variant={isOnline ? 'success' : 'neutral'}>
              {isOnline ? 'Online' : 'Not Connected'}
            </Badge>
          </div>
        </div>
      </aside>
    </>
  );
};
