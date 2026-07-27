import { BarChart3 } from 'lucide-react';
import type { EnrichedChain } from '@/entities/chain/model/types';
import { ChainCard } from '@/entities/chain/ui/ChainCard';
import { DirectionBadge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { formatEventType, formatPercent, formatRelationshipType, formatSignedPercent } from '@/shared/lib/format';
import { buildPostEventSeries } from '@/shared/lib/priceSeries';
import { PriceChart } from '@/widgets/price-chart/ui/PriceChart';

export function ChainDetailView({ chain }: { chain: EnrichedChain }) {
  const chartData = buildPostEventSeries(chain.affected_symbol, chain.predicted_direction, chain.created_at, chain.model_confidence);
  const tone = chain.predicted_direction === 'down' ? 'negative' : 'positive';

  return (
    <div className="space-y-6">
      <ChainCard chain={chain} expanded />

      <PriceChart data={chartData} label={`${chain.affected_symbol} price after trigger event`} tone={tone} height={220} />

      <Card title="How reliable is this pattern">
        {chain.pattern ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-3 text-left text-small-medium text-text-secondary">Trigger event</th>
                  <th className="px-3 py-3 text-left text-small-medium text-text-secondary">Relationship</th>
                  <th className="px-3 py-3 text-right text-small-medium text-text-secondary">Window</th>
                  <th className="px-3 py-3 text-right text-small-medium text-text-secondary">Sample size</th>
                  <th className="px-3 py-3 text-right text-small-medium text-text-secondary">Hit rate</th>
                  <th className="px-3 py-3 text-right text-small-medium text-text-secondary">Avg move %</th>
                  <th className="px-3 py-3 text-left text-small-medium text-text-secondary">Direction badge</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-3 text-body text-text-primary">{formatEventType(chain.pattern.trigger_event_type)}</td>
                  <td className="px-3 py-3 text-body text-text-secondary">{formatRelationshipType(chain.pattern.relationship_type)}</td>
                  <td className="px-3 py-3 text-right text-data text-text-primary">{chain.pattern.window_days}d</td>
                  <td className="px-3 py-3 text-right text-data text-text-primary">{chain.pattern.sample_size}</td>
                  <td className="px-3 py-3 text-right text-data text-text-primary">{formatPercent(chain.pattern.hit_rate)}</td>
                  <td className="px-3 py-3 text-right text-data text-text-primary">{formatSignedPercent(chain.pattern.avg_move_pct)}</td>
                  <td className="px-3 py-3">
                    <DirectionBadge direction={chain.pattern.predicted_direction} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<BarChart3 className="h-8 w-8" aria-hidden="true" />}
            title="No pattern match yet"
            description="The chain loaded, but the matching backtest pattern is not available in the current dataset."
          />
        )}
      </Card>
    </div>
  );
}
