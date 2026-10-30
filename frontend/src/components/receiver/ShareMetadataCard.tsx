import React from 'react';
import { ShareMetadata } from '../../types/share';
import { formatDate } from '../../utils/formatters';
import { LiveCountdown } from './LiveCountdown';

export interface ShareMetadataCardProps {
  metadata: ShareMetadata;
  onExpire?: () => void;
}

export const ShareMetadataCard: React.FC<ShareMetadataCardProps> = ({ metadata, onExpire }) => {
  const downloadsRemaining = metadata.downloadsRemaining ?? 1;
  const maxDownloads = metadata.maxDownloads ?? 1;
  const isLastDownload = downloadsRemaining === 1;

  return (
    <div className="border border-[#E5E5E5] bg-white p-8 md:p-10 text-left shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-[#111111] mb-1">
            AUTHORIZED RECIPIENT SESSION
          </p>
          <h2 className="text-2xl font-extrabold text-[#111111] uppercase tracking-tight">
            Shared File Package
          </h2>
        </div>

        {metadata.expiresAt && (
          <LiveCountdown expiresAtIso={metadata.expiresAt} onExpire={onExpire} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <span className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-1">
            DOWNLOAD QUOTA
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#111111]">
              {downloadsRemaining} OF {maxDownloads} REMAINING
            </span>
          </div>
          {isLastDownload && (
            <p className="text-[10px] font-bold tracking-wider text-red-600 mt-1 uppercase">
              FINAL DOWNLOAD BEFORE DELETION
            </p>
          )}
        </div>

        <div>
          <span className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-1">
            HARD EXPIRY
          </span>
          <p className="text-sm font-bold text-[#111111] font-mono">
            {formatDate(metadata.expiresAt)}
          </p>
        </div>

        <div>
          <span className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-1">
            TOTAL FILES
          </span>
          <p className="text-sm font-bold text-[#111111]">
            {metadata.files?.length || 0} {(metadata.files?.length || 0) === 1 ? 'FILE' : 'FILES'}
          </p>
        </div>
      </div>
    </div>
  );
};
