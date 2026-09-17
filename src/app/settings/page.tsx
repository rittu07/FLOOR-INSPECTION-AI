'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useInspection } from '@/context/InspectionContext';
import { Settings as SettingsIcon, Camera, Grid, Cpu, Server, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const { settings, updateSettings, checkApiConnection } = useInspection();

  const isOnline = settings.apiStatus === 'online';

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-emerald-400" />
            <span>System Settings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure acquisition hardware, CV algorithm parameters, and AI inference models.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Camera Configuration */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Camera Acquisition Settings</span>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Camera Device
              </label>
              <select
                value={settings.cameraDeviceId}
                onChange={(e) => updateSettings({ cameraDeviceId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-slate-700"
              >
                <option value="default">Default System Webcam (HTML5 MediaDevices)</option>
                <option value="usb-cam-01">USB Industrial Floor Inspection Camera 01</option>
                <option value="usb-cam-02">Wide-Angle Fisheye Lens Camera 02</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Target Resolution
              </label>
              <select
                value={settings.resolution}
                onChange={(e) =>
                  updateSettings({
                    resolution: e.target.value as '1920x1080' | '1280x720' | '640x480',
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-slate-700"
              >
                <option value="1920x1080">1920 x 1080 (Full HD 1080p)</option>
                <option value="1280x720">1280 x 720 (HD 720p - Recommended)</option>
                <option value="640x480">640 x 480 (VGA Low-Latency)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Acquisition Frame Rate (FPS)
              </label>
              <select
                value={settings.fps}
                onChange={(e) => updateSettings({ fps: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-slate-700"
              >
                <option value={60}>60 FPS (High Performance)</option>
                <option value={30}>30 FPS (Standard)</option>
                <option value={15}>15 FPS (Power Saver)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Section 2: Mosaicking Parameters */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-emerald-400" />
              <span>Image Mosaicking Engine</span>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Feature Detector
              </label>
              <select
                value={settings.featureDetector}
                onChange={(e) =>
                  updateSettings({
                    featureDetector: e.target.value as 'ORB' | 'SIFT' | 'AKAZE',
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-slate-700"
              >
                <option value="ORB">ORB (Oriented FAST and Rotated BRIEF)</option>
                <option value="SIFT">SIFT (Scale-Invariant Feature Transform)</option>
                <option value="AKAZE">AKAZE (Accelerated KAZE Descriptors)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Descriptor Matcher
              </label>
              <select
                value={settings.matchingAlgorithm}
                onChange={(e) =>
                  updateSettings({
                    matchingAlgorithm: e.target.value as 'BFMatcher' | 'FlannBased',
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-slate-700"
              >
                <option value="BFMatcher">Brute-Force KNN Matcher (Cross Check)</option>
                <option value="FlannBased">FLANN (Fast Library for Approximate Nearest Neighbors)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-200">Multi-Band Blending</p>
                <p className="text-[11px] text-slate-500">Smooth seam transitions between stitched frames</p>
              </div>
              <input
                type="checkbox"
                checked={settings.blendingEnabled}
                onChange={(e) => updateSettings({ blendingEnabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded bg-slate-950 border-slate-700"
              />
            </div>
          </div>
        </Card>

        {/* Section 3: AI Model Configuration */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>AI Vision Model</span>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Inference Neural Model
              </label>
              <select
                value={settings.aiModel}
                onChange={(e) =>
                  updateSettings({
                    aiModel: e.target.value as 'YOLOv8-Crack-v2' | 'DeepCrack-ResNet' | 'Custom-CV-UNet',
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-slate-700"
              >
                <option value="YOLOv8-Crack-v2">YOLOv8-Crack-v2 (Real-time Industrial Bounding Box)</option>
                <option value="DeepCrack-ResNet">DeepCrack-ResNet (Segmentation Model)</option>
                <option value="Custom-CV-UNet">Custom-CV-UNet (Sub-millimeter Hairline Model)</option>
              </select>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Model Runtime Status</p>
                <p className="text-[11px] font-mono text-slate-400">PyTorch / ONNX Runtime Engine</p>
              </div>
              <Badge variant={isOnline ? 'success' : 'neutral'}>
                {isOnline ? 'Loaded' : 'Not Connected'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Section 4: Backend FastAPI Service Connection */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>FastAPI Backend Connection</span>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Backend API Host URL
              </label>
              <input
                type="text"
                value={settings.backendUrl}
                onChange={(e) => updateSettings({ backendUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-slate-700"
                placeholder="http://localhost:8000"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Configured via NEXT_PUBLIC_API_URL environment variable.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">API Health Telemetry</p>
                <p className="text-[11px] font-mono text-slate-400">{settings.backendUrl}/health</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isOnline ? 'success' : 'warning'} dot={isOnline}>
                  {isOnline ? 'Online' : 'Not Connected'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkApiConnection}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Test
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
