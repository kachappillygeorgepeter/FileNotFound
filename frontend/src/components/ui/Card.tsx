import React, { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'white' | 'warm' | 'dark';
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'white',
  bordered = true,
  children,
  ...props
}) => {
  const variants = {
    white: 'bg-white text-[#111111]',
    warm: 'bg-[#F7F7F5] text-[#111111]',
    dark: 'bg-[#0D0D0D] text-white',
  };

  return (
    <div
      className={cn(
        'rounded-none transition-colors duration-200',
        variants[variant],
        bordered && (variant === 'dark' ? 'border border-[#222222]' : 'border border-[#E5E5E5]'),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
