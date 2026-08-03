import { apiFetch } from '@/shared/api/client';

export type PipelineLog = {
  id: number;
  level: 'info' | 'warning' | 'error';
  message: string;
  created_at: string;
};

export type PipelineJob = {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  phase: string;
  progress_percent: number;
  current_step: string;
  items_total: number;
  items_done: number;
  records_created: number;
  records_target: number;
  error: string | null;
  cancel_requested: boolean;
  created_at: string;
  updated_at: string;
  logs: PipelineLog[];
};

export const createPipelineJob = (payload: { phases: string[], upload_path?: string, adapter_id?: string }) =>
  apiFetch<PipelineJob>('/pipeline/jobs/', { method: 'POST', body: JSON.stringify(payload) });

export const uploadPipelineFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<{ file_path: string, adapter: string, preview: any[], total_rows: number }>('/pipeline/upload/', {
    method: 'POST',
    body: formData,
    skipJsonContentType: true,
  });
};

export const getPipelineJob = (jobId: string) => apiFetch<PipelineJob>(`/pipeline/jobs/${jobId}/`);

export const getLatestPipelineJob = () => apiFetch<PipelineJob | null>('/pipeline/jobs/latest/');

export const cancelPipelineJob = (jobId: string) =>
  apiFetch<PipelineJob>(`/pipeline/jobs/${jobId}/cancel/`, { method: 'POST' });

export type ModelMetrics = {
  n_samples: number;
  classification_report: Record<string, any>;
  confusion_matrix: number[][];
  feature_coefficients: Record<string, number>;
};

export const getModelMetrics = () => apiFetch<ModelMetrics>('/market/model/metrics/');

export type VerifyCheck = {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
};

export type VerifyResult = {
  all_passed: boolean;
  checks: VerifyCheck[];
};

export const verifyPipeline = () => apiFetch<VerifyResult>('/market/verify/', { method: 'POST' });

export const clearPipelineData = () => apiFetch<{status: string, message: string}>('/market/clear/', { method: 'POST' });

export const getChainEvidence = (chainId: number) => 
  apiFetch<any>(`/market/chains/${chainId}/evidence/`);
