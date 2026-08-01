import { useEffect } from 'react';
import { FlaskConical, AlertCircle, Info, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { getModelMetrics } from '@/features/pipeline/api/pipelineApi';

export function TrainResults({ isActive }: { isActive: boolean }) {
  const { data: metrics, refetch, error } = useRemoteData(getModelMetrics, []);
  
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(refetch, 3000);
      return () => clearInterval(interval);
    }
  }, [isActive, refetch]);

  if (error && error.includes('not trained')) {
    return (
      <Card className="p-0 overflow-hidden mt-6">
        <div className="bg-surface-raised px-5 py-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FlaskConical className="text-accent w-icon h-icon" />
            <h3 className="text-h3 text-text-primary">Explainable Confidence Model</h3>
          </div>
        </div>
        <div className="p-10 text-center flex flex-col items-center">
          <Info className="w-6 h-6 text-text-muted mb-2" />
          <p className="text-body text-text-secondary">Awaiting model training phase...</p>
        </div>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="p-0 overflow-hidden mt-6">
        <div className="bg-surface-raised px-5 py-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FlaskConical className="text-accent w-icon h-icon" />
            <h3 className="text-h3 text-text-primary">Explainable Confidence Model</h3>
          </div>
        </div>
        <div className="p-10 text-center flex flex-col items-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
            <p className="text-body text-text-secondary">Fetching metrics...</p>
          </div>
        </div>
      </Card>
    );
  }

  const accuracy = metrics.classification_report?.accuracy || 0;
  
  // Sort coefficients by absolute magnitude to show the most impactful ones
  const sortedCoefficients = Object.entries(metrics.feature_coefficients)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 8); // Top 8 features

  return (
    <Card className="p-0 overflow-hidden mt-6">
      <div className="bg-surface-raised px-5 py-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FlaskConical className="text-accent w-icon h-icon" />
          <h3 className="text-h3 text-text-primary">Explainable Confidence Model</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-small text-text-muted font-data">n={metrics.n_samples} samples</span>
          <span className={`px-2 py-0.5 rounded-pill text-small-medium ${accuracy > 0.6 ? 'bg-positive-muted text-positive' : 'bg-surface-hover text-text-primary'}`}>
            {(accuracy * 100).toFixed(1)}% Accuracy
          </span>
        </div>
      </div>
      
      <div className="p-5 grid gap-6 md:grid-cols-2">
        {/* Left Column: Confusion Matrix & Info */}
        <div className="flex flex-col gap-5">
          <div>
            <h4 className="text-body-medium text-text-primary mb-3">Confusion Matrix (Test Set)</h4>
            <div className="bg-surface-raised rounded-control border border-border p-4">
              <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center text-center font-data text-small">
                {/* Header */}
                <div></div>
                <div className="text-text-muted pb-2">Pred: Down</div>
                <div className="text-text-muted pb-2">Pred: Up</div>
                
                {/* True Negative Row */}
                <div className="text-text-muted text-right pr-3 font-medium flex items-center justify-end gap-1">
                  True: Down <ChevronRight className="w-3 h-3" />
                </div>
                <div className="bg-canvas border border-border rounded p-3 text-text-primary flex flex-col">
                  <span className="text-h3">{metrics.confusion_matrix[0][0]}</span>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider mt-1">True Neg</span>
                </div>
                <div className="bg-negative-muted/20 border border-negative/20 rounded p-3 text-negative flex flex-col">
                  <span className="text-h3">{metrics.confusion_matrix[0][1]}</span>
                  <span className="text-[10px] uppercase tracking-wider mt-1 opacity-70">False Pos</span>
                </div>
                
                {/* True Positive Row */}
                <div className="text-text-muted text-right pr-3 font-medium flex items-center justify-end gap-1">
                  True: Up <ChevronRight className="w-3 h-3" />
                </div>
                <div className="bg-negative-muted/20 border border-negative/20 rounded p-3 text-negative flex flex-col">
                  <span className="text-h3">{metrics.confusion_matrix[1][0]}</span>
                  <span className="text-[10px] uppercase tracking-wider mt-1 opacity-70">False Neg</span>
                </div>
                <div className="bg-positive-muted/20 border border-positive/20 rounded p-3 text-positive flex flex-col">
                  <span className="text-h3">{metrics.confusion_matrix[1][1]}</span>
                  <span className="text-[10px] uppercase tracking-wider mt-1 opacity-70">True Pos</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-surface-raised p-4 rounded-control border border-border flex gap-3 text-text-secondary text-small">
            <AlertCircle className="w-5 h-5 text-accent shrink-0" />
            <p>
              Modest accuracy is expected on small samples. This is an explainable logistic regression model designed to provide confidence scores for generated hypotheses, rather than an opaque black-box price predictor.
            </p>
          </div>
        </div>

        {/* Right Column: Feature Coefficients */}
        <div>
          <h4 className="text-body-medium text-text-primary mb-3">Top Feature Coefficients</h4>
          <div className="border border-border rounded-control overflow-hidden">
            <table className="w-full text-left text-small">
              <thead className="bg-surface-raised border-b border-border text-text-muted uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">Feature</th>
                  <th className="px-4 py-2 font-medium text-right">Coefficient</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-data bg-canvas">
                {sortedCoefficients.map(([feature, coef]) => (
                  <tr key={feature} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-2.5 text-text-primary truncate max-w-[200px]" title={feature}>
                      {feature.replace('event_type_', 'Event: ').replace('relationship_type_', 'Rel: ')}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {coef > 0 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                        ) : coef < 0 ? (
                          <XCircle className="w-3.5 h-3.5 text-negative" />
                        ) : null}
                        <span className={coef > 0 ? 'text-positive' : coef < 0 ? 'text-negative' : 'text-text-muted'}>
                          {coef > 0 ? '+' : ''}{coef.toFixed(4)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
}
