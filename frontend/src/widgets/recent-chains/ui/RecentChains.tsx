import { Link } from 'react-router-dom';
import { Network } from 'lucide-react';
import { ChainCard } from '@/entities/chain/ui/ChainCard';
import type { EnrichedChain } from '@/entities/chain/model/types';
import { EmptyState } from '@/shared/ui/EmptyState';

export function RecentChains({ chains }: { chains: EnrichedChain[] }) {
  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-h3 text-text-primary">Recent chains</h2>
        <Link className="text-small text-accent transition-colors duration-ui ease-out hover:text-accent-hover" to="/chains">
          View all
        </Link>
      </div>
      {chains.length === 0 ? (
        <EmptyState
          icon={<Network className="h-8 w-8" aria-hidden="true" />}
          title="No chains yet"
          description="Validated event chains will appear here after trigger events are processed."
        />
      ) : (
        <div className="space-y-4">
          {chains.slice(0, 6).map((chain) => (
            <ChainCard key={chain.id} chain={chain} compact />
          ))}
        </div>
      )}
    </section>
  );
}
