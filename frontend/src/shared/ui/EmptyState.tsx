import { ReactNode } from 'react';
import { Button } from '@/shared/ui/Button';

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="rounded-card border border-border bg-surface p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center text-text-muted">{icon}</div>
      <h3 className="mt-4 text-h3 text-text-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-body text-text-secondary">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-6" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
