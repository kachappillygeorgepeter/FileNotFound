import React, { useState } from 'react';
import { Download, Archive } from 'lucide-react';
import { FileMetadata } from '../../types/share';
import { formatBytes } from '../../utils/formatters';
import { sanitizeFileName, getFileTypeCategory } from '../../utils/sanitize';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export interface DownloadFileListProps {
  files: FileMetadata[];
  onDownloadSingle: (fileId: string, fileName: string) => Promise<void>;
  onDownloadAllZip: () => Promise<void>;
  isDownloading: boolean;
  downloadsRemaining: number;
}

export const DownloadFileList: React.FC<DownloadFileListProps> = ({
  files,
  onDownloadSingle,
  onDownloadAllZip,
  isDownloading,
  downloadsRemaining,
}) => {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    { type: 'single'; fileId: string; fileName: string } | { type: 'zip' } | null
  >(null);

  const totalBytes = files.reduce((acc, f) => acc + Number(f.sizeBytes || 0), 0);

  const handleInitiateSingle = (fileId: string, fileName: string) => {
    setPendingAction({ type: 'single', fileId, fileName });
    setConfirmModalOpen(true);
  };

  const handleInitiateZip = () => {
    setPendingAction({ type: 'zip' });
    setConfirmModalOpen(true);
  };

  const handleConfirmDownload = async () => {
    if (!pendingAction) return;
    setConfirmModalOpen(false);

    if (pendingAction.type === 'single') {
      await onDownloadSingle(pendingAction.fileId, pendingAction.fileName);
    } else {
      await onDownloadAllZip();
    }
    setPendingAction(null);
  };

  return (
    <div className="w-full space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.25em] mb-2 uppercase text-[#555555]">
            Verified Files
          </p>
          <h3 className="text-2xl font-extrabold text-[#111111] uppercase tracking-tight">
            Package Contents ({files.length})
          </h3>
          <p className="text-xs text-[#555555] font-mono mt-1">
            Total transfer size: {formatBytes(totalBytes)}
          </p>
        </div>

        {files.length > 1 && (
          <Button
            variant="secondary"
            size="md"
            onClick={handleInitiateZip}
            isLoading={isDownloading && pendingAction?.type === 'zip'}
            disabled={isDownloading || downloadsRemaining <= 0}
            leftIcon={<Archive className="w-3.5 h-3.5" />}
          >
            DOWNLOAD ALL AS ZIP
          </Button>
        )}
      </div>

      {/* Files List */}
      <div className="border border-[#E5E5E5] bg-white divide-y divide-[#E5E5E5]">
        {files.map((file) => {
          const safeName = sanitizeFileName(file.originalName);
          const { label } = getFileTypeCategory(file.mimeType, file.originalName);

          return (
            <div
              key={file.id}
              className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F7F7F5] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <span className="inline-block text-[9px] font-bold tracking-[0.2em] uppercase bg-[#F7F7F5] border border-[#E5E5E5] px-2 py-0.5 text-[#555555] mb-2">
                  {label}
                </span>
                <h4 className="text-base font-bold text-[#111111] uppercase tracking-wide truncate max-w-md">
                  {safeName}
                </h4>
                <p className="text-xs text-[#555555] font-mono mt-1">
                  {formatBytes(file.sizeBytes)}
                </p>
              </div>

              <Button
                variant={files.length === 1 ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleInitiateSingle(file.id, safeName)}
                isLoading={
                  isDownloading &&
                  pendingAction?.type === 'single' &&
                  pendingAction.fileId === file.id
                }
                disabled={isDownloading || downloadsRemaining <= 0}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                className="shrink-0 self-start sm:self-auto"
              >
                DOWNLOAD FILE
              </Button>
            </div>
          );
        })}
      </div>

      {/* Atomic Reservation Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Download"
        description="Downloading consumes 1 allocation from your quota."
      >
        <div className="space-y-6 text-left">
          <div className="p-4 border border-[#E5E5E5] bg-[#F7F7F5] text-xs text-[#555555] leading-relaxed">
            <strong className="text-[#111111] uppercase block mb-1">
              Atomic Quota Notice:
            </strong>
            Initiating this download stream will immediately decrement 1 download slot from the
            remaining quota ({downloadsRemaining} remaining). Ensure your network connection is stable.
          </div>

          <div>
            <span className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-1">
              Selected Item:
            </span>
            <p className="text-sm font-bold text-[#111111] font-mono">
              {pendingAction?.type === 'zip'
                ? `Complete Package (${files.length} files as ZIP archive)`
                : pendingAction?.fileName}
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-[#E5E5E5]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmModalOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDownload}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              AUTHORIZE & DOWNLOAD
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
