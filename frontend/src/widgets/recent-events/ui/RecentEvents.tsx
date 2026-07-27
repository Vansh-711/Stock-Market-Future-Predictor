import { Newspaper } from 'lucide-react';
import { EventRow } from '@/entities/event/ui/EventRow';
import type { MarketEvent } from '@/entities/event/model/types';
import { EmptyState } from '@/shared/ui/EmptyState';

export function RecentEvents({ events }: { events: MarketEvent[] }) {
  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="mb-3 text-h3 text-text-primary">Recent events</h2>
      {events.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-8 w-8" aria-hidden="true" />}
          title="No events yet"
          description="Company headlines with validated event tags will appear here."
        />
      ) : (
        <div>
          {events.slice(0, 8).map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
