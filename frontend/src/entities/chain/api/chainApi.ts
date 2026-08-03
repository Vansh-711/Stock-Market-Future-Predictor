import { apiFetch } from '@/shared/api/client';
import type { GeneratedChain } from '@/entities/chain/model/types';

export const getChainsBySymbol = (symbol: string) =>
  apiFetch<GeneratedChain[]>(`/market/chains/?symbol=${encodeURIComponent(symbol)}`);

export const getChains = () =>
  apiFetch<GeneratedChain[]>(`/market/chains/`);
