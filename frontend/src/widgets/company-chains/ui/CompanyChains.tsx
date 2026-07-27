import { Network } from 'lucide-react';
import type { EnrichedChain } from '@/entities/chain/model/types';
import { ChainCard } from '@/entities/chain/ui/ChainCard';
import { EmptyState } from '@/shared/ui/EmptyState';

export function CompanyChains({ chains }: { chains: EnrichedChain[] }) {
  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="mb-3 text-h3 text-text-primary">Chains involving this company</h2>
      {chains.length === 0 ? (
        <EmptyState
          icon={<Network className="h-8 w-8" aria-hidden="true" />}
          title="No chains yet"
          description="Chains involving this company will appear after validated triggers are generated."
        />
      ) : (
        <div className="space-y-4">
          {chains.map((chain) => (
            <ChainCard key={chain.id} chain={chain} compact />
          ))}
        </div>
      )}
    </section>
  );
}
