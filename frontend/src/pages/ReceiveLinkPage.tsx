import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Link2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const ReceiveLinkPage: React.FC = () => {
  const [linkInput, setLinkInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = linkInput.trim();
    if (!raw) {
      setError('Please enter a share link or token.');
      return;
    }

    // Extract token from full URL or standalone token
    // Matches patterns like:
    // https://domain.com/s/TOKEN
    // https://domain.com/share/TOKEN
    // /s/TOKEN
    // TOKEN (direct token string)
    let token = raw;
    try {
      if (raw.includes('/s/')) {
        const parts = raw.split('/s/');
        token = parts[parts.length - 1].split(/[?#]/)[0];
      } else if (raw.includes('/share/')) {
        const parts = raw.split('/share/');
        token = parts[parts.length - 1].split(/[?#]/)[0];
      } else if (raw.startsWith('http://') || raw.startsWith('https://')) {
        const url = new URL(raw);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        if (pathSegments.length > 0) {
          token = pathSegments[pathSegments.length - 1];
        }
      }
    } catch {
      // Fallback to raw trimmed string
    }

    // Clean any trailing slashes or parameters
    token = token.replace(/[^A-Za-z0-9_-]/g, '');

    if (!token) {
      setError('Invalid link format. Please provide a valid FileNotFound link or token.');
      return;
    }

    navigate(`/s/${token}`);
  };

  return (
    <div className="flex-1 w-full bg-[#F7F7F5] py-16 md:py-24 px-6 flex flex-col justify-center select-none">
      <div className="max-w-2xl w-full mx-auto">
        <div className="bg-white p-10 md:p-14 border border-[#E5E5E5] shadow-sm text-left">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-[#111111]" />
            <p className="text-[#111111] text-xs font-bold tracking-[0.4em] uppercase">
              Recipient Retrieval Portal
            </p>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-[#111111] uppercase tracking-tight">
            Receive a File
          </h1>

          <p className="text-[#555555] text-sm md:text-base leading-relaxed mb-8">
            Paste the authorized FileNotFound link or token below to access and download the securely shared files.
          </p>

          <form onSubmit={handleResolve} className="space-y-6">
            <Input
              label="Share Link or Token"
              placeholder="e.g. https://file-not-found-xt4i.vercel.app/s/..."
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value);
                if (error) setError(null);
              }}
              error={error || undefined}
              leftIcon={<Link2 className="w-4 h-4" />}
              autoFocus
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full flex items-center justify-center gap-2"
              >
                <span>ACCESS SHARED FILES</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>

          <div className="mt-10 pt-8 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#555555]">
            <div className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-[#111111]" />
              <span>Password protection will be prompted if required by sender.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

