import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/shared/ui/Card';
import { Terminal, ShieldAlert, Sparkles, Filter } from 'lucide-react';
import { triggerLiveIngest } from '@/features/pipeline/api/pipelineApi';
import type { PipelineJob } from '@/features/pipeline/api/pipelineApi';
import { formatInteger } from '@/shared/lib/format';
import { InteractiveHoverButton } from '@/shared/ui/interactive-hover-button';

export function IngestLiveFeed({ job, isActive, onLiveJobCreated }: { job: PipelineJob, isActive: boolean, onLiveJobCreated?: (job: any) => void }) {
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const logs = job.logs || [];

  // Extract structured logs for the feed
  const feedLogs = logs.filter(log => log.message.startsWith('SKIP|') || log.message.startsWith('GEMINI|') || log.message.startsWith('SYSTEM|'));

  useEffect(() => {
    if (feedContainerRef.current) {
      feedContainerRef.current.scrollTop = feedContainerRef.current.scrollHeight;
    }
  }, [feedLogs]);

  if (!isActive && feedLogs.length === 0) return null;

  return (
    <Card className="p-0 overflow-hidden mt-6 bg-canvas border-border/40 shadow-inner">
      <div className="bg-surface-raised px-5 py-4 border-b border-border/50 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Terminal className="text-accent w-icon h-icon" />
          <h3 className="text-h3 text-text-primary">Real-Time Ingestion Feed</h3>
        </div>
        <div className="flex items-center gap-4 text-small font-data">
          <span className="text-negative flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Filtered</span>
          <span className="text-positive flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Accepted</span>
        </div>
      </div>

      <div ref={feedContainerRef} className="max-h-[400px] overflow-y-auto p-4 space-y-2 font-data text-small">
        <AnimatePresence initial={false}>
          {feedLogs.map((log) => {
            const isSkip = log.message.startsWith('SKIP|');
            const parts = log.message.split('|');
            const type = parts[1] || 'Unknown';
            const headline = parts[2] || '';

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10, x: isSkip ? -10 : 10 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.3 }}
                className={`p-3 rounded-control border flex items-start gap-3 ${
                  isSkip 
                    ? 'bg-negative-muted/20 border-negative/20 text-negative/80' 
                    : 'bg-positive-muted/20 border-positive/20 text-positive/90'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isSkip ? <ShieldAlert className="w-4 h-4 text-negative" /> : <Sparkles className="w-4 h-4 text-positive" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className={`text-small-medium uppercase tracking-wider ${
                      log.message.startsWith('SYSTEM|') ? 'text-accent' :
                      isSkip ? 'text-negative' : 'text-positive'
                    }`}>
                      {log.message.startsWith('SYSTEM|') ? 'SYSTEM ALERT' : (isSkip ? 'REJECTED' : 'ACCEPTED')}
                    </span>
                    <span className="text-[10px] opacity-60">
                      {new Date(log.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-text-primary mb-1 truncate" title={headline}>
                    {headline}
                  </div>
                  <div className="text-[11px] font-sans">
                    <span className="opacity-70">{log.message.startsWith('SYSTEM|') ? 'Message: ' : 'Reason: '}</span>
                    <span className={isSkip ? 'text-negative' : 'text-accent'}>{type}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {isActive && feedLogs.length === 0 && (
          <div className="py-12 text-center text-text-muted flex flex-col items-center justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-text-muted border-t-transparent animate-spin mb-4" />
            Scanning file...
          </div>
        )}
      </div>

      {!isActive && (
        <div className="p-5 border-t border-border/50 bg-surface flex flex-col items-center gap-3">
          <p className="text-body text-text-secondary text-center">Already trained the model? Poll for live events immediately.</p>
          <InteractiveHoverButton 
            className="w-full max-w-sm mx-auto border-accent text-accent hover:bg-accent hover:text-white"
            onClick={async () => {
              try {
                const newJob = await triggerLiveIngest(5);
                if (onLiveJobCreated) onLiveJobCreated(newJob);
              } catch (err) {
                console.error(err);
              }
            }}
            text="Force Fetch Live News"
          />
        </div>
      )}
    </Card>
  );
}
