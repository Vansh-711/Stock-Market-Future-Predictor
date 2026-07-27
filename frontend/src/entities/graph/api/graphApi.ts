import { apiFetch } from '@/shared/api/client';
import type { RelationshipGraphData } from '@/entities/graph/model/types';

export const getGraph = () => apiFetch<RelationshipGraphData>('/market/graph/');
