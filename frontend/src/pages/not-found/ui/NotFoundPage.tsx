import { useNavigate } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { EmptyState } from '@/shared/ui/EmptyState';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <EmptyState
      icon={<SearchX className="h-8 w-8" aria-hidden="true" />}
      title="Page not found"
      description="The requested page is not part of the Signal Chain workspace."
      actionLabel="Go to dashboard"
      onAction={() => navigate('/')}
    />
  );
}
