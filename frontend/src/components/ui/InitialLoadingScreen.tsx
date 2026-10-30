import React, { useEffect, useState } from 'react';
import { BarLoader } from './BarLoader';
import logoImg from '../../../imgs/logo_no_bg.png';

export interface InitialLoadingScreenProps {
  /** Callback fired when the exit animation completes and the landing page is shown */
  onComplete?: () => void;
  /** Minimum duration in ms to show the loader (default: 1500ms) */
  minDurationMs?: number;
}

export const InitialLoadingScreen: React.FC<InitialLoadingScreenProps> = ({
  onComplete,
  minDurationMs = 1500,
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isRendered, setIsRendered] = useState(true);

  useEffect(() => {
    // Hold loading screen for minDurationMs, then begin smooth fade-out
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
      // Wait for 500ms fade transition to finish before fully unmounting
      const unmountTimer = setTimeout(() => {
        setIsRendered(false);
        if (onComplete) onComplete();
      }, 500);

      return () => clearTimeout(unmountTimer);
    }, minDurationMs);

    return () => clearTimeout(fadeTimer);
  }, [minDurationMs, onComplete]);

  if (!isRendered) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center max-w-md px-6 text-center select-none">
        {/* Brand Logo - Much Bigger */}
        <div className="mb-8 flex items-center justify-center">
          <img
            src={logoImg}
            alt="FileNotFound Logo"
            className="h-32 w-32 md:h-44 md:w-44 object-contain"
          />
        </div>

        {/* Brand Title Alone - Preserves CamelCase FileNotFound */}
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#111111] normal-case mb-8">
          FileNotFound
        </h1>

        {/* Bar Loader (Equalizer) */}
        <div className="flex justify-center">
          <BarLoader
            size="md"
            barCount={5}
            label="Loading FileNotFound..."
          />
        </div>
      </div>
    </div>
  );
};
