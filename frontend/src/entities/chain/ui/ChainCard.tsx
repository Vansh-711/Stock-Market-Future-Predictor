import { Link } from 'react-router-dom';
import { CompanyBadge } from '@/entities/company/ui/CompanyBadge';
import type { EnrichedChain, GeneratedChain } from '@/entities/chain/model/types';
import { ConfidenceBadge, DirectionBadge, HitRateBadge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { cn } from '@/shared/lib/cn';

type ChainCardProps = {
  chain: GeneratedChain | EnrichedChain;
  compact?: boolean;
  expanded?: boolean;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
};

const hasPattern = (chain: GeneratedChain | EnrichedChain): chain is EnrichedChain => 'pattern' in chain;

export function ChainCard({ chain, compact = false, expanded = false, className, children, onClick }: ChainCardProps) {
  const sampleSize = hasPattern(chain) ? chain.pattern?.sample_size : undefined;
  const href = `/chains/${chain.id}`;

  return (
    <Card onClick={onClick} className={cn('transition-colors duration-ui ease-out hover:bg-surface-hover', onClick ? 'cursor-pointer' : '', className)}>
      <div className="flex gap-4">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <CompanyBadge symbol={chain.trigger_symbol} to={`/companies/${chain.trigger_symbol}`} />
          <div className="relative h-6 w-3" aria-hidden="true">
            <div className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-border-strong" />
            <div className="absolute left-1/2 top-1/2 h-dot w-dot -translate-x-1/2 -translate-y-1/2 rounded-pill border border-border-strong bg-surface" />
          </div>
          <CompanyBadge symbol={chain.affected_symbol} to={`/companies/${chain.affected_symbol}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <p className={cn('text-body-medium text-text-primary', expanded ? '' : 'line-clamp-1')}>{chain.trigger_headline}</p>
            {!expanded ? (
              <Link className="hidden shrink-0 text-small text-accent transition-colors duration-ui ease-out hover:text-accent-hover sm:inline" to={href} onClick={(e) => e.stopPropagation()}>
                Read more
              </Link>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <DirectionBadge direction={chain.predicted_direction} />
            <ConfidenceBadge confidence={chain.model_confidence} />
            <HitRateBadge hitRate={chain.backtest_hit_rate} sampleSize={sampleSize} />
          </div>

          <p className={cn('mt-4 text-body text-text-secondary', expanded ? '' : compact ? 'line-clamp-2' : 'line-clamp-3')}>{chain.explanation}</p>
          
          {children}

          {!expanded ? (
            <Link className="mt-3 inline-flex text-small text-accent transition-colors duration-ui ease-out hover:text-accent-hover sm:hidden" to={href} onClick={(e) => e.stopPropagation()}>
              Read more
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
