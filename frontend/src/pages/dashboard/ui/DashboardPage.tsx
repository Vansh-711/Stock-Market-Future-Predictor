import { useCallback } from 'react';
import { getChains } from '@/entities/chain/api/chainApi';
import { enrichChains } from '@/entities/chain/model/enrich';
import type { EnrichedChain } from '@/entities/chain/model/types';
import { getCompanies } from '@/entities/company/api/companyApi';
import { getEvents } from '@/entities/event/api/eventApi';
import type { MarketEvent } from '@/entities/event/model/types';
import { getPatterns } from '@/entities/pattern/api/patternApi';
import type { BacktestPattern } from '@/entities/pattern/model/types';
import { DashboardMetrics } from '@/widgets/dashboard-metrics/ui/DashboardMetrics';
import { RecentChains } from '@/widgets/recent-chains/ui/RecentChains';
import { RecentEvents } from '@/widgets/recent-events/ui/RecentEvents';
import { isWithinLastDays } from '@/shared/lib/time';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { CardSkeleton, ChainCardSkeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/ErrorState';

type DashboardData = {
  companiesCount: number;
  activePatterns: number;
  chainsThisWeek: number;
  recentChains: EnrichedChain[];
  recentEvents: MarketEvent[];
};

async function loadDashboardData(): Promise<DashboardData> {
  const [companies, patterns] = await Promise.all([getCompanies(''), getPatterns()]);
  const [chains, events] = await Promise.all([
    getChains(),
    getEvents(),
  ]);

  const enrichedChains = enrichChains(chains, events, patterns);

  return {
    companiesCount: companies.length,
    activePatterns: patterns.filter((pattern: BacktestPattern) => pattern.sample_size >= 3).length,
    chainsThisWeek: chains.filter((chain) => isWithinLastDays(chain.created_at, 7)).length,
    recentChains: enrichedChains,
    recentEvents: events,
  };
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <ChainCardSkeleton />
          <ChainCardSkeleton />
          <ChainCardSkeleton />
        </div>
        <div className="space-y-4 lg:col-span-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const loader = useCallback(() => loadDashboardData(), []);
  const { data, error, isLoading, status, refetch } = useRemoteData(loader, []);

  return (
    <div className="space-y-6">
      <h1 className="text-display text-text-primary">Dashboard</h1>

      {isLoading ? <DashboardSkeleton /> : null}

      {status === 'error' && error ? <ErrorState message={error} onRetry={refetch} /> : null}

      {status === 'success' && data ? (
        <>
          <DashboardMetrics trackedCompanies={data.companiesCount} activePatterns={data.activePatterns} chainsThisWeek={data.chainsThisWeek} />
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <RecentChains chains={data.recentChains.slice(0, 6)} />
            </div>
            <div className="lg:col-span-2">
              <RecentEvents events={data.recentEvents.slice(0, 8)} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
