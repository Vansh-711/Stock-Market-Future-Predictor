import { Newspaper } from 'lucide-react';
import type { MarketEvent } from '@/entities/event/model/types';
import { EventRow } from '@/entities/event/ui/EventRow';
import { EmptyState } from '@/shared/ui/EmptyState';

export function CompanyEvents({ events }: { events: MarketEvent[] }) {
  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="mb-3 text-h3 text-text-primary">Recent events</h2>
      {events.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-8 w-8" aria-hidden="true" />}
          title="No events yet"
          description="Recent company events will appear after market headlines are processed."
        />
      ) : (
        <div>
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
