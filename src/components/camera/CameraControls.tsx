import React from 'react';
import { Button } from '@/components/ui/Button';
import { Play, Square, Camera } from 'lucide-react';
import { CameraState } from './CameraViewer';

interface CameraControlsProps {
  cameraState: CameraState;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onCaptureFrame: () => void;
  isCapturing?: boolean;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  cameraState,
  onStartCamera,
  onStopCamera,
  onCaptureFrame,
  isCapturing = false,
}) => {
  const isReady = cameraState === 'ready';
  const isStarting = cameraState === 'starting';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-lg">
      <div className="flex items-center gap-2">
        {!isReady ? (
          <Button
            variant="primary"
            onClick={onStartCamera}
            isLoading={isStarting}
            icon={<Play className="w-4 h-4 fill-current" />}
          >
            Start Camera
          </Button>
        ) : (
          <Button
            variant="danger"
            onClick={onStopCamera}
            icon={<Square className="w-4 h-4 fill-current" />}
          >
            Stop Camera
          </Button>
        )}
      </div>

      <Button
        variant="secondary"
        onClick={onCaptureFrame}
        disabled={!isReady}
        isLoading={isCapturing}
        icon={<Camera className="w-4 h-4" />}
        className={isReady ? 'border-emerald-500/50 hover:border-emerald-400 text-emerald-300' : ''}
      >
        Capture Frame
      </Button>
    </div>
  );
};
