import { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
};

export function Input({ label, error, leftIcon, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className="block" htmlFor={inputId}>
      {label ? <span className="mb-2 block text-small-medium text-text-secondary">{label}</span> : null}
      <span className="relative block">
        {leftIcon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{leftIcon}</span> : null}
        <input
          id={inputId}
          className={cn(
            'h-9 w-full rounded-control border border-border-strong bg-surface px-3 text-body text-text-primary outline-none transition-colors duration-ui ease-out placeholder:text-text-muted focus:border-accent disabled:opacity-60',
            Boolean(leftIcon) && 'pl-10',
            error && 'border-negative',
            className,
          )}
          {...props}
        />
      </span>
      {error ? <span className="mt-2 block text-small text-negative">{error}</span> : null}
    </label>
  );
}
