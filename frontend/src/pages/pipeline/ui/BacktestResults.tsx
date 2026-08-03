import { useEffect } from 'react';
import { Target, AlertTriangle, Info } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { getPatterns } from '@/entities/pattern/api/patternApi';

function getHitRateColor(hitRate: number, sampleSize: number) {
  if (sampleSize < 3) return 'text-text-muted';
  if (hitRate >= 0.65) return 'text-positive';
  if (hitRate <= 0.35) return 'text-negative';
  return 'text-accent';
}

function getBgColor(hitRate: number, sampleSize: number) {
  if (sampleSize < 3) return 'bg-surface-raised';
  
  // High confidence patterns get stronger background
  if (sampleSize >= 5) {
    if (hitRate >= 0.65) return 'bg-positive-muted/30 border-positive/30';
    if (hitRate <= 0.35) return 'bg-negative-muted/30 border-negative/30';
    return 'bg-accent-muted/30 border-accent/30';
  }
  
  // Moderate confidence
  if (hitRate >= 0.65) return 'bg-positive-muted/10 border-positive/10';
  if (hitRate <= 0.35) return 'bg-negative-muted/10 border-negative/10';
  return 'bg-accent-muted/10 border-accent/10';
}

export function BacktestResults({ isActive }: { isActive: boolean }) {
  const { data: patterns, refetch } = useRemoteData(getPatterns, []);
  
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(refetch, 3000);
      return () => clearInterval(interval);
    }
  }, [isActive, refetch]);

  if (!patterns || patterns.length === 0) {
    return (
      <Card className="p-0 overflow-hidden mt-6">
        <div className="bg-surface-raised px-5 py-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Target className="text-accent w-icon h-icon" />
            <h3 className="text-h3 text-text-primary">Historical Patterns</h3>
          </div>
        </div>
        <div className="p-10 text-center flex flex-col items-center">
          <Info className="w-6 h-6 text-text-muted mb-2" />
          <p className="text-body text-text-secondary">
            {isActive ? "Awaiting backtest computation..." : "No patterns reached the minimum statistical significance threshold (n ≥ 3) in this dataset."}
          </p>
        </div>
      </Card>
    );
  }

  // Group by window_days
  const windows = Array.from(new Set(patterns.map(p => p.window_days))).sort((a, b) => a - b);
  
  return (
    <Card className="p-0 overflow-hidden mt-6">
      <div className="bg-surface-raised px-5 py-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Target className="text-accent w-icon h-icon" />
          <h3 className="text-h3 text-text-primary">Historical Patterns Discovered</h3>
        </div>
        <span className="text-small text-text-muted font-data">{patterns.length} patterns</span>
      </div>
      
      <div className="p-5">
        <div className="flex flex-col gap-8">
          {windows.map(window => {
            const windowPatterns = patterns.filter(p => p.window_days === window).sort((a, b) => b.sample_size - a.sample_size);
            if (windowPatterns.length === 0) return null;
            
            return (
              <div key={window}>
                <h4 className="text-body-medium text-text-primary mb-3 pb-2 border-b border-border">{window}-Day Horizon</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {windowPatterns.map(pattern => {
                    const isThin = pattern.sample_size < 5;
                    return (
                      <div 
                        key={pattern.id}
                        className={`p-3 rounded-control border ${getBgColor(pattern.hit_rate, pattern.sample_size)} relative group`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-small-medium text-text-primary truncate" title={pattern.trigger_event_type}>
                            {pattern.trigger_event_type.replace('_', ' ')}
                          </span>
                          <span className="text-small text-text-muted font-data shrink-0">
                            → {pattern.relationship_type}
                          </span>
                        </div>
                        
                        <div className="flex items-end justify-between mt-3">
                          <div>
                            <p className={`text-data-lg leading-none ${getHitRateColor(pattern.hit_rate, pattern.sample_size)}`}>
                              {(pattern.hit_rate * 100).toFixed(0)}%
                            </p>
                            <p className="text-small text-text-muted mt-1">Expected: {pattern.predicted_direction}</p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 bg-surface rounded-pill px-2 py-0.5 border border-border">
                            {isThin && <AlertTriangle className="w-3 h-3 text-warning" />}
                            <span className="text-small font-data text-text-secondary">n={pattern.sample_size}</span>
                          </div>
                        </div>
                        
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-canvas-tooltip border border-border text-text-primary text-small p-2 rounded-control bottom-full left-1/2 -translate-x-1/2 -translate-y-2 pointer-events-none z-10 w-48 shadow-lg">
                          n={pattern.sample_size}, {(pattern.hit_rate * 100).toFixed(1)}% hit, {window}-day window.
                          Avg move: {(pattern.avg_move_pct * 100).toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
