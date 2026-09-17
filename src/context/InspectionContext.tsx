'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CapturedFrame,
  MosaicResult,
  CrackDetectionResult,
  ActivityEvent,
  SystemSettings,
  InspectionSession,
} from '@/types';
import { checkBackendHealth } from '@/lib/api';

interface InspectionContextType {
  capturedFrames: CapturedFrame[];
  selectedFrameIds: string[];
  mosaicResult: MosaicResult | null;
  mosaicStatus: 'idle' | 'processing' | 'success' | 'error';
  crackResult: CrackDetectionResult | null;
  activityEvents: ActivityEvent[];
  settings: SystemSettings;
  session: InspectionSession;
  
  // Actions
  addCapturedFrame: (frame: Omit<CapturedFrame, 'id' | 'selectedForMosaic'> & { id?: string }) => void;
  deleteCapturedFrame: (id: string) => void;
  clearCapturedFrames: () => void;
  toggleFrameSelection: (id: string) => void;
  selectAllFrames: () => void;
  deselectAllFrames: () => void;
  moveSelectedFrame: (id: string, direction: 'up' | 'down') => void;
  
  setMosaicResult: (result: MosaicResult | null) => void;
  setMosaicStatus: (status: 'idle' | 'processing' | 'success' | 'error') => void;
  setCrackResult: (result: CrackDetectionResult | null) => void;
  
  addActivityEvent: (type: ActivityEvent['type'], message: string, details?: string) => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  checkApiConnection: () => Promise<void>;
}

const defaultSettings: SystemSettings = {
  cameraDeviceId: 'default',
  resolution: '1280x720',
  fps: 30,
  featureDetector: 'ORB',
  matchingAlgorithm: 'BFMatcher',
  blendingEnabled: true,
  aiModel: 'YOLOv8-Crack-v2',
  backendUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  apiStatus: 'offline',
};

const InspectionContext = createContext<InspectionContextType | undefined>(undefined);

export function InspectionProvider({ children }: { children: React.ReactNode }) {
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>([]);
  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>([]);
  const [mosaicResult, setMosaicResult] = useState<MosaicResult | null>(null);
  const [mosaicStatus, setMosaicStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [crackResult, setCrackResult] = useState<CrackDetectionResult | null>(null);
  
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([
    {
      id: 'init-1',
      timestamp: new Date().toISOString(),
      type: 'system_alert',
      message: 'System initialized and ready for inspection session.',
    },
  ]);

  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

  const [session, setSession] = useState<InspectionSession>({
    id: `SESS-${Date.now().toString().slice(-6)}`,
    startTime: new Date().toISOString(),
    framesCapturedCount: 0,
    mosaicStatus: 'Not Generated',
    crackDetectionStatus: 'Not Performed',
    status: 'Ready',
  });

  // Check API health periodically
  const checkApiConnection = async () => {
    const isHealthy = await checkBackendHealth();
    setSettings((prev) => ({
      ...prev,
      apiStatus: isHealthy ? 'online' : 'offline',
    }));
  };

  useEffect(() => {
    checkApiConnection();
    const interval = setInterval(checkApiConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  const addActivityEvent = (type: ActivityEvent['type'], message: string, details?: string) => {
    const newEvent: ActivityEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      details,
    };
    setActivityEvents((prev) => [newEvent, ...prev].slice(0, 50));
  };

  const addCapturedFrame = (frameData: Omit<CapturedFrame, 'id' | 'selectedForMosaic'> & { id?: string }) => {
    const newFrame: CapturedFrame = {
      ...frameData,
      id: frameData.id || `frame-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      selectedForMosaic: true,
    };

    setCapturedFrames((prev) => {
      const updated = [...prev, newFrame];
      setSelectedFrameIds(updated.map((f) => f.id));
      setSession((s) => ({ ...s, framesCapturedCount: updated.length }));
      return updated;
    });

    addActivityEvent('frame_captured', `Frame #${capturedFrames.length + 1} captured from webcam.`, `${frameData.width}x${frameData.height}px`);
  };

  const deleteCapturedFrame = (id: string) => {
    setCapturedFrames((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      setSelectedFrameIds((sel) => sel.filter((sId) => sId !== id));
      setSession((s) => ({ ...s, framesCapturedCount: updated.length }));
      return updated;
    });
  };

  const clearCapturedFrames = () => {
    setCapturedFrames([]);
    setSelectedFrameIds([]);
    setSession((s) => ({ ...s, framesCapturedCount: 0 }));
  };

  const toggleFrameSelection = (id: string) => {
    setSelectedFrameIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFrames = () => {
    setSelectedFrameIds(capturedFrames.map((f) => f.id));
  };

  const deselectAllFrames = () => {
    setSelectedFrameIds([]);
  };

  const moveSelectedFrame = (id: string, direction: 'up' | 'down') => {
    setSelectedFrameIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const newArr = [...prev];
      const temp = newArr[idx];
      newArr[idx] = newArr[targetIdx];
      newArr[targetIdx] = temp;
      return newArr;
    });
  };

  const handleSetMosaicResult = (result: MosaicResult | null) => {
    setMosaicResult(result);
    if (result) {
      setSession((s) => ({ ...s, mosaicStatus: 'Generated' }));
      addActivityEvent('mosaic_generated', 'Floor mosaic successfully stitched.', `${result.stats.imagesUsedCount} images combined.`);
    }
  };

  const handleSetCrackResult = (result: CrackDetectionResult | null) => {
    setCrackResult(result);
    if (result) {
      setSession((s) => ({ ...s, crackDetectionStatus: 'Completed' }));
      addActivityEvent('crack_detected', 'AI Crack Detection complete.', `Detected ${result.crackCount ?? 0} cracks.`);
    }
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <InspectionContext.Provider
      value={{
        capturedFrames,
        selectedFrameIds,
        mosaicResult,
        mosaicStatus,
        crackResult,
        activityEvents,
        settings,
        session,
        addCapturedFrame,
        deleteCapturedFrame,
        clearCapturedFrames,
        toggleFrameSelection,
        selectAllFrames,
        deselectAllFrames,
        moveSelectedFrame,
        setMosaicResult: handleSetMosaicResult,
        setMosaicStatus,
        setCrackResult: handleSetCrackResult,
        addActivityEvent,
        updateSettings,
        checkApiConnection,
      }}
    >
      {children}
    </InspectionContext.Provider>
  );
}

export function useInspection() {
  const context = useContext(InspectionContext);
  if (!context) {
    throw new Error('useInspection must be used within an InspectionProvider');
  }
  return context;
}
