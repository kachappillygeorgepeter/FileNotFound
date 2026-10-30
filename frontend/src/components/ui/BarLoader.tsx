import React from 'react';

export interface BarLoaderProps {
  /** Screen reader status description */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Number of vertical bars (default: 5) */
  barCount?: number;
  /** Custom bar color (default: bg-[#111111]) */
  colorClassName?: string;
  /** Additional container styling */
  className?: string;
}

const STAGGER_DELAYS = ['-0.45s', '-0.90s', '-0.20s', '-0.70s', '-0.35s', '-0.80s', '-0.10s'];

const SIZE_CONFIGS = {
  sm: {
    containerHeight: 'h-5', // 20px
    barWidth: 'w-[2.5px]',
    gap: 'gap-[2.5px]',
  },
  md: {
    containerHeight: 'h-8', // 32px
    barWidth: 'w-1',        // 4px
    gap: 'gap-1',           // 4px
  },
  lg: {
    containerHeight: 'h-12', // 48px
    barWidth: 'w-1.5',       // 6px
    gap: 'gap-1.5',          // 6px
  },
};

export const BarLoader: React.FC<BarLoaderProps> = ({
  label = 'Loading application...',
  size = 'md',
  barCount = 5,
  colorClassName = 'bg-[#111111]',
  className = '',
}) => {
  const config = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`inline-flex flex-col items-center justify-center ${className}`}
    >
      <div
        aria-hidden="true"
        className={`flex items-end ${config.containerHeight} ${config.gap}`}
      >
        {bars.map((index) => {
          const delay = STAGGER_DELAYS[index % STAGGER_DELAYS.length];
          return (
            <span
              key={index}
              style={{ animationDelay: delay }}
              className={`h-full ${config.barWidth} ${colorClassName} animate-equalizer-bar rounded-none`}
            />
          );
        })}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
};

