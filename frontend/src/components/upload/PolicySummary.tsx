import React from 'react';
import { ExpiryOption, MaxDownloadsOption } from '../../types/share';
import { formatBytes } from '../../utils/formatters';

export interface PolicySummaryProps {
  files: File[];
  expiresIn: ExpiryOption;
  maxDownloads: MaxDownloadsOption;
  isPasswordProtected: boolean;
}

export const PolicySummary: React.FC<PolicySummaryProps> = ({
  files,
  expiresIn,
  maxDownloads,
  isPasswordProtected,
}) => {
  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  const getExpiryLabel = (opt: ExpiryOption) => {
    switch (opt) {
      case '10m':
        return '10 MINUTES';
      case '1h':
        return '1 HOUR';
      case '24h':
        return '24 HOURS';
    }
  };

  const getDownloadLabel = (opt: MaxDownloadsOption) => {
    if (opt === 1) return '1 DOWNLOAD (BURN)';
    return `${opt} DOWNLOADS`;
  };

  return (
    <div className="w-full text-left border border-[#E5E5E5] bg-[#F7F7F5] p-6 rounded-none space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-[#E5E5E5]">
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#111111]">
          ACTIVE SECURITY SUMMARY
        </span>
        <span className="text-[10px] font-mono text-[#555555] uppercase">
          SERVER ENFORCED
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <div>
          <span className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-1">
            PAYLOAD
          </span>
          <p className="text-xs font-bold text-[#111111] uppercase">
            {files.length} {files.length === 1 ? 'FILE' : 'FILES'} ({formatBytes(totalBytes)})
          </p>
        </div>

        <div>
          <span className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-1">
            EXPIRY
          </span>
          <p className="text-xs font-bold text-[#111111] uppercase">
            {getExpiryLabel(expiresIn)}
          </p>
        </div>

        <div>
          <span className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-1">
            QUOTA
          </span>
          <p className="text-xs font-bold text-[#111111] uppercase">
            {getDownloadLabel(maxDownloads)}
          </p>
        </div>

        <div>
          <span className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-1">
            PASSKEY
          </span>
          <p className="text-xs font-bold text-[#111111] uppercase">
            {isPasswordProtected ? 'ENABLED' : 'NONE'}
          </p>
        </div>
      </div>
    </div>
  );
};
