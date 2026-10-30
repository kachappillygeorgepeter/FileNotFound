import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';
import { CreateShareResponse } from '../../types/share';
import { formatDate } from '../../utils/formatters';
import { Button } from '../ui/Button';

export interface ShareSuccessCardProps {
  shareData: CreateShareResponse;
  passkey?: string;
  onReset?: () => void;
}

export const ShareSuccessCard: React.FC<ShareSuccessCardProps> = ({
  shareData,
  passkey,
  onReset,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPasskey, setCopiedPasskey] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareData.shareLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleCopyPasskey = async () => {
    if (!passkey) return;
    try {
      await navigator.clipboard.writeText(passkey);
      setCopiedPasskey(true);
      setTimeout(() => setCopiedPasskey(false), 2500);
    } catch (e) {
      console.error('Failed to copy passkey', e);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-10 md:p-14 border border-[#E5E5E5] my-12 text-left shadow-sm">
      <p className="text-[#111111] text-xs font-bold tracking-[0.4em] mb-4 uppercase">
        Zero-Trust Link Generated
      </p>
      <h1 className="text-3xl font-extrabold mb-8 text-[#111111] uppercase tracking-tight">
        Share Created Successfully
      </h1>

      <div className="bg-[#111111] text-white p-4 mb-8 text-sm font-semibold tracking-wide flex items-center">
        <span className="mr-3 font-bold uppercase tracking-[0.2em] text-[10px] bg-white text-[#111111] px-2 py-1">
          SUCCESS
        </span>
        Your files are staged in private storage and ready for secure recipient retrieval.
      </div>

      <div className="space-y-8">
        {/* Link Box */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-2">
            Share Link
          </label>
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <div className="flex-1 border border-[#E5E5E5] bg-[#F7F7F5] rounded-none px-4 py-4 text-xs font-mono text-[#111111] select-all break-all flex items-center">
              {shareData.shareLink}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="bg-[#111111] text-white px-8 py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#333333] transition-colors border border-[#111111] rounded-none shrink-0 flex items-center justify-center gap-2"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'COPIED' : 'COPY LINK'}</span>
            </button>
          </div>
        </div>

        {/* Passkey Box if set */}
        {passkey && (
          <div className="p-6 border border-[#E5E5E5] bg-[#F7F7F5] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase">
                  REQUIRED PASSKEY
                </span>
                <span className="text-base font-extrabold text-[#111111] font-mono tracking-wider">
                  {passkey}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyPasskey}
                className="bg-white text-[#111111] px-6 py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#111111] hover:text-white transition-colors border border-[#E5E5E5] hover:border-[#111111] rounded-none shrink-0"
              >
                {copiedPasskey ? 'COPIED' : 'COPY PASSKEY'}
              </button>
            </div>
            <p className="text-[11px] text-[#555555]">
              Recipients must submit this passkey before any file metadata or download stream is authorized.
            </p>
          </div>
        )}

        {/* Security Policy Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#E5E5E5]">
          <div>
            <span className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-1">
              EXPIRATION
            </span>
            <p className="text-sm font-bold text-[#111111]">
              {formatDate(shareData.expiresAt)}
            </p>
          </div>

          <div>
            <span className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-1">
              DOWNLOAD QUOTA
            </span>
            <p className="text-sm font-bold text-[#111111]">
              {shareData.maxDownloads} {shareData.maxDownloads === 1 ? 'DOWNLOAD (BURN)' : 'DOWNLOADS'}
            </p>
          </div>

          <div>
            <span className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-1">
              STAGED FILES
            </span>
            <p className="text-sm font-bold text-[#111111]">
              {shareData.fileCount} {shareData.fileCount === 1 ? 'FILE' : 'FILES'}
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-10 border-t border-[#E5E5E5]">
          <a
            href={shareData.shareLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
          >
            <Button variant="secondary" size="md" className="w-full sm:w-auto">
              TEST RECEIVER LINK
            </Button>
          </a>

          {onReset ? (
            <Button variant="primary" size="md" onClick={onReset} className="w-full sm:w-auto">
              SHARE ANOTHER FILE
            </Button>
          ) : (
            <Link to="/" className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full sm:w-auto">
                SHARE ANOTHER FILE
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
