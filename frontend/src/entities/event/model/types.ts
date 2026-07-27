export type MarketEvent = {
  id: number;
  company: number;
  company_symbol: string;
  headline: string;
  event_type: string;
  sentiment_score: number;
  magnitude: number;
  published_at: string;
  source: string;
};
