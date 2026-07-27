import { AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title = 'Unable to load data', message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-icon w-icon flex-none text-negative" aria-hidden="true" />
        <div>
          <h3 className="text-h3 text-text-primary">{title}</h3>
          <p className="mt-2 text-body text-negative">{message}</p>
          {onRetry ? (
            <Button className="mt-4" variant="secondary" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
