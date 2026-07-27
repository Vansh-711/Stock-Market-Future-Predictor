import { useCallback, useState } from 'react';
import { Building2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getChainsBySymbol } from '@/entities/chain/api/chainApi';
import { dedupeChains, dedupeEvents, enrichChains } from '@/entities/chain/model/enrich';
import type { EnrichedChain } from '@/entities/chain/model/types';
import { getCompanies } from '@/entities/company/api/companyApi';
import type { Company } from '@/entities/company/model/types';
import { getEventsBySymbol } from '@/entities/event/api/eventApi';
import type { MarketEvent } from '@/entities/event/model/types';
import { getPatterns } from '@/entities/pattern/api/patternApi';
import { CompanyChains } from '@/widgets/company-chains/ui/CompanyChains';
import { CompanyEvents } from '@/widgets/company-events/ui/CompanyEvents';
import { CompanyHeader } from '@/widgets/company-header/ui/CompanyHeader';
import { CompanyPriceChart } from '@/widgets/price-chart/ui/CompanyPriceChart';
import type { PriceRange } from '@/shared/lib/priceSeries';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { CardSkeleton, ChainCardSkeleton } from '@/shared/ui/Skeleton';

type CompanyDetailData = {
  company: Company;
  events: MarketEvent[];
  chains: EnrichedChain[];
};

async function loadCompanyDetail(symbol: string): Promise<CompanyDetailData | null> {
  const normalizedSymbol = symbol.toUpperCase();
  const companies = await getCompanies(normalizedSymbol);
  const company = companies.find((candidate) => candidate.symbol.toUpperCase() === normalizedSymbol);
  if (!company) return null;

  const [companyEvents, chains, patterns] = await Promise.all([getEventsBySymbol(company.symbol), getChainsBySymbol(company.symbol), getPatterns()]);
  const eventSymbols = Array.from(new Set([company.symbol, ...chains.map((chain) => chain.trigger_symbol)]));
  const eventResults = await Promise.all(eventSymbols.map((eventSymbol) => getEventsBySymbol(eventSymbol)));
  const events = dedupeEvents([...companyEvents, ...eventResults.flat()]);
  const enrichedChains = enrichChains(dedupeChains(chains), events, patterns);

  return {
    company,
    events: companyEvents.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()),
    chains: enrichedChains,
  };
}

function CompanyDetailSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton />
      <CardSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton />
        <ChainCardSkeleton />
      </div>
    </div>
  );
}

export function CompanyDetailPage() {
  const params = useParams();
  const symbol = (params.symbol ?? '').toUpperCase();
  const [range, setRange] = useState<PriceRange>('3M');
  const loader = useCallback(() => loadCompanyDetail(symbol), [symbol]);
  const { data, error, isLoading, status, refetch } = useRemoteData(loader, [symbol]);

  return (
    <div className="space-y-6">
      {isLoading ? <CompanyDetailSkeleton /> : null}
      {status === 'error' && error ? <ErrorState message={error} onRetry={refetch} /> : null}
      {status === 'success' && !data ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" aria-hidden="true" />}
          title="No company found"
          description="The requested ticker is not available in the current company universe."
          actionLabel="Retry"
          onAction={refetch}
        />
      ) : null}
      {status === 'success' && data ? (
        <>
          <CompanyHeader company={data.company} />
          <CompanyPriceChart symbol={data.company.symbol} range={range} onRangeChange={setRange} />
          <div className="grid gap-6 lg:grid-cols-2">
            <CompanyEvents events={data.events.slice(0, 8)} />
            <CompanyChains chains={data.chains.slice(0, 6)} />
          </div>
        </>
      ) : null}
    </div>
  );
}
