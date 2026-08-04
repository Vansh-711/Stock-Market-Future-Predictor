import { useEffect, useState } from 'react';
import { Check, CheckCircle2, XCircle, Copy, TerminalSquare } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { InteractiveHoverButton } from '@/shared/ui/interactive-hover-button';
import { verifyPipeline, VerifyResult } from '@/features/pipeline/api/pipelineApi';
import { API_BASE_URL } from '@/shared/config/env';

export function VerifyResults({ isCompleted }: { isCompleted: boolean }) {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isCompleted) {
      setLoading(true);
      verifyPipeline()
        .then(setResult)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isCompleted]);

  if (!isCompleted && !result) {
    return null;
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(API_BASE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-0 overflow-hidden mt-6">
      <div className="bg-surface-raised px-5 py-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Check className="text-accent w-icon h-icon" />
          <h3 className="text-h3 text-text-primary">Pipeline Verification</h3>
        </div>
      </div>
      
      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : result ? (
          <div className="space-y-6">
            <div className="bg-surface-raised rounded-control border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-body-medium text-text-primary">System Smoke Tests</span>
                {result.all_passed ? (
                  <span className="flex items-center gap-1.5 text-small-medium text-positive">
                    <CheckCircle2 className="w-4 h-4" /> All checks passed
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-small-medium text-negative">
                    <XCircle className="w-4 h-4" /> Checks failed
                  </span>
                )}
              </div>
              <ul className="divide-y divide-border">
                {result.checks.map(check => (
                  <li key={check.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="mt-0.5">
                      {check.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-positive" />
                      ) : (
                        <XCircle className="w-5 h-5 text-negative" />
                      )}
                    </div>
                    <div>
                      <p className="text-body-medium text-text-primary">{check.name}</p>
                      <p className="text-small text-text-muted mt-0.5">{check.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-text-muted">Verification failed to run.</div>
        )}
      </div>
    </Card>
  );
}
