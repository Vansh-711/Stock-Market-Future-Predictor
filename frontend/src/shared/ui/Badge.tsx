import { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { formatPercent } from '@/shared/lib/format';

type BadgeProps = {
  children: ReactNode;
  className?: string;
};

export function PillBadge({ children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-pill px-2.5 py-1 text-small-medium leading-none', className)}>
      {children}
    </span>
  );
}

export function DirectionBadge({ direction }: { direction: string }) {
  const isDown = direction === 'down';
  return (
    <PillBadge className={isDown ? 'bg-negative-muted text-negative' : 'bg-positive-muted text-positive'}>
      {isDown ? '↓ down' : '↑ up'}
    </PillBadge>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.abs(confidence) <= 1 ? confidence * 100 : confidence;
  if (percent >= 65) {
    return <PillBadge className="bg-positive-muted text-positive">high confidence</PillBadge>;
  }
  if (percent >= 45) {
    return <PillBadge className="bg-warning-muted text-warning">medium confidence</PillBadge>;
  }
  return <PillBadge className="border border-border bg-transparent text-text-muted">low confidence</PillBadge>;
}

export function HitRateBadge({ hitRate, sampleSize }: { hitRate: number; sampleSize?: number }) {
  return (
    <PillBadge className="bg-surface-raised text-text-primary">
      <span className="text-data text-text-primary">{formatPercent(hitRate)}</span>
      {typeof sampleSize === 'number' ? <span className="text-small-medium text-text-secondary">· n={sampleSize}</span> : null}
    </PillBadge>
  );
}

import { AlertTriangle } from 'lucide-react';
import type { GeneratedChain, EnrichedChain } from '@/entities/chain/model/types';

export function SourceBadge({ chain }: { chain: GeneratedChain | EnrichedChain }) {
  if (chain.source === 'backtest') {
    return (
      <PillBadge className="bg-surface-raised text-text-secondary border border-border">
        Backtested
      </PillBadge>
    );
  }

  if (chain.source === 'live' && chain.backtest_hit_rate !== null) {
    return (
      <PillBadge className="bg-warning-muted text-warning">
        <span className="h-dot w-dot rounded-pill bg-warning" aria-hidden="true" />
        Live — Pattern Match
      </PillBadge>
    );
  }

  return (
    <PillBadge className="border border-negative/30 bg-negative-muted/10 text-negative flex items-center gap-1.5">
      <AlertTriangle className="h-3 w-3" />
      Live — ML Estimate Only
    </PillBadge>
  );
}

export function LiveSourceBadge({ type }: { type: 'live data' | 'historical' }) {
  return (
    <span className="inline-flex items-center gap-2 text-small text-text-secondary">
      <span className={cn('h-dot w-dot rounded-pill', type === 'live data' ? 'bg-accent' : 'bg-text-muted')} aria-hidden="true" />
      {type}
    </span>
  );
}
