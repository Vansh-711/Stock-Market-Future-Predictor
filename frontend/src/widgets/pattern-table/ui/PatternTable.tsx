import { useMemo, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import type { BacktestPattern } from '@/entities/pattern/model/types';
import { DirectionBadge } from '@/shared/ui/Badge';
import { cn } from '@/shared/lib/cn';
import { formatEventType, formatPercent, formatRelationshipType, formatSignedPercent } from '@/shared/lib/format';

type SortKey = 'trigger_event_type' | 'relationship_type' | 'window_days' | 'sample_size' | 'hit_rate' | 'avg_move_pct' | 'predicted_direction';
type SortDirection = 'asc' | 'desc';

const columns: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
  { key: 'trigger_event_type', label: 'Trigger event' },
  { key: 'relationship_type', label: 'Relationship' },
  { key: 'window_days', label: 'Window', numeric: true },
  { key: 'sample_size', label: 'Sample size', numeric: true },
  { key: 'hit_rate', label: 'Hit rate', numeric: true },
  { key: 'avg_move_pct', label: 'Avg move %', numeric: true },
  { key: 'predicted_direction', label: 'Direction badge' },
];

function comparePattern(a: BacktestPattern, b: BacktestPattern, key: SortKey) {
  const aValue = a[key];
  const bValue = b[key];
  if (typeof aValue === 'number' && typeof bValue === 'number') return aValue - bValue;
  return String(aValue).localeCompare(String(bValue));
}

export function PatternTable({ patterns }: { patterns: BacktestPattern[] }) {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'hit_rate', direction: 'desc' });

  const sortedPatterns = useMemo(() => {
    return [...patterns].sort((a, b) => {
      const comparison = comparePattern(a, b, sort.key);
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [patterns, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="max-h-graph overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-surface-raised">
            <tr>
              {columns.map((column) => {
                const active = sort.key === column.key;
                return (
                  <th key={column.key} className={cn('border-b border-border px-4 py-3 text-left text-small-medium text-text-secondary', column.numeric && 'text-right')}>
                    <button className={cn('inline-flex items-center gap-2', column.numeric && 'justify-end')} onClick={() => toggleSort(column.key)} type="button">
                      <span>{column.label}</span>
                      <ChevronsUpDown className={cn('h-4 w-4', active ? 'text-accent' : 'text-text-muted')} aria-hidden="true" />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedPatterns.map((pattern) => (
              <tr key={pattern.id} className="border-b border-border transition-colors duration-ui ease-out last:border-b-0 hover:bg-surface-hover">
                <td className="px-4 py-4 text-body text-text-primary">{formatEventType(pattern.trigger_event_type)}</td>
                <td className="px-4 py-4 text-body text-text-secondary">{formatRelationshipType(pattern.relationship_type)}</td>
                <td className="px-4 py-4 text-right text-data text-text-primary">{pattern.window_days}d</td>
                <td className="px-4 py-4 text-right text-data text-text-primary">{pattern.sample_size}</td>
                <td className="px-4 py-4 text-right">
                  <div className="relative ml-auto h-6 w-32 overflow-hidden rounded-control bg-surface-raised">
                    <div className="absolute inset-y-0 left-0 bg-positive" style={{ width: formatPercent(pattern.hit_rate) }} aria-hidden="true" />
                    <span className="relative z-10 flex h-full items-center justify-end px-2 text-data text-text-primary">{formatPercent(pattern.hit_rate)}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-right text-data text-text-primary">{formatSignedPercent(pattern.avg_move_pct)}</td>
                <td className="px-4 py-4">
                  <DirectionBadge direction={pattern.predicted_direction} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
