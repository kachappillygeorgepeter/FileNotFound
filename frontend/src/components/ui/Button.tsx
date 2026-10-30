import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'relative inline-flex items-center justify-center font-bold tracking-[0.2em] uppercase rounded-none transition-colors duration-200 select-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-[#111111] text-white hover:bg-[#333333] border border-[#111111]',
      secondary:
        'bg-white text-[#111111] hover:bg-[#F7F7F5] border border-[#E5E5E5] hover:border-[#111111]',
      outline:
        'bg-transparent text-[#111111] hover:bg-[#F7F7F5] border border-[#E5E5E5] hover:border-[#111111]',
      ghost:
        'bg-transparent text-[#555555] hover:text-[#111111] border border-transparent',
      danger:
        'bg-white text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-600',
    };

    const sizes = {
      sm: 'text-[10px] px-5 py-2.5 gap-2',
      md: 'text-xs px-8 py-4 gap-2.5',
      lg: 'text-xs px-10 py-5 gap-3',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
