import { CompanyBadge } from '@/entities/company/ui/CompanyBadge';
import type { MarketEvent } from '@/entities/event/model/types';
import { formatEventType } from '@/shared/lib/format';
import { formatRelativeTime } from '@/shared/lib/time';

export function EventRow({ event }: { event: MarketEvent }) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <CompanyBadge symbol={event.company_symbol} to={`/companies/${event.company_symbol}`} />
      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 text-body text-text-primary">{event.headline}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-pill bg-surface-raised px-2.5 py-1 text-small text-text-secondary">{formatEventType(event.event_type)}</span>
          <span className="text-small text-text-muted">{formatRelativeTime(event.published_at)}</span>
        </div>
      </div>
    </div>
  );
}
