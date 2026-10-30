import React from 'react';
import { UploadProgress } from '../../types/share';
import { formatBytes, formatSpeed } from '../../utils/formatters';
import { Button } from '../ui/Button';

export interface UploadProgressModalProps {
  isOpen: boolean;
  progress: UploadProgress;
  onCancel: () => void;
}

export const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  isOpen,
  progress,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-[#E5E5E5] p-8 md:p-10 text-center space-y-6 shadow-2xl rounded-none">
        <div className="space-y-2">
          <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-[#111111]">
            TRANSFERRING
          </p>
          <h3 className="text-2xl font-extrabold text-[#111111] uppercase tracking-tight">
            Uploading Files
          </h3>
          <p className="text-xs text-[#555555]">
            Encrypting and streaming directly to private storage...
          </p>
        </div>

        <div className="space-y-3 py-2">
          <div className="text-5xl font-extrabold text-[#111111] tracking-tight">
            {progress.percentage}%
          </div>

          <div className="w-full h-1.5 bg-[#E5E5E5] overflow-hidden">
            <div
              className="h-full bg-[#111111] transition-all duration-200"
              style={{ width: `${Math.max(2, progress.percentage)}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono text-[#555555]">
            <span>
              {formatBytes(progress.loaded)} of {formatBytes(progress.total)}
            </span>
            <span>{formatSpeed(progress.speedBytesPerSec)}</span>
          </div>
        </div>

        <div>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel Upload
          </Button>
        </div>
      </div>
    </div>
  );
};
