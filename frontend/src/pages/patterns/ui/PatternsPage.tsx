import { useCallback, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { getPatterns } from '@/entities/pattern/api/patternApi';
import { PatternFilters } from '@/features/pattern-filters/ui/PatternFilters';
import { PatternTable } from '@/widgets/pattern-table/ui/PatternTable';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { TableSkeleton } from '@/shared/ui/Skeleton';

type FilterValue = {
  eventType: string;
  relationshipType: string;
  windowDays: string;
};

export function PatternsPage() {
  const loader = useCallback(() => getPatterns(), []);
  const { data, error, isLoading, status, refetch } = useRemoteData(loader, []);
  const [filters, setFilters] = useState<FilterValue>({ eventType: '', relationshipType: '', windowDays: '' });

  const eventTypes = useMemo(() => Array.from(new Set((data ?? []).map((pattern) => pattern.trigger_event_type))).sort(), [data]);
  const relationshipTypes = useMemo(() => Array.from(new Set((data ?? []).map((pattern) => pattern.relationship_type))).sort(), [data]);

  const filteredPatterns = useMemo(() => {
    return (data ?? []).filter((pattern) => {
      if (filters.eventType && pattern.trigger_event_type !== filters.eventType) return false;
      if (filters.relationshipType && pattern.relationship_type !== filters.relationshipType) return false;
      if (filters.windowDays && pattern.window_days !== Number(filters.windowDays)) return false;
      return pattern.sample_size >= 3;
    });
  }, [data, filters]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-text-primary">Validated patterns</h1>
        <p className="mt-3 text-body text-text-secondary">Historical hit-rate for every event-relationship pattern with at least 3 observed instances.</p>
      </div>

      {status === 'success' && data ? (
        <PatternFilters value={filters} eventTypes={eventTypes} relationshipTypes={relationshipTypes} onChange={setFilters} />
      ) : null}

      {isLoading ? <TableSkeleton /> : null}

      {status === 'error' && error ? <ErrorState message={error} onRetry={refetch} /> : null}

      {status === 'success' && data ? (
        filteredPatterns.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="h-8 w-8" aria-hidden="true" />}
            title="No patterns yet"
            description="Patterns with at least 3 observed instances will appear after backtests are computed."
          />
        ) : (
          <PatternTable patterns={filteredPatterns} />
        )
      ) : null}
    </div>
  );
}
