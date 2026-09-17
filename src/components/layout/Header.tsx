'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Bell, User, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useInspection } from '@/context/InspectionContext';

interface HeaderProps {
  onMenuClick: () => void;
}

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'AI-powered floor image acquisition, mosaicking and crack detection' },
  '/camera': { title: 'Camera Acquisition', subtitle: 'Capture floor images using the connected webcam' },
  '/mosaicking': { title: 'Image Mosaicking', subtitle: 'Combine captured floor images into a single floor mosaic' },
  '/crack-detection': { title: 'AI Crack Detection', subtitle: 'Detect floor cracks using an AI vision model' },
  '/damage-map': { title: 'Digital Damage Map', subtitle: 'Crack localization & homography transformation on floor orthomosaic' },
  '/results': { title: 'Inspection Results', subtitle: 'Unified floor inspection metrics and analytics report' },
  '/settings': { title: 'Settings', subtitle: 'Configure acquisition device, CV algorithm, and AI model parameters' },
};


export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const pathname = usePathname();
  const { settings } = useInspection();

  const pageInfo = pageTitles[pathname] || {
    title: 'Floor Inspection AI',
    subtitle: 'AI-Powered Floor Inspection & Computer Vision',
  };

  const isOnline = settings.apiStatus === 'online';

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile Menu Trigger + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-slate-400 hover:text-white p-2 rounded-md hover:bg-slate-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <span>{pageInfo.title}</span>
          </h1>
          {pageInfo.subtitle && (
            <p className="hidden sm:block text-xs text-slate-400 font-normal">
              {pageInfo.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: System Status Indicator, Notifications, User */}
      <div className="flex items-center gap-3">
        {/* System Online Badge */}
        <div className="flex items-center gap-2">
          <Badge variant={isOnline ? 'success' : 'neutral'} dot={isOnline}>
            {isOnline ? 'System Online' : 'System Standby'}
          </Badge>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* Model info indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/60 border border-slate-700/50 text-[11px] font-mono text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span>{settings.aiModel}</span>
        </div>

        {/* Notification Icon */}
        <button
          className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
        </button>

        {/* Profile Badge */}
        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shadow-sm cursor-default">
          <User className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </header>
  );
};
