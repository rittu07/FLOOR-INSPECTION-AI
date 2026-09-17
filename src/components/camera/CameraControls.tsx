import React, { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Play, Square, Camera, Upload } from 'lucide-react';
import { CameraState } from './CameraViewer';

interface CameraControlsProps {
  cameraState: CameraState;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onCaptureFrame: () => void;
  onUploadImages: (files: FileList) => void;
  isCapturing?: boolean;
  isUploading?: boolean;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  cameraState,
  onStartCamera,
  onStopCamera,
  onCaptureFrame,
  onUploadImages,
  isCapturing = false,
  isUploading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isReady = cameraState === 'ready';
  const isStarting = cameraState === 'starting';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadImages(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-lg">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

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

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          isLoading={isUploading}
          icon={<Upload className="w-4 h-4 text-emerald-400" />}
          className="border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800 text-slate-200"
        >
          Upload Image(s)
        </Button>

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
    </div>
  );
};

