import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

export interface ExpiredOrExhaustedStateProps {
  message?: string;
}

export const ExpiredOrExhaustedState: React.FC<ExpiredOrExhaustedStateProps> = ({
  message = 'This shared link has expired, exceeded its maximum allowed downloads, or was deleted under zero-trust privacy policy.',
}) => {
  return (
    <div className="max-w-xl mx-auto bg-white p-10 md:p-14 border border-[#E5E5E5] my-12 text-center shadow-sm">
      <div className="bg-[#111111] text-white p-4 mb-8 text-xs font-semibold tracking-wide flex items-center justify-center">
        <span className="mr-3 font-bold uppercase tracking-[0.2em] text-[10px] bg-white text-[#111111] px-2 py-0.5">
          UNAVAILABLE
        </span>
        LINK EXPIRED OR EXHAUSTED
      </div>

      <h3 className="text-3xl font-extrabold mb-4 text-[#111111] uppercase tracking-tight">
        Link No Longer Available
      </h3>

      <p className="text-sm text-[#555555] mb-8 leading-relaxed">
        {message}
      </p>

      <div className="p-6 border border-[#E5E5E5] bg-[#F7F7F5] text-left text-xs text-[#555555] space-y-2 mb-8 font-mono">
        <p className="font-bold text-[#111111] uppercase tracking-wider text-[10px]">
          ZERO-TRUST PRIVACY POLICY:
        </p>
        <p>• Unauthenticated requests never receive file names or sizes.</p>
        <p>• Download limits are enforced atomically at the database row level.</p>
        <p>• Expired files are unlinked and physically wiped from storage.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Link to="/" className="w-full sm:w-auto">
          <Button variant="primary" size="md" className="w-full sm:w-auto">
            CREATE A NEW SHARE
          </Button>
        </Link>
        <Link to="/security" className="w-full sm:w-auto">
          <Button variant="secondary" size="md" className="w-full sm:w-auto">
            SECURITY DETAILS
          </Button>
        </Link>
      </div>
    </div>
  );
};
