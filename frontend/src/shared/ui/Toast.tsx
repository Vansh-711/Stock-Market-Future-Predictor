import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '@/shared/ui/IconButton';
import { cn } from '@/shared/lib/cn';

type ToastKind = 'success' | 'error';

type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastContextValue = {
  showToast: (kind: ToastKind, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (kind: ToastKind, message: string) => {
      const id = Date.now() + Math.round(Math.random() * 1000);
      setToasts((current) => [...current, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-3 sm:left-auto sm:w-detail-panel">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'animate-fade overflow-hidden rounded-card border border-border-strong bg-surface-raised',
              toast.kind === 'success' ? 'border-l-2 border-l-positive' : 'border-l-2 border-l-negative',
            )}
          >
            <div className="flex items-start gap-3 p-4">
              <p className="flex-1 text-body text-text-primary">{toast.message}</p>
              <IconButton label="Close notification" onClick={() => dismiss(toast.id)}>
                <X className="h-icon w-icon" aria-hidden="true" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
