import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Ban, Check, Circle, Database, FileUp, FlaskConical, GitBranch, Play, ScanSearch, Sparkles, XCircle } from 'lucide-react';
import * as pipelineApi from '@/features/pipeline/api/pipelineApi';
import type { PipelineJob } from '@/features/pipeline/api/pipelineApi';
import { Card } from '@/shared/ui/Card';
import { InteractiveHoverButton } from '@/shared/ui/interactive-hover-button';
import { ErrorState } from '@/shared/ui/ErrorState';
import { formatInteger } from '@/shared/lib/format';
import { formatRelativeTime } from '@/shared/lib/time';
import { useToast } from '@/shared/ui/Toast';
import { getGraphStats } from '@/entities/graph/api/graphApi';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { IngestUpload } from './IngestUpload';
import { BacktestResults } from './BacktestResults';
import { TrainResults } from './TrainResults';
import { ChainsResults } from './ChainsResults';
import { VerifyResults } from './VerifyResults';
import { IngestLiveFeed } from './IngestLiveFeed';
import { ResetDataModal } from '@/shared/ui/ResetDataModal';

const stages = [
  { id: 'seed', short: 'A', title: 'Graph Sync', detail: 'Map companies & supply-chain relationships', longDetail: 'Synchronizes your company universe and their supplier, customer, competitor, and peer relationships into a knowledge graph.', icon: Database, available: true },
  { id: 'ingest', short: 'B', title: 'Ingest', detail: 'Upload & AI-classify news headlines', longDetail: 'Gemini LLM scans every headline, filtering opinions and extracting hard market events like earnings beats, supply disruptions, and guidance changes.', icon: FileUp, available: true },
  { id: 'backtest', short: 'C', title: 'Backtest', detail: 'Validate patterns against history', longDetail: 'Cross-references extracted events against 2 years of Yahoo Finance price data to measure if predicted supply-chain effects actually moved the market.', icon: ScanSearch, available: true },
  { id: 'train', short: 'D', title: 'Train', detail: 'Fit the confidence model', longDetail: 'Trains a logistic regression model on validated event-price pairs to learn which factors best predict market direction. Requires ≥30 samples.', icon: FlaskConical, available: true },
  { id: 'chains', short: 'E', title: 'Chains', detail: 'Generate trading hypotheses', longDetail: 'Combines backtest hit-rates with ML confidence scores to produce actionable multi-step trading signals across the supply chain.', icon: GitBranch, available: true },
  { id: 'verify', short: 'F', title: 'Verify', detail: 'Run system smoke tests', longDetail: 'Validates that graph data, event store, trained model, and chain outputs are all internally consistent and production-ready.', icon: Check, available: true },
];

const terminalStates = new Set(['completed', 'failed', 'cancelled']);

function statusTone(status: PipelineJob['status']) {
  if (status === 'completed') return 'bg-positive-muted text-positive';
  if (status === 'failed' || status === 'cancelled') return 'bg-negative-muted text-negative';
  return 'bg-accent-muted text-accent';
}

function TabEmptyState({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
  return (
    <Card className="mt-6 flex flex-col items-center justify-center p-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-raised mb-4">
        <Icon className="h-10 w-10 text-text-muted" />
      </div>
      <h3 className="text-h3 text-text-primary">{title}</h3>
      <p className="mt-3 max-w-lg text-body text-text-secondary">{description}</p>
    </Card>
  );
}

export function PipelinePage() {
  const { showToast } = useToast();
  const [job, setJob] = useState<PipelineJob | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const graphStatsLoader = useCallback(() => getGraphStats(), []);
  const graphHealth = useRemoteData(graphStatsLoader, []);
  const graphStats = graphHealth.data;
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pipelineApi.getLatestPipelineJob()
      .then((latestJob) => {
        if (latestJob) setJob(latestJob);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [job?.logs]);

  useEffect(() => {
    if (!job || terminalStates.has(job.status)) return;
    const interval = window.setInterval(() => {
      pipelineApi.getPipelineJob(job.job_id).then(setJob).catch((pollError) => setError(pollError instanceof Error ? pollError.message : 'Pipeline status could not be refreshed.'));
    }, 1200);
    return () => window.clearInterval(interval);
  }, [job?.job_id, job?.status]);

  useEffect(() => {
    if (job?.status === 'completed') graphHealth.refetch();
  }, [job?.status]);

  const activeIndex = useMemo(() => stages.findIndex((stage) => stage.id === job?.phase), [job?.phase]);
  const [selectedTab, setSelectedTab] = useState<number | null>(null);
  const [isUploadingNew, setIsUploadingNew] = useState(false);
  
  const currentTab = selectedTab !== null ? selectedTab : Math.max(0, activeIndex);
  
  // Auto-switch tabs when the pipeline advances naturally, but don't force it if user clicked around
  useEffect(() => {
    if (activeIndex > 0 && selectedTab === null) {
      setSelectedTab(activeIndex);
    } else if (activeIndex > 0 && selectedTab !== null && selectedTab < activeIndex) {
      // If they were on the previous tab watching it, automatically pull them forward to the new tab
      if (selectedTab === activeIndex - 1) {
        setSelectedTab(activeIndex);
      }
    }
  }, [activeIndex]);

  const start = async (phases: string[] = ['seed'], uploadData?: { file_path: string, adapter_id: string, ingest_limit: number }) => {
    setIsStarting(true);
    setError(null);
    try {
      const payload: any = { phases };
      if (uploadData) {
        payload.upload_path = uploadData.file_path;
        payload.adapter_id = uploadData.adapter_id;
        payload.ingest_limit = uploadData.ingest_limit;
      }
      const created = await pipelineApi.createPipelineJob(payload);
      setJob(created);
      showToast('success', `Pipeline queued for: ${phases.join(', ')}`);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Pipeline could not be started.');
    } finally {
      setIsStarting(false);
    }
  };

  const cancel = async () => {
    if (!job) return;
    setIsCancelling(true);
    try {
      setJob(await pipelineApi.cancelPipelineJob(job.job_id));
      showToast('success', 'Cancellation requested.');
    } catch (cancelError) {
      showToast('error', cancelError instanceof Error ? cancelError.message : 'Cancellation could not be requested.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleClearData = async () => {
    setIsClearing(true);
    setIsResetModalOpen(false);
    try {
      await pipelineApi.clearPipelineData();
      setJob(null);
      setError(null);
      graphHealth.refetch();
      showToast('success', 'All pipeline data reset to empty.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to clear data.');
    } finally {
      setIsClearing(false);
    }
  };

  if (error && !job) return <ErrorState message={error} onRetry={() => setError(null)} />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6">
        <div>
          <p className="eyebrow-label text-accent">PIPELINE CONTROL</p>
          <h1 className="mt-2 text-display text-text-primary">Research workflow</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">A durable execution record for every dataset and analytical step—not a black-box run button.</p>
        </div>
        <div className="flex gap-3">
          <InteractiveHoverButton 
            className="border-negative text-negative hover:bg-negative hover:text-white"
            onClick={() => setIsResetModalOpen(true)} 
            disabled={isStarting || isCancelling} 
            text="Reset all data" 
          />
          <InteractiveHoverButton onClick={() => start(['seed'])} disabled={Boolean(job && !terminalStates.has(job.status)) || isStarting} text={isStarting ? 'Starting...' : 'Sync graph only'} />
        </div>
      </header>
      
      <ResetDataModal 
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleClearData}
        isClearing={isClearing}
      />

      <Card className="p-0 overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-h3 text-text-primary">Execution path</h2>
          <p className="mt-1 text-small text-text-secondary">Click any stage below to inspect its data and progress.</p>
        </div>
        <div className="flex flex-col md:flex-row relative z-0 w-full overflow-hidden">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === activeIndex && job && !terminalStates.has(job.status);
            const isComplete = job?.status === 'completed' ? index <= activeIndex : index < activeIndex;
            const isSelected = index === currentTab;
            
            return (
              <div 
                key={stage.id} 
                onClick={() => setSelectedTab(index)}
                className={`flex-1 relative cursor-pointer p-5 md:p-4 group transition-all duration-300 border-l-4 md:border-l-0 md:border-b-4 ${isSelected ? 'border-accent bg-surface-raised' : 'border-transparent hover:bg-surface-hover hover:-translate-y-[2px]'}`}
              >
                {/* Connection lines between stages */}
                {index < stages.length - 1 && (
                  <>
                    <div className={`hidden md:block absolute top-[28px] left-[50%] w-full h-[2px] z-[-1] ${isComplete ? 'bg-positive' : 'bg-surface-raised'}`} />
                    <div className={`md:hidden absolute top-[44px] left-[35px] h-full w-[2px] z-[-1] ${isComplete ? 'bg-positive' : 'bg-surface-raised'}`} />
                  </>
                )}
                
                <div className="flex flex-row md:flex-col items-start md:items-center gap-4">
                  {/* Circle indicator */}
                  <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas z-10 transition-colors duration-300
                    ${isComplete ? 'bg-positive text-white border-positive' : 
                      isActive ? 'border-2 border-accent text-accent animate-pulse' : 
                      isSelected ? 'border-2 border-accent text-accent' : 'bg-surface-raised text-text-muted border border-border'}
                  `}>
                    {isComplete ? <Check className="h-4 w-4" /> : <span className="text-small-medium font-bold">{stage.short}</span>}
                  </div>
                  
                  <div className="md:text-center mt-1 md:mt-2">
                    <div className="flex items-center md:justify-center gap-1.5">
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-accent' : stage.available ? 'text-text-primary' : 'text-text-muted'}`} />
                      <h3 className={`text-body-medium transition-colors ${isSelected ? 'text-text-primary font-bold' : 'text-text-primary group-hover:text-accent'}`}>{stage.title}</h3>
                    </div>
                    <p className="mt-1 text-small text-text-secondary leading-tight md:px-2">{stage.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {job && !isUploadingNew ? (
        <Card className="p-0 mt-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-h3 text-text-primary">Run activity</h2>
                <span className={`rounded-pill px-2.5 py-1 text-small-medium ${statusTone(job.status)}`}>{job.status}</span>
              </div>
              <p className="mt-1 text-small text-text-secondary">Run {job.job_id.slice(0, 8)} · started {formatRelativeTime(job.created_at)}</p>
            </div>
            {!terminalStates.has(job.status) ? (
              <InteractiveHoverButton onClick={cancel} disabled={isCancelling} text={isCancelling ? 'Canceling...' : 'Cancel run'} />
            ) : (
              <button 
                className="rounded-control bg-accent px-4 py-2 text-small font-bold text-white hover:bg-accent/90 transition-colors" 
                onClick={() => { setIsUploadingNew(true); setSelectedTab(1); }}
              >
                Ingest More Data
              </button>
            )}
          </div>
          <div className="p-5">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="text-body-medium text-text-primary">{job.current_step}</p>
                <p className="mt-1 text-small text-text-secondary">{job.items_total ? `${formatInteger(job.items_done)} of ${formatInteger(job.items_total)} records processed` : 'Preparing workload'}</p>
              </div>
              <span className="text-data-lg text-text-primary">{Math.round(job.progress_percent)}%</span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-pill bg-surface-raised">
              <div className={`h-full rounded-pill transition-all duration-300 ${job.status === 'failed' ? 'bg-negative' : job.status === 'completed' ? 'bg-positive' : 'bg-accent'}`} style={{ width: `${Math.max(2, job.progress_percent)}%` }} />
            </div>
            {job.records_target > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-small text-text-secondary mb-1.5">
                  <span>{job.records_created} of {job.records_target} new records created</span>
                  <span>{Math.round((job.records_created / job.records_target) * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-pill bg-surface-raised">
                  <div className="h-full rounded-pill bg-positive transition-all duration-300" style={{ width: `${Math.min(100, (job.records_created / job.records_target) * 100)}%` }} />
                </div>
              </div>
            )}
            {job.error ? (
              <div className="mt-4 flex gap-3 rounded-control border border-negative bg-negative-muted p-3 text-small text-negative">
                <XCircle className="h-icon w-icon shrink-0" />{job.error}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="min-h-[400px] overflow-hidden mt-6">
        <AnimatePresence mode="wait">
          {currentTab === 0 && (
            <motion.div key="tab-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-6">
              <Card className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="text-h3 text-text-primary">Graph health</h2><p className="mt-1 text-small text-text-secondary">The causal surface available to the pipeline before news is introduced.</p></div><span className="text-small text-text-muted">{graphStats ? `${Object.keys(graphStats.by_sector).length} sectors represented` : 'Loading graph inventory'}</span></div>
                {graphStats ? <div className="grid divide-y divide-border md:grid-cols-[150px_150px_1fr] md:divide-x md:divide-y-0"><div className="p-5"><p className="text-small text-text-secondary">Companies</p><p className="mt-2 text-data-lg text-text-primary">{formatInteger(graphStats.company_count)}</p></div><div className="p-5"><p className="text-small text-text-secondary">Mapped edges</p><p className="mt-2 text-data-lg text-text-primary">{formatInteger(graphStats.edge_count)}</p></div><div className="p-5"><p className="text-small text-text-secondary">Relationship mix</p><div className="mt-3 flex flex-wrap gap-2">{Object.entries(graphStats.by_relationship_type).map(([type, count]) => <span key={type} className="rounded-pill border border-border bg-surface-raised px-2.5 py-1 text-small text-text-secondary"><span className="text-text-primary">{count}</span> {type}</span>)}</div></div></div> : <div className="p-5 text-small text-text-muted">Graph statistics will appear after the first synchronization.</div>}
              </Card>
            </motion.div>
          )}

          {currentTab === 1 && (
            <motion.div key="tab-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-6">
              {!job || isUploadingNew ? (
                <IngestUpload onUploadComplete={(data) => { setIsUploadingNew(false); start(['seed', 'ingest', 'backtest', 'train', 'chains'], data); }} />
              ) : (
                <IngestLiveFeed job={job} isActive={job.status === 'running' && job.phase === 'ingest'} />
              )}
            </motion.div>
          )}

          {currentTab === 2 && (
            <motion.div key="tab-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {job && (activeIndex >= 2 || job.status === 'completed') ? (
                <BacktestResults isActive={job.status === 'running' && job.phase === 'backtest'} />
              ) : (
                <TabEmptyState 
                  icon={ScanSearch}
                  title="Backtesting Not Yet Available"
                  description="The backtest engine will scan your ingested events against 2 years of Yahoo Finance price history. It measures whether predicted relationships actually moved the market. This phase runs automatically after ingestion completes."
                />
              )}
            </motion.div>
          )}

          {currentTab === 3 && (
            <motion.div key="tab-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {job && (activeIndex >= 3 || job.status === 'completed') ? (
                <TrainResults isActive={job.status === 'running' && job.phase === 'train'} />
              ) : (
                <TabEmptyState 
                  icon={FlaskConical}
                  title="Training Not Yet Available"
                  description="A logistic regression model will be fitted on your validated event-price pairs. It learns which event types, relationship types, and sector matches best predict market direction. Requires at least 30 labeled samples from the backtest phase."
                />
              )}
            </motion.div>
          )}

          {currentTab === 4 && (
            <motion.div key="tab-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {job && (activeIndex >= 4 || job.status === 'completed') ? (
                <ChainsResults isActive={job.status === 'running' && job.phase === 'chains'} isCompleted={job.status === 'completed'} />
              ) : (
                <TabEmptyState 
                  icon={GitBranch}
                  title="Chains Not Yet Available"
                  description="The chain generator combines backtest hit-rates with ML confidence scores to produce actionable trading hypotheses. Each chain shows a catalyst event, its ripple effects through the supply chain, and the predicted price movements with confidence levels."
                />
              )}
            </motion.div>
          )}

          {currentTab === 5 && (
            <motion.div key="tab-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {job && job.status === 'completed' ? (
                <VerifyResults isCompleted={true} />
              ) : (
                <TabEmptyState 
                  icon={Check}
                  title="Verification Not Yet Available"
                  description="Final smoke tests validate that the graph database, event store, ML model, and chain outputs are all internally consistent. This ensures the pipeline produced reliable, end-to-end results."
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {job ? <Card className="p-0 mt-6"><div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="text-h3 text-text-primary">Activity log</h2><span className="text-small text-text-muted">Updates every 1.2 seconds while running</span></div><div ref={logsContainerRef} className="max-h-72 overflow-y-auto bg-canvas px-5 py-2 font-data text-small">{job.logs.length ? <>{job.logs.filter(l => !l.message.startsWith('SKIP|') && !l.message.startsWith('GEMINI|')).map((log) => <div key={log.id} className="grid grid-cols-[72px_70px_1fr] gap-3 border-b border-border py-3 last:border-0"><span className="text-text-muted">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span><span className={log.level === 'error' ? 'text-negative' : log.level === 'warning' ? 'text-warning' : 'text-accent'}>{log.level}</span><span className="text-text-secondary">{log.message}</span></div>)}</> : <p className="py-4 text-text-muted">Waiting for the first log entry.</p>}</div></Card> : null}
    </div>
  );
}
