import { apiFetch } from '@/shared/api/client';
import type { Relationship } from '@/entities/relationship/model/types';

export const getRelationships = () => apiFetch<Relationship[]>('/market/relationships/');
