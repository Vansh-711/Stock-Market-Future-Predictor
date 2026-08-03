import { apiFetch } from '@/shared/api/client';
import type { MarketEvent } from '@/entities/event/model/types';

export const getEventsBySymbol = (symbol: string) =>
  apiFetch<MarketEvent[]>(`/market/events/?symbol=${encodeURIComponent(symbol)}`);

export const getEvents = () =>
  apiFetch<MarketEvent[]>(`/market/events/`);
