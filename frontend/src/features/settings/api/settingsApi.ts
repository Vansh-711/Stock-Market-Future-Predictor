import { apiFetch } from '@/shared/api/client';

export type LlmSettings = {
  key_set: boolean;
  key_suffix: string;
  gemini_model: string;
  ingest_delay_seconds: number;
  prefer_events: boolean;
};

export type SaveLlmSettings = {
  gemini_api_key?: string;
  clear_api_key?: boolean;
  gemini_model: string;
  ingest_delay_seconds: number;
  prefer_events: boolean;
};

export const getLlmSettings = () => apiFetch<LlmSettings>('/settings/llm/');

export const saveLlmSettings = (payload: SaveLlmSettings) =>
  apiFetch<LlmSettings>('/settings/llm/', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const testLlmConnection = () =>
  apiFetch<{ detail: string }>('/settings/llm/test/', { method: 'POST' });
