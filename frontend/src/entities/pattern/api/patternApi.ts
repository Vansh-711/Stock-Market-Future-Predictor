import { apiFetch } from '@/shared/api/client';
import type { BacktestPattern } from '@/entities/pattern/model/types';

export const getPatterns = () => apiFetch<BacktestPattern[]>('/market/patterns/');
