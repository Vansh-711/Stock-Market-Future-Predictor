import { useCallback } from 'react';
import { Network } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getChainsBySymbol } from '@/entities/chain/api/chainApi';
import { dedupeChains, enrichChains } from '@/entities/chain/model/enrich';
import type { EnrichedChain } from '@/entities/chain/model/types';
import { getCompanies } from '@/entities/company/api/companyApi';
import { getEventsBySymbol } from '@/entities/event/api/eventApi';
import { getPatterns } from '@/entities/pattern/api/patternApi';
import { ChainDetailView } from '@/widgets/chain-detail/ui/ChainDetailView';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { ChainCardSkeleton } from '@/shared/ui/Skeleton';

async function loadChainDetail(chainId: number): Promise<EnrichedChain | null> {
  const companies = await getCompanies('');
  const chainResults = await Promise.all(companies.map((company) => getChainsBySymbol(company.symbol)));
  const chains = dedupeChains(chainResults.flat());
  const chain = chains.find((candidate) => candidate.id === chainId);
  if (!chain) return null;

  const [events, patterns] = await Promise.all([getEventsBySymbol(chain.trigger_symbol), getPatterns()]);
  return enrichChains([chain], events, patterns)[0];
}

export function ChainDetailPage() {
  const params = useParams();
  const chainId = Number(params.id);
  const loader = useCallback(() => loadChainDetail(chainId), [chainId]);
  const { data, error, isLoading, status, refetch } = useRemoteData(loader, [chainId]);

  return (
    <div className="space-y-6">
      <h1 className="text-display text-text-primary">Chain detail</h1>

      {isLoading ? <ChainCardSkeleton /> : null}
      {status === 'error' && error ? <ErrorState message={error} onRetry={refetch} /> : null}
      {status === 'success' && !data ? (
        <EmptyState
          icon={<Network className="h-8 w-8" aria-hidden="true" />}
          title="No chain found"
          description="The requested chain is not present in the current relationship dataset."
          actionLabel="Retry"
          onAction={refetch}
        />
      ) : null}
      {status === 'success' && data ? <ChainDetailView chain={data} /> : null}
    </div>
  );
}
