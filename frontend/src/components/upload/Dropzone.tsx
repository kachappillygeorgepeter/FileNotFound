import React, { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud, FilePlus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatBytes } from '../../utils/formatters';

const MAX_SINGLE_FILE_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_FILES_COUNT = 10;

export interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  currentCount: number;
  totalSizeBytes: number;
  maxTotalBytes?: number;
  disabled?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFilesSelected,
  currentCount,
  totalSizeBytes,
  maxTotalBytes = 200 * 1024 * 1024,
  disabled = false,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setErrorMessage(null);

      if (fileRejections.length > 0) {
        const firstErr = fileRejections[0].errors[0];
        if (firstErr.code === 'file-too-large') {
          setErrorMessage(`File exceeds the maximum limit of ${formatBytes(MAX_SINGLE_FILE_BYTES)}.`);
        } else if (firstErr.code === 'too-many-files') {
          setErrorMessage(`You can upload at most ${MAX_FILES_COUNT} files per share.`);
        } else {
          setErrorMessage(firstErr.message);
        }
        return;
      }

      const zeroByteFile = acceptedFiles.find((f) => f.size === 0);
      if (zeroByteFile) {
        setErrorMessage(`"${zeroByteFile.name}" is empty (0 bytes). Empty files are not allowed.`);
        return;
      }

      if (currentCount + acceptedFiles.length > MAX_FILES_COUNT) {
        setErrorMessage(
          `Maximum ${MAX_FILES_COUNT} files allowed. You already selected ${currentCount}.`
        );
        return;
      }

      const newTotalBytes =
        totalSizeBytes + acceptedFiles.reduce((acc, f) => acc + f.size, 0);
      if (newTotalBytes > maxTotalBytes) {
        setErrorMessage(
          `Combined payload would exceed the total limit of ${formatBytes(maxTotalBytes)}.`
        );
        return;
      }

      onFilesSelected(acceptedFiles);
    },
    [currentCount, totalSizeBytes, maxTotalBytes, onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_SINGLE_FILE_BYTES,
    maxFiles: MAX_FILES_COUNT - currentCount,
    disabled: disabled || currentCount >= MAX_FILES_COUNT,
  });

  return (
    <div className="w-full text-left">
      <label className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-2">
        Upload Files
      </label>

      <div
        {...getRootProps()}
        className={cn(
          'w-full border-2 border-dashed border-[#E5E5E5] hover:border-[#111111] transition-colors p-10 sm:p-14 flex flex-col items-center justify-center text-center bg-[#F7F7F5] rounded-none cursor-pointer select-none',
          isDragActive && 'border-[#111111] bg-white',
          (disabled || currentCount >= MAX_FILES_COUNT) && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
      >
        <input {...getInputProps()} />

        <div className="mb-4 text-[#111111]">
          {isDragActive ? (
            <FilePlus className="w-10 h-10 animate-bounce" />
          ) : (
            <UploadCloud className="w-10 h-10 text-[#555555]" />
          )}
        </div>

        <p className="text-sm font-semibold text-[#111111] mb-2 uppercase tracking-wider">
          {isDragActive ? 'Drop files to stage' : 'Drag & Drop files here'}
        </p>

        <p className="text-xs text-[#555555] mb-6 tracking-wide">
          Up to 10 files • 100 MB max per file • 200 MB combined limit
        </p>

        <span className="inline-block bg-[#111111] text-white px-8 py-3.5 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#333333] transition-colors rounded-none border border-[#111111]">
          SELECT FILES
        </span>
      </div>

      {errorMessage && (
        <div className="bg-[#111111] text-white p-4 mt-4 text-xs font-semibold tracking-wide flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-3 font-bold uppercase tracking-[0.2em] text-[10px] bg-white text-[#111111] px-2 py-0.5">
              ERROR
            </span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-white hover:text-[#999999] font-bold text-sm px-2"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
