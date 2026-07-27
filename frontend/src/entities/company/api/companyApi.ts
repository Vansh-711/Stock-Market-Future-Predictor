import { apiFetch } from '@/shared/api/client';
import type { Company } from '@/entities/company/model/types';

export const getCompanies = (search = '') =>
  apiFetch<Company[]>(`/market/companies/?search=${encodeURIComponent(search)}`);
