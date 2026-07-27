import type { EnrichedChain, GeneratedChain } from '@/entities/chain/model/types';
import type { MarketEvent } from '@/entities/event/model/types';
import type { BacktestPattern } from '@/entities/pattern/model/types';

export function enrichChains(chains: GeneratedChain[], events: MarketEvent[], patterns: BacktestPattern[]): EnrichedChain[] {
  const eventById = new Map(events.map((event) => [event.id, event]));

  return chains.map((chain) => {
    const triggerEvent = eventById.get(chain.trigger_event);
    const pattern = patterns.find((candidate) => {
      const hitRateDelta = Math.abs(candidate.hit_rate - chain.backtest_hit_rate);
      return (
        candidate.relationship_type === chain.relationship_type &&
        candidate.predicted_direction === chain.predicted_direction &&
        hitRateDelta < 0.01 &&
        (!triggerEvent || candidate.trigger_event_type === triggerEvent.event_type)
      );
    });

    return { ...chain, triggerEvent, pattern };
  });
}

export function dedupeChains(chains: GeneratedChain[]) {
  const map = new Map<number, GeneratedChain>();
  chains.forEach((chain) => map.set(chain.id, chain));
  return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function dedupeEvents(events: MarketEvent[]) {
  const map = new Map<number, MarketEvent>();
  events.forEach((event) => map.set(event.id, event));
  return Array.from(map.values()).sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
}
