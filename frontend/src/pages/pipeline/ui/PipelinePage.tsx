import { useCallback, useEffect, useMemo, useState } from 'react';
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

const stages = [
  { id: 'seed', short: 'A', title: 'Graph', detail: 'Synchronize companies and relationships', icon: Database, available: true },
  { id: 'ingest', short: 'B', title: 'Ingest', detail: 'Upload and classify source material', icon: FileUp, available: true },
  { id: 'backtest', short: 'C', title: 'Backtest', detail: 'Measure historical relationship outcomes', icon: ScanSearch, available: true },
  { id: 'train', short: 'D', title: 'Train', detail: 'Fit the explainable confidence model', icon: FlaskConical, available: true },
  { id: 'chains', short: 'E', title: 'Chains', detail: 'Produce research hypotheses', icon: GitBranch, available: true },
  { id: 'verify', short: 'F', title: 'Verify', detail: 'Run browser-side smoke checks', icon: Check, available: true },
];

const terminalStates = new Set(['completed', 'failed', 'cancelled']);

function statusTone(status: PipelineJob['status']) {
  if (status === 'completed') return 'bg-positive-muted text-positive';
  if (status === 'failed' || status === 'cancelled') return 'bg-negative-muted text-negative';
  return 'bg-accent-muted text-accent';
}

export function PipelinePage() {
  const { showToast } = useToast();
  const [job, setJob] = useState<PipelineJob | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const graphStatsLoader = useCallback(() => getGraphStats(), []);
  const graphHealth = useRemoteData(graphStatsLoader, []);
  const graphStats = graphHealth.data;

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
          <InteractiveHoverButton onClick={() => start(['seed'])} disabled={Boolean(job && !terminalStates.has(job.status)) || isStarting} text={isStarting ? 'Starting...' : 'Sync graph only'} />
        </div>
      </header>

      <Card className="p-0">
        <div className="border-b border-border px-5 py-4"><h2 className="text-h3 text-text-primary">Execution path</h2><p className="mt-1 text-small text-text-secondary">The job system is live. Each later phase will be attached here as its browser workflow ships.</p></div>
        <div className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0 xl:grid-cols-6">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === activeIndex && job && !terminalStates.has(job.status);
            const isComplete = stage.id === 'seed' && job?.status === 'completed';
            return <div key={stage.id} className="min-h-32 p-4">
              <div className="flex items-center justify-between"><span className="text-data text-text-muted">{stage.short}</span>{isComplete ? <Check className="h-icon w-icon text-positive" /> : isActive ? <Activity className="h-icon w-icon animate-pulse text-accent" /> : <Circle className="h-3.5 w-3.5 text-text-muted" />}</div>
              <div className="mt-5 flex items-center gap-2"><Icon className={`h-icon w-icon ${stage.available ? 'text-text-primary' : 'text-text-muted'}`} /><span className="text-body-medium text-text-primary">{stage.title}</span></div>
              <p className="mt-2 text-small text-text-secondary">{stage.available ? stage.detail : 'Attaches in a later V2 phase'}</p>
            </div>;
          })}
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="text-h3 text-text-primary">Graph health</h2><p className="mt-1 text-small text-text-secondary">The causal surface available to the pipeline before news is introduced.</p></div><span className="text-small text-text-muted">{graphStats ? `${Object.keys(graphStats.by_sector).length} sectors represented` : 'Loading graph inventory'}</span></div>
        {graphStats ? <div className="grid divide-y divide-border md:grid-cols-[150px_150px_1fr] md:divide-x md:divide-y-0"><div className="p-5"><p className="text-small text-text-secondary">Companies</p><p className="mt-2 text-data-lg text-text-primary">{formatInteger(graphStats.company_count)}</p></div><div className="p-5"><p className="text-small text-text-secondary">Mapped edges</p><p className="mt-2 text-data-lg text-text-primary">{formatInteger(graphStats.edge_count)}</p></div><div className="p-5"><p className="text-small text-text-secondary">Relationship mix</p><div className="mt-3 flex flex-wrap gap-2">{Object.entries(graphStats.by_relationship_type).map(([type, count]) => <span key={type} className="rounded-pill border border-border bg-surface-raised px-2.5 py-1 text-small text-text-secondary"><span className="text-text-primary">{count}</span> {type}</span>)}</div></div></div> : <div className="p-5 text-small text-text-muted">Graph statistics will appear after the first synchronization.</div>}
      </Card>

      {job ? <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <Card className="p-0">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div><div className="flex items-center gap-3"><h2 className="text-h3 text-text-primary">Run activity</h2><span className={`rounded-pill px-2.5 py-1 text-small-medium ${statusTone(job.status)}`}>{job.status}</span></div><p className="mt-1 text-small text-text-secondary">Run {job.job_id.slice(0, 8)} · started {formatRelativeTime(job.created_at)}</p></div>
            {!terminalStates.has(job.status) ? <InteractiveHoverButton onClick={cancel} disabled={isCancelling} text={isCancelling ? 'Canceling...' : 'Cancel run'} /> : null}
          </div>
          <div className="p-5">
            <div className="flex items-baseline justify-between gap-4"><div><p className="text-body-medium text-text-primary">{job.current_step}</p><p className="mt-1 text-small text-text-secondary">{job.items_total ? `${formatInteger(job.items_done)} of ${formatInteger(job.items_total)} files scanned` : 'Preparing workload'}</p></div><span className="text-data-lg text-text-primary">{Math.round(job.progress_percent)}%</span></div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-pill bg-surface-raised"><div className={`h-full rounded-pill transition-all duration-300 ${job.status === 'failed' ? 'bg-negative' : job.status === 'completed' ? 'bg-positive' : 'bg-accent'}`} style={{ width: `${Math.max(2, job.progress_percent)}%` }} /></div>
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
            {job.error ? <div className="mt-4 flex gap-3 rounded-control border border-negative bg-negative-muted p-3 text-small text-negative"><XCircle className="h-icon w-icon shrink-0" />{job.error}</div> : null}
          </div>
        </Card>
        <Card>
          <h2 className="text-h3 text-text-primary">Why this is staged</h2>
          <p className="mt-3 text-body text-text-secondary">The graph can be synchronized now. Upload, classification, backtesting, model training, and chain generation will use this same persistent job and log stream as they become available.</p>
          <div className="mt-5 border-t border-border pt-4 text-small text-text-muted">No progress is simulated: the current run reflects only completed graph work.</div>
        </Card>
      </div> : (
        <IngestUpload onUploadComplete={(data) => start(['seed', 'ingest', 'backtest', 'train', 'chains'], data)} />
      )}

      {job && (job.phase === 'backtest' || job.phase === 'train' || job.phase === 'chains' || job.status === 'completed') ? (
        <BacktestResults isActive={job.status === 'running' && job.phase === 'backtest'} />
      ) : null}
      
      {job && (job.phase === 'train' || job.phase === 'chains' || job.status === 'completed') ? (
        <TrainResults isActive={job.status === 'running' && job.phase === 'train'} />
      ) : null}

      {job && (job.phase === 'chains' || job.status === 'completed') ? (
        <ChainsResults isActive={job.status === 'running' && job.phase === 'chains'} isCompleted={job.status === 'completed'} />
      ) : null}

      {job && job.status === 'completed' ? (
        <VerifyResults isCompleted={true} />
      ) : null}

      {job ? <Card className="p-0 mt-6"><div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="text-h3 text-text-primary">Activity log</h2><span className="text-small text-text-muted">Updates every 1.2 seconds while running</span></div><div className="max-h-72 overflow-y-auto bg-canvas px-5 py-2 font-data text-small">{job.logs.length ? job.logs.map((log) => <div key={log.id} className="grid grid-cols-[72px_70px_1fr] gap-3 border-b border-border py-3 last:border-0"><span className="text-text-muted">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span><span className={log.level === 'error' ? 'text-negative' : log.level === 'warning' ? 'text-warning' : 'text-accent'}>{log.level}</span><span className="text-text-secondary">{log.message}</span></div>) : <p className="py-4 text-text-muted">Waiting for the first log entry.</p>}</div></Card> : null}
    </div>
  );
}
