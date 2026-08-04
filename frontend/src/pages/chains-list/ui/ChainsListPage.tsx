import { useCallback, useState } from 'react';
import { Network, Clock, Activity, CheckCircle2 } from 'lucide-react';
import { getChains } from '@/entities/chain/api/chainApi';
import { enrichChains } from '@/entities/chain/model/enrich';
import { ChainCard } from '@/entities/chain/ui/ChainCard';
import { ChainEvidenceGraph } from '@/entities/chain/ui/ChainEvidenceGraph';
import { getCompanies } from '@/entities/company/api/companyApi';
import { getEvents } from '@/entities/event/api/eventApi';
import { getPatterns } from '@/entities/pattern/api/patternApi';
import { getLatestPipelineJob } from '@/features/pipeline/api/pipelineApi';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { ChainCardSkeleton } from '@/shared/ui/Skeleton';
import { formatRelativeTime } from '@/shared/lib/time';

async function loadChains() {
  const [companies, patterns] = await Promise.all([getCompanies(''), getPatterns()]);
  const [chains, events] = await Promise.all([
    getChains(),
    getEvents(),
  ]);
  return enrichChains(chains, events, patterns);
}

function LiveJobStatus() {
  const loader = useCallback(() => getLatestPipelineJob('scheduled'), []);
  // useRemoteData will fetch on mount. We don't necessarily need high-frequency polling 
  // since this is just a subtle status line, but to keep it fresh without a new hook we'll just show the latest loaded state.
  const { data: job } = useRemoteData(loader, []);

  if (!job) return null;

  const isRunning = job.status === 'running' || job.status === 'pending';

  return (
    <div className="flex items-center gap-2 text-small text-text-secondary bg-surface-raised px-3 py-1.5 rounded-pill border border-border w-fit">
      {isRunning ? (
        <Activity className="h-4 w-4 text-accent animate-pulse" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-positive" />
      )}
      <span>
        Last live check: {formatRelativeTime(job.updated_at)}
        {!isRunning && job.current_step ? ` · ${job.current_step}` : ''}
        {isRunning ? ` · ${job.current_step || 'In progress'}` : ''}
      </span>
    </div>
  );
}

export function ChainsListPage() {
  const loader = useCallback(() => loadChains(), []);
  const { data, error, isLoading, status, refetch } = useRemoteData(loader, []);
  const [expandedChainId, setExpandedChainId] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <h1 className="text-display text-text-primary">Recent chains</h1>
        <LiveJobStatus />
      </div>

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
              <div key={chain.id} className="bg-canvas border-b border-border last:border-0 relative">
                <ChainCard 
                  chain={chain} 
                  onClick={() => setExpandedChainId(expandedChainId === chain.id ? null : chain.id)} 
                  expanded={expandedChainId === chain.id}
                >
                  {expandedChainId === chain.id && <ChainEvidenceGraph chainId={chain.id} windowDays={chain.pattern?.window_days} />}
                </ChainCard>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
