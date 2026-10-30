import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-1 w-full bg-[#F7F7F5] py-20 px-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-12 md:p-16 border border-[#E5E5E5] text-center shadow-sm space-y-6">
        <p className="text-6xl font-extrabold text-[#111111] tracking-tighter">
          404
        </p>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-[#111111] uppercase tracking-tight">
            FileNotFound
          </h2>
          <p className="text-xs text-[#555555] leading-relaxed">
            The resource you requested does not exist or was deleted under our zero-trust lifecycle.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full sm:w-auto">
              RETURN HOME
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
