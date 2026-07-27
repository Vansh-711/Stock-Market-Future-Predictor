export type PredictedDirection = 'up' | 'down' | string;

export type BacktestPattern = {
  id: number;
  trigger_event_type: string;
  relationship_type: string;
  window_days: number;
  sample_size: number;
  hit_rate: number;
  avg_move_pct: number;
  predicted_direction: PredictedDirection;
  computed_at: string;
};
