import { API_BASE_URL } from '@/shared/config/env';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type ApiOptions = RequestInit & {
  skipJsonContentType?: boolean;
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  const fallback = `Request failed with status ${response.status}`;
  try {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as unknown;
      if (payload && typeof payload === 'object') {
        if ('detail' in payload && typeof payload.detail === 'string') return payload.detail;
        if ('error' in payload && typeof payload.error === 'string') return payload.error;
        return Object.entries(payload as Record<string, unknown>)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
          .join(' · ');
      }
    }
    const text = await response.text();
    return text || fallback;
  } catch {
    return fallback;
  }
};

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { skipJsonContentType, headers, ...init } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(skipJsonContentType ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
