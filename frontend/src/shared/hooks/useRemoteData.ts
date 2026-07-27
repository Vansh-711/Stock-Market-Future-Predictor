import { useCallback, useEffect, useMemo, useState } from 'react';

type RemoteStatus = 'idle' | 'loading' | 'success' | 'error';

export type RemoteData<T> = {
  data: T | null;
  error: string | null;
  status: RemoteStatus;
  isLoading: boolean;
  refetch: () => void;
};

export function useRemoteData<T>(loader: () => Promise<T>, dependencies: unknown[] = []): RemoteData<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<RemoteStatus>('idle');
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refetch = useCallback(() => setRefreshIndex((value) => value + 1), []);

  const depKey = useMemo(() => JSON.stringify(dependencies), dependencies);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);

    loader()
      .then((result) => {
        if (!active) return;
        setData(result);
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load data');
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [loader, depKey, refreshIndex]);

  return { data, error, status, isLoading: status === 'loading' || status === 'idle', refetch };
}
