import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Progress } from '@/components/ui/Progress';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

export interface StepState {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface MosaicProgressProps {
  isOpen: boolean;
  steps: StepState[];
  currentStepIndex: number;
}

export const MosaicProgress: React.FC<MosaicProgressProps> = ({
  isOpen,
  steps,
  currentStepIndex,
}) => {
  const percent = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  return (
    <Modal isOpen={isOpen} title="Generating Floor Mosaic">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300">Stitching Pipeline Progress</span>
            <span className="text-emerald-400 font-bold">{percent}%</span>
          </div>
          <Progress value={percent} />
        </div>

        <div className="space-y-3 bg-slate-950/60 p-4 rounded-lg border border-slate-800">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : step.status === 'processing' ? (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                )}
                <span
                  className={
                    step.status === 'completed'
                      ? 'text-slate-200 font-medium'
                      : step.status === 'processing'
                      ? 'text-amber-300 font-semibold'
                      : 'text-slate-500'
                  }
                >
                  {step.label}
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-500 uppercase">
                {step.status}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center font-mono">
          Simulating homography computation & OpenCV multi-band blending...
        </p>
      </div>
    </Modal>
  );
};
