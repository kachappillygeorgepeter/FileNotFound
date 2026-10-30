import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ShareMetadata } from '../types/share';
import {
  lookupShare,
  verifySharePassword,
  downloadSingleFile,
  downloadAllZip,
} from '../services/shareService';
import { useSession } from '../context/SessionContext';
import { PasswordChallenge } from '../components/receiver/PasswordChallenge';
import { ShareMetadataCard } from '../components/receiver/ShareMetadataCard';
import { DownloadFileList } from '../components/receiver/DownloadFileList';
import { ExpiredOrExhaustedState } from '../components/receiver/ExpiredOrExhaustedState';
import { Button } from '../components/ui/Button';

export const ReceiverPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { setSession } = useSession();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isExpiredOrExhausted, setIsExpiredOrExhausted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [shareMetadata, setShareMetadata] = useState<ShareMetadata | null>(null);

  const fetchShareData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);
    setIsExpiredOrExhausted(false);

    try {
      const data = await lookupShare(token);
      setShareMetadata(data);
    } catch (err: unknown) {
      setIsExpiredOrExhausted(true);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Share not found, has expired, or exceeded its download limit.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchShareData();
  }, [fetchShareData]);

  const handleVerifyPassword = async (password: string) => {
    if (!token) return;
    setIsVerifying(true);
    setPasswordError(null);

    try {
      const res = await verifySharePassword(token, password);
      setSession(res.sessionToken, res.sessionExpiresAt);
      setShareMetadata(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPasswordError(err.message);
      } else {
        setPasswordError('Incorrect password. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownloadSingle = async (fileId: string, fileName: string) => {
    if (!token) return;
    setIsDownloading(true);

    try {
      await downloadSingleFile(token, fileId, fileName);

      setShareMetadata((prev) => {
        if (!prev) return null;
        const newRemaining = Math.max(0, (prev.downloadsRemaining ?? 1) - 1);
        if (newRemaining === 0) {
          setIsExpiredOrExhausted(true);
        }
        return {
          ...prev,
          downloadsRemaining: newRemaining,
        };
      });
    } catch (err: unknown) {
      if (err instanceof Error && (err.message.includes('expired') || err.message.includes('limit'))) {
        setIsExpiredOrExhausted(true);
      } else {
        alert(err instanceof Error ? err.message : 'Download failed. Please try again.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAllZip = async () => {
    if (!token) return;
    setIsDownloading(true);

    try {
      await downloadAllZip(token);

      setShareMetadata((prev) => {
        if (!prev) return null;
        const newRemaining = Math.max(0, (prev.downloadsRemaining ?? 1) - 1);
        if (newRemaining === 0) {
          setIsExpiredOrExhausted(true);
        }
        return {
          ...prev,
          downloadsRemaining: newRemaining,
        };
      });
    } catch (err: unknown) {
      if (err instanceof Error && (err.message.includes('expired') || err.message.includes('limit'))) {
        setIsExpiredOrExhausted(true);
      } else {
        alert(err instanceof Error ? err.message : 'ZIP download failed. Please try again.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTimerExpired = () => {
    setIsExpiredOrExhausted(true);
    setErrorMessage('This shared link has reached its self-destruct time limit and is now expired.');
  };

  return (
    <div className="flex-1 w-full bg-[#F7F7F5] py-16 px-6 flex flex-col justify-center">
      <div className="max-w-4xl w-full mx-auto">
        {isLoading ? (
          <div className="max-w-md mx-auto bg-white p-12 border border-[#E5E5E5] text-center space-y-4 shadow-sm">
            <Loader2 className="w-8 h-8 text-[#111111] animate-spin mx-auto" />
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase">
              RESOLVING ZERO-TRUST SHARE PARAMETERS...
            </p>
          </div>
        ) : isExpiredOrExhausted ? (
          <ExpiredOrExhaustedState message={errorMessage || undefined} />
        ) : shareMetadata?.passwordRequired ? (
          <div className="space-y-6">
            <PasswordChallenge
              onSubmit={handleVerifyPassword}
              isLoading={isVerifying}
              errorMessage={passwordError}
            />
            <div className="text-center">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  ← RETURN TO HOME
                </Button>
              </Link>
            </div>
          </div>
        ) : shareMetadata ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            <ShareMetadataCard metadata={shareMetadata} onExpire={handleTimerExpired} />

            {shareMetadata.files && shareMetadata.files.length > 0 ? (
              <DownloadFileList
                files={shareMetadata.files}
                onDownloadSingle={handleDownloadSingle}
                onDownloadAllZip={handleDownloadAllZip}
                isDownloading={isDownloading}
                downloadsRemaining={shareMetadata.downloadsRemaining ?? 1}
              />
            ) : (
              <div className="p-12 text-center text-[#555555] text-xs font-semibold uppercase tracking-widest border border-[#E5E5E5] bg-white">
                NO FILES ATTACHED TO THIS SHARE.
              </div>
            )}

            <div className="pt-6 flex items-center justify-between text-xs text-[#555555] font-mono border-t border-[#E5E5E5]">
              <Link to="/">
                <Button variant="secondary" size="sm">
                  ← CREATE A NEW SHARE
                </Button>
              </Link>
              <span className="font-bold tracking-widest text-[#111111] uppercase text-[10px]">
                SECURE ENDPOINT VERIFIED
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
