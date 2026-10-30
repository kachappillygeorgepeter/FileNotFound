import React from 'react';
import { formatBytes } from '../../utils/formatters';
import { sanitizeFileName, getFileTypeCategory } from '../../utils/sanitize';

export interface FileStagingListProps {
  files: File[];
  onRemoveFile: (index: number) => void;
  onClearAll: () => void;
  maxTotalBytes?: number;
}

export const FileStagingList: React.FC<FileStagingListProps> = ({
  files,
  onRemoveFile,
  onClearAll,
  maxTotalBytes = 200 * 1024 * 1024,
}) => {
  if (files.length === 0) return null;

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  const percentage = Math.min(100, Math.round((totalBytes / maxTotalBytes) * 100));

  return (
    <div className="w-full text-left space-y-4 border border-[#E5E5E5] bg-white p-6 md:p-8 rounded-none">
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#111111]">
            STAGED FILES ({files.length})
          </span>
          <span className="text-[10px] font-mono text-[#555555]">
            {formatBytes(totalBytes)} / {formatBytes(maxTotalBytes)}
          </span>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#555555] hover:text-[#111111] transition-colors"
        >
          CLEAR ALL
        </button>
      </div>

      <div className="divide-y divide-[#E5E5E5] max-h-60 overflow-y-auto pr-1">
        {files.map((file, idx) => {
          const safeName = sanitizeFileName(file.name);
          const { label } = getFileTypeCategory(file.type, file.name);

          return (
            <div
              key={`${file.name}-${file.size}-${idx}`}
              className="py-3 flex items-center justify-between gap-4 hover:bg-[#F7F7F5] px-2 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#111111] uppercase tracking-wide truncate">
                  {safeName}
                </p>
                <p className="text-[10px] text-[#555555] font-mono tracking-wider mt-0.5">
                  {formatBytes(file.size)} • {label}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onRemoveFile(idx)}
                className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#111111] hover:bg-[#111111] hover:text-white px-3 py-1.5 border border-[#E5E5E5] transition-colors bg-white shrink-0"
              >
                REMOVE
              </button>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-[#E5E5E5] space-y-1.5">
        <div className="flex justify-between text-[10px] font-mono tracking-widest text-[#555555] uppercase">
          <span>Payload Capacity</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full h-1 bg-[#E5E5E5] overflow-hidden">
          <div
            className="h-full bg-[#111111] transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
