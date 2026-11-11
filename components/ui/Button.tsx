'use client';

import { ButtonHTMLAttributes, ForwardRefExoticComponent, ReactNode, RefAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cva, VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const buttonVariants = cva(
  // Shape lock: buttons/inputs are 8px; this is not a pill system.
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-input text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-55',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white hover:bg-brand-hover',
        secondary: 'border border-border bg-surface text-ink hover:bg-subtle',
        ghost: 'text-ink-secondary hover:bg-subtle hover:text-ink',
        danger: 'bg-danger text-white hover:bg-danger/90',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-3.5',
        lg: 'h-11 px-4', // 44px touch target for mobile hero actions
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    children?: ReactNode;
  };

export const Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLButtonElement>> =
  forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { className, variant, size, loading = false, disabled, children, type = 'button', ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  });

export { buttonVariants };
