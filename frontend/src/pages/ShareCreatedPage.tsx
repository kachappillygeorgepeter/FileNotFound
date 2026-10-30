import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ShareSuccessCard } from '../components/share/ShareSuccessCard';
import { CreateShareResponse } from '../types/share';
import { Button } from '../components/ui/Button';

export const ShareCreatedPage: React.FC = () => {
  const location = useLocation();
  const state = location.state as
    | { shareData: CreateShareResponse; passkey?: string }
    | undefined;

  if (!state || !state.shareData) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#F7F7F5]">
        <div className="max-w-md w-full bg-white p-10 md:p-14 border border-[#E5E5E5] text-center space-y-6 shadow-sm">
          <p className="text-[#111111] text-xs font-bold tracking-[0.4em] uppercase">
            SESSION EXPIRED
          </p>
          <h3 className="text-2xl font-extrabold text-[#111111] uppercase tracking-tight">
            No Active Share Found
          </h3>
          <p className="text-xs text-[#555555] leading-relaxed">
            Share details are preserved only in memory for privacy and are not stored in browser history.
          </p>
          <div className="pt-2">
            <Link to="/">
              <Button variant="primary" size="md">
                CREATE A NEW SHARE
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[#F7F7F5] py-12 px-6">
      <ShareSuccessCard shareData={state.shareData} passkey={state.passkey} />
    </div>
  );
};
