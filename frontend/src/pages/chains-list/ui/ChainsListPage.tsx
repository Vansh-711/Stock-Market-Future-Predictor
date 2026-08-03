import { useCallback } from 'react';
import { Network } from 'lucide-react';
import { getChains } from '@/entities/chain/api/chainApi';
import { enrichChains } from '@/entities/chain/model/enrich';
import type { EnrichedChain } from '@/entities/chain/model/types';
import { ChainCard } from '@/entities/chain/ui/ChainCard';
import { getCompanies } from '@/entities/company/api/companyApi';
import { getEvents } from '@/entities/event/api/eventApi';
import { getPatterns } from '@/entities/pattern/api/patternApi';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { ChainCardSkeleton } from '@/shared/ui/Skeleton';

async function loadChains(): Promise<EnrichedChain[]> {
  const [companies, patterns] = await Promise.all([getCompanies(''), getPatterns()]);
  const [chains, events] = await Promise.all([
    getChains(),
    getEvents(),
  ]);
  return enrichChains(chains, events, patterns);
}

export function ChainsListPage() {
  const loader = useCallback(() => loadChains(), []);
  const { data, error, isLoading, status, refetch } = useRemoteData(loader, []);

  return (
    <div className="space-y-6">
      <h1 className="text-display text-text-primary">Recent chains</h1>

      {isLoading ? (
        <div className="space-y-4">
          <ChainCardSkeleton />
          <ChainCardSkeleton />
          <ChainCardSkeleton />
        </div>
      ) : null}

      {status === 'error' && error ? <ErrorState message={error} onRetry={refetch} /> : null}

      {status === 'success' && data ? (
        data.length === 0 ? (
          <EmptyState
            icon={<Network className="h-8 w-8" aria-hidden="true" />}
            title="No chains yet"
            description="Generated chains will appear after market events are processed against the relationship graph."
          />
        ) : (
          <div className="space-y-4">
            {data.map((chain) => (
              <ChainCard key={chain.id} chain={chain} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
