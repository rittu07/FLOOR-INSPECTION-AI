'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { CameraViewer, CameraState } from '@/components/camera/CameraViewer';
import { CameraControls } from '@/components/camera/CameraControls';
import { CapturedFrames } from '@/components/camera/CapturedFrames';
import { useInspection } from '@/context/InspectionContext';
import { captureFrameApi } from '@/lib/api';
import { Camera as CameraIcon, UploadCloud, FileImage } from 'lucide-react';

export default function CameraPage() {
  const { addCapturedFrame, addActivityEvent } = useInspection();
  const [cameraState, setCameraState] = useState<CameraState>('offline');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dropInputRef = useRef<HTMLInputElement | null>(null);

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

  // Process uploaded image files from local disk
  const handleUploadImages = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    const fileArray = Array.from(files).filter((file) => file.type.startsWith('image/'));

    if (fileArray.length === 0) {
      setErrorMessage('Please select valid image files (.jpg, .png, .webp)');
      setIsUploading(false);
      return;
    }

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth || 1280, height: img.naturalHeight || 720 });
          img.onerror = () => resolve({ width: 1280, height: 720 });
          img.src = dataUrl;
        });

        let frameId: string | undefined = undefined;
        let frameUrl = dataUrl;

        // Upload to backend static storage
        const { data: uploadData } = await captureFrameApi(file, file.name);
        if (uploadData) {
          frameId = uploadData.id;
          frameUrl = uploadData.url;
        }

        addCapturedFrame({
          id: frameId,
          timestamp: new Date().toISOString(),
          dataUrl: frameUrl,
          width: dimensions.width,
          height: dimensions.height,
        });

        addActivityEvent(
          'frame_captured',
          `Uploaded image frame "${file.name}" to session.`,
          `${dimensions.width}x${dimensions.height}px`
        );
      } catch (err) {
        console.error('Image upload error:', err);
      }
    }

    setIsUploading(false);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadImages(e.dataTransfer.files);
    }
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
            <span>Camera Acquisition & Image Upload</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Capture floor images using live webcam or upload local image files for mosaicking & crack detection.
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
                onUploadImages={handleUploadImages}
                isCapturing={isCapturing}
                isUploading={isUploading}
              />
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Direct File Upload & Acquisition Protocol */}
        <div className="lg:col-span-5 space-y-4">
          <Card
            title={
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span>Upload Floor Images</span>
              </div>
            }
            subtitle="Add pre-captured floor photos from local disk"
          >
            <input
              ref={dropInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleUploadImages(e.target.files);
                e.target.value = '';
              }}
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => dropInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-500/10'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/60'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center mb-3">
                <FileImage className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-slate-200">
                {isUploading ? 'Uploading & Processing...' : 'Click or Drag & Drop floor images'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports JPG, PNG, WEBP (Select multiple files at once)
              </p>
            </div>
          </Card>

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

