import { apiFetch } from '@/shared/api/client';
import type { GraphStats, RelationshipGraphData } from '@/entities/graph/model/types';

export const getGraph = () => apiFetch<RelationshipGraphData>('/market/graph/');

export const getGraphStats = () => apiFetch<GraphStats>('/market/graph/stats/');
