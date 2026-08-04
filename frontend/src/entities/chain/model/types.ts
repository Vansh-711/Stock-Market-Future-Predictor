import type { BacktestPattern } from '@/entities/pattern/model/types';
import type { MarketEvent } from '@/entities/event/model/types';

export type GeneratedChain = {
  id: number;
  trigger_event: number;
  trigger_headline: string;
  trigger_symbol: string;
  affected_company: number;
  affected_symbol: string;
  relationship_type: string;
  predicted_direction: string;
  model_confidence: number;
  backtest_hit_rate: number;
  explanation: string;
  source: 'backtest' | 'live';
  created_at: string;
};

export type EnrichedChain = GeneratedChain & {
  triggerEvent?: MarketEvent;
  pattern?: BacktestPattern;
};
