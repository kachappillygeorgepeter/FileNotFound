import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { ExpiryOption, MaxDownloadsOption } from '../../types/share';
import { TypeSelector, TypeSelectorOption } from '../ui/TypeSelector';
import { Input } from '../ui/Input';

export interface SecurityPolicyFormProps {
  expiresIn: ExpiryOption;
  setExpiresIn: (val: ExpiryOption) => void;
  maxDownloads: MaxDownloadsOption;
  setMaxDownloads: (val: MaxDownloadsOption) => void;
  password: string;
  setPassword: (val: string) => void;
  isPasswordProtected: boolean;
  setIsPasswordProtected: (val: boolean) => void;
  disabled?: boolean;
}

export const SecurityPolicyForm: React.FC<SecurityPolicyFormProps> = ({
  expiresIn,
  setExpiresIn,
  maxDownloads,
  setMaxDownloads,
  password,
  setPassword,
  isPasswordProtected,
  setIsPasswordProtected,
  disabled = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const expiryOptions: TypeSelectorOption<ExpiryOption>[] = [
    { value: '10m', label: '10 MINUTES' },
    { value: '1h', label: '1 HOUR', badge: 'RECOMMENDED' },
    { value: '24h', label: '24 HOURS' },
  ];

  const downloadOptions: TypeSelectorOption<MaxDownloadsOption>[] = [
    { value: 1, label: '1 TIME', badge: 'BURN' },
    { value: 3, label: '3 TIMES' },
    { value: 10, label: '10 TIMES' },
  ];

  return (
    <div className="w-full space-y-8 text-left">
      {/* Expiry Selector */}
      <div>
        <label className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-2">
          Self-Destruct Expiration
        </label>
        <TypeSelector<ExpiryOption>
          options={expiryOptions}
          value={expiresIn}
          onChange={setExpiresIn}
        />
        <p className="text-[11px] text-[#555555] mt-2">
          The link will permanently expire and physical files will be unlinked once this duration elapses.
        </p>
      </div>

      {/* Download Quota Selector */}
      <div>
        <label className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-2">
          Atomic Download Limit
        </label>
        <TypeSelector<MaxDownloadsOption>
          options={downloadOptions}
          value={maxDownloads}
          onChange={setMaxDownloads}
        />
        <p className="text-[11px] text-[#555555] mt-2">
          Enforced atomically at the database level before files are streamed.
        </p>
      </div>

      {/* Password Protection */}
      <div className="pt-6 border-t border-[#E5E5E5] space-y-4">
        <div className="flex items-center justify-between">
          <label
            htmlFor="passkey-toggle"
            className="text-[10px] font-bold tracking-[0.2em] text-[#111111] uppercase cursor-pointer select-none"
          >
            Require Passkey Protection
          </label>
          <input
            id="passkey-toggle"
            type="checkbox"
            checked={isPasswordProtected}
            disabled={disabled}
            onChange={(e) => {
              setIsPasswordProtected(e.target.checked);
              if (!e.target.checked) setPassword('');
            }}
            className="w-4 h-4 rounded-none border-[#E5E5E5] accent-[#111111] cursor-pointer"
          />
        </div>

        {isPasswordProtected && (
          <div className="pt-2">
            <Input
              type={showPassword ? 'text' : 'password'}
              label="Share Passkey"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={disabled}
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
              error={
                password.length > 0 && password.length < 8
                  ? 'Passkey must be at least 8 characters long'
                  : undefined
              }
              helperText="Zero-knowledge: passkey is never stored in browser and verified in constant time."
            />
          </div>
        )}
      </div>
    </div>
  );
};
