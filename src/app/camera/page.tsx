'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { CameraViewer, CameraState } from '@/components/camera/CameraViewer';
import { CameraControls } from '@/components/camera/CameraControls';
import { CapturedFrames } from '@/components/camera/CapturedFrames';
import { useInspection } from '@/context/InspectionContext';
import { captureFrameApi } from '@/lib/api';
import { Camera as CameraIcon } from 'lucide-react';

export default function CameraPage() {
  const { addCapturedFrame, addActivityEvent } = useInspection();
  const [cameraState, setCameraState] = useState<CameraState>('offline');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop media stream tracks
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('offline');
    setErrorMessage('');
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Start HTML5 webcam stream
  const startCameraStream = async () => {
    setCameraState('starting');
    setErrorMessage('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam mediaDevices API is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment', // Prefer rear/floor inspection camera if available
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState('ready');
      addActivityEvent('camera_started', 'Webcam preview stream started successfully.');
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      const msg = err instanceof Error ? err.message : 'Permission denied or no webcam available.';
      setCameraState('error');
      setErrorMessage(msg);
      addActivityEvent('system_alert', 'Camera error encountered.', msg);
    }
  };

  const handleStopCamera = () => {
    stopCameraStream();
    addActivityEvent('camera_stopped', 'Webcam stream stopped by user.');
  };

  // Capture frame using hidden canvas element and upload to FastAPI backend
  const captureFrameFromCanvas = async () => {
    if (cameraState !== 'ready' || !videoRef.current) return;

    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    canvas.toBlob(async (blob) => {
      let frameId: string | undefined = undefined;
      let frameUrl = dataUrl;

      if (blob) {
        const { data: uploadData } = await captureFrameApi(blob, `frame_${Date.now()}.jpg`);
        if (uploadData) {
          frameId = uploadData.id;
          frameUrl = uploadData.url;
        }
      }

      addCapturedFrame({
        id: frameId,
        timestamp: new Date().toISOString(),
        dataUrl: frameUrl,
        width: canvas.width,
        height: canvas.height,
      });

      setTimeout(() => {
        setIsCapturing(false);
      }, 300);
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CameraIcon className="w-5 h-5 text-emerald-400" />
            <span>Camera Acquisition</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Capture floor images using the connected webcam.
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Live Camera Viewer & Controls */}
        <div className="lg:col-span-7 space-y-4">
          <Card
            title={
              <div className="flex items-center gap-2">
                <CameraIcon className="w-4 h-4 text-emerald-400" />
                <span>Live Camera Viewfinder</span>
              </div>
            }
          >
            <div className="space-y-4">
              <CameraViewer
                cameraState={cameraState}
                errorMessage={errorMessage}
                videoRef={videoRef}
                isCapturing={isCapturing}
              />

              <CameraControls
                cameraState={cameraState}
                onStartCamera={startCameraStream}
                onStopCamera={handleStopCamera}
                onCaptureFrame={captureFrameFromCanvas}
                isCapturing={isCapturing}
              />
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Instructions & Quick Stats */}
        <div className="lg:col-span-5 space-y-4">
          <Card title="Acquisition Protocol" subtitle="Best practices for quality floor mosaicking">
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1">
                <p className="font-semibold text-emerald-400">1. Maintain Fixed Distance</p>
                <p className="text-slate-400">Keep camera height perpendicular to the floor surface.</p>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1">
                <p className="font-semibold text-emerald-400">2. Ensure 30-50% Overlap</p>
                <p className="text-slate-400">Overlap consecutive frame captures so ORB feature matching can estimate homography matrices.</p>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1">
                <p className="font-semibold text-emerald-400">3. Avoid Motion Blur</p>
                <p className="text-slate-400">Hold steady during each frame capture trigger.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Captured Frames Gallery */}
      <CapturedFrames />
    </div>
  );
}
