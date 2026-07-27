import { SelectHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export function Select({ label, className, id, children, ...props }: SelectProps) {
  const selectId = id ?? props.name;
  return (
    <label className="block" htmlFor={selectId}>
      {label ? <span className="mb-2 block text-small-medium text-text-secondary">{label}</span> : null}
      <select
        id={selectId}
        className={cn(
          'h-9 w-full rounded-control border border-border-strong bg-surface px-3 text-body text-text-primary outline-none transition-colors duration-ui ease-out focus:border-accent disabled:opacity-60',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
