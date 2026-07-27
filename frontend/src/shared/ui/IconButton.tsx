import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  variant?: 'secondary' | 'ghost' | 'danger';
};

const variantClasses = {
  secondary: 'border border-border-strong text-text-primary hover:bg-surface-hover',
  ghost: 'border border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary',
  danger: 'border border-negative text-negative hover:bg-negative-muted',
};

export function IconButton({ label, children, className, variant = 'ghost', ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-control bg-transparent transition-colors duration-ui ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
