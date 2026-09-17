'use client';

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useInspection } from '@/context/InspectionContext';
import { Upload, Scan, Image as ImageIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CrackInputProps {
  selectedImage: string | null;
  onSelectImage: (dataUrl: string) => void;
  onRunDetection: () => void;
  isProcessing: boolean;
}

export const CrackInput: React.FC<CrackInputProps> = ({
  selectedImage,
  onSelectImage,
  onRunDetection,
  isProcessing,
}) => {
  const { capturedFrames, mosaicResult } = useInspection();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'frames' | 'mosaic'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onSelectImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-emerald-400" />
          <span>Input Floor Image</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Input source selector tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('upload')}
            className={cn(
              'py-1.5 px-2 rounded-md font-medium transition-colors text-center',
              activeTab === 'upload' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Upload Image
          </button>
          <button
            onClick={() => setActiveTab('frames')}
            className={cn(
              'py-1.5 px-2 rounded-md font-medium transition-colors text-center',
              activeTab === 'frames' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Captured ({capturedFrames.length})
          </button>
          <button
            onClick={() => setActiveTab('mosaic')}
            className={cn(
              'py-1.5 px-2 rounded-md font-medium transition-colors text-center',
              activeTab === 'mosaic' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Mosaic
          </button>
        </div>

        {/* Tab 1: File Upload Dropzone */}
        {activeTab === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-lg p-6 text-center cursor-pointer transition-colors bg-slate-950/40"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-200">
              Click to upload floor inspection image
            </p>
            <p className="text-[11px] text-slate-500 mt-1">PNG, JPG, WEBP up to 20MB</p>
          </div>
        )}

        {/* Tab 2: Select from captured frames */}
        {activeTab === 'frames' && (
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {capturedFrames.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                No frames captured yet in Camera page.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {capturedFrames.map((frame, idx) => (
                  <div
                    key={frame.id}
                    onClick={() => onSelectImage(frame.dataUrl)}
                    className={cn(
                      'relative aspect-video rounded border overflow-hidden cursor-pointer group',
                      selectedImage === frame.dataUrl ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-800 hover:border-slate-700'
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={frame.dataUrl} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
                    {selectedImage === frame.dataUrl && (
                      <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Select generated mosaic */}
        {activeTab === 'mosaic' && (
          <div>
            {mosaicResult ? (
              <div
                onClick={() => onSelectImage(mosaicResult.imageUrl)}
                className={cn(
                  'relative aspect-video rounded border overflow-hidden cursor-pointer',
                  selectedImage === mosaicResult.imageUrl ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-800'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mosaicResult.imageUrl} alt="Mosaic preview" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 text-[10px] font-mono bg-slate-950/80 px-2 py-0.5 rounded text-emerald-400">
                  Select Full Mosaic
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">
                No mosaic generated yet in Mosaicking page.
              </p>
            )}
          </div>
        )}

        {/* Selected Image Preview Area */}
        {selectedImage && (
          <div className="space-y-3 pt-2">
            <div className="relative aspect-video bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedImage} alt="Selected floor preview" className="w-full h-full object-contain" />
              <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/80 border border-slate-700 rounded text-[10px] font-mono text-slate-300">
                INPUT IMAGE READY
              </span>
            </div>

            <Button
              variant="primary"
              className="w-full py-3"
              onClick={onRunDetection}
              isLoading={isProcessing}
              icon={<Scan className="w-4 h-4" />}
            >
              Run Crack Detection
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
