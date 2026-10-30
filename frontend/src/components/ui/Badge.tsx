import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'black' | 'white' | 'gray' | 'danger' | 'success';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'black',
  size = 'md',
  children,
  ...props
}) => {
  const variants = {
    black: 'bg-[#111111] text-white border border-[#111111]',
    white: 'bg-white text-[#111111] border border-[#E5E5E5]',
    gray: 'bg-[#F7F7F5] text-[#555555] border border-[#E5E5E5]',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    success: 'bg-green-50 text-green-700 border border-green-200',
  };

  const sizes = {
    sm: 'text-[9px] px-2 py-0.5 font-bold tracking-[0.2em] uppercase',
    md: 'text-[10px] px-3 py-1 font-bold tracking-[0.2em] uppercase',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono select-none rounded-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
