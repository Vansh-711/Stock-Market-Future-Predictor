import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  children: ReactNode;
};

export function Card({ title, children, className, ...props }: CardProps) {
  return (
    <div className={cn('rounded-card border border-border bg-surface p-5', className)} {...props}>
      {title ? <h2 className="mb-3 text-h3 text-text-primary">{title}</h2> : null}
      {children}
    </div>
  );
}

export function MetricCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card>
      <div className="text-small text-text-secondary">{label}</div>
      <div className="mt-2 text-data-lg text-text-primary">{value}</div>
    </Card>
  );
}
