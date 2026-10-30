import React, { useState, useEffect, useCallback } from 'react';
import { formatTimeRemaining } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export interface LiveCountdownProps {
  initialSeconds?: number;
  expiresAtIso?: string;
  onExpire?: () => void;
  className?: string;
}

export const LiveCountdown: React.FC<LiveCountdownProps> = ({
  initialSeconds,
  expiresAtIso,
  onExpire,
  className,
}) => {
  const calculateRemaining = useCallback((): number => {
    if (expiresAtIso) {
      const target = new Date(expiresAtIso).getTime();
      const diffSecs = Math.floor((target - Date.now()) / 1000);
      return Math.max(0, diffSecs);
    }
    return Math.max(0, initialSeconds || 0);
  }, [expiresAtIso, initialSeconds]);

  const [secondsLeft, setSecondsLeft] = useState<number>(calculateRemaining);

  useEffect(() => {
    setSecondsLeft(calculateRemaining());
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateRemaining, onExpire]);

  const { formatted, isUrgent } = formatTimeRemaining(secondsLeft);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 px-4 py-2 border font-mono text-xs select-none transition-colors duration-300',
        isUrgent
          ? 'bg-[#111111] text-white border-[#111111]'
          : 'bg-[#F7F7F5] text-[#111111] border-[#E5E5E5]',
        className
      )}
    >
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#555555]">
        {isUrgent ? 'SELF-DESTRUCT IMMINENT:' : 'EXPIRES IN:'}
      </span>
      <span className="font-extrabold tracking-widest">{formatted}</span>
    </div>
  );
};
