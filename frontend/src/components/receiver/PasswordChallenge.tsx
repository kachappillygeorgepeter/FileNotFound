import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export interface PasswordChallengeProps {
  onSubmit: (password: string) => Promise<void>;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const PasswordChallenge: React.FC<PasswordChallengeProps> = ({
  onSubmit,
  isLoading,
  errorMessage,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading) return;
    await onSubmit(password);
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-10 md:p-14 border border-[#E5E5E5] my-12 text-left shadow-sm">
      <p className="text-[#111111] text-xs font-bold tracking-[0.4em] mb-4 uppercase">
        Authentication Gateway
      </p>
      <h2 className="text-3xl font-extrabold mb-4 text-[#111111] uppercase tracking-tight">
        Passkey Required
      </h2>
      <p className="text-sm text-[#555555] mb-8 leading-relaxed">
        This file transfer is shielded under a zero-trust policy. File names, file sizes, and download
        mechanisms are completely protected until authentication.
      </p>

      {errorMessage && (
        <div className="bg-[#111111] text-white p-4 mb-8 text-xs font-semibold tracking-wide flex items-center">
          <span className="mr-3 font-bold uppercase tracking-[0.2em] text-[10px] bg-white text-[#111111] px-2 py-0.5">
            ERROR
          </span>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          type={showPassword ? 'text' : 'password'}
          label="Passkey"
          placeholder="Enter the sender's passkey"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          autoFocus
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[#555555] hover:text-[#111111] p-2 transition-colors"
              aria-label={showPassword ? 'Hide passkey' : 'Show passkey'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        <div className="pt-4 border-t border-[#E5E5E5]">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            disabled={!password.trim() || isLoading}
          >
            VERIFY & UNLOCK FILES
          </Button>
        </div>
      </form>
    </div>
  );
};
