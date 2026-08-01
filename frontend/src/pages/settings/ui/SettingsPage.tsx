import { FormEvent, useEffect, useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, RotateCcw, ShieldCheck, SlidersHorizontal, Timer, Wifi } from 'lucide-react';
import * as settingsApi from '@/features/settings/api/settingsApi';
import type { LlmSettings } from '@/features/settings/api/settingsApi';
import { ApiError } from '@/shared/api/client';
import { Card } from '@/shared/ui/Card';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Input } from '@/shared/ui/Input';
import { InteractiveHoverButton } from '@/shared/ui/interactive-hover-button';
import { Select } from '@/shared/ui/Select';
import { SkeletonBlock } from '@/shared/ui/Skeleton';
import { useToast } from '@/shared/ui/Toast';

const DEFAULTS: LlmSettings = {
  key_set: false,
  key_suffix: '',
  gemini_model: 'gemini-3.1-flash-lite',
  ingest_delay_seconds: 2,
  prefer_events: true,
};

function ErrorMessage({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Could not load settings.';
  return <ErrorState message={message} onRetry={() => window.location.reload()} />;
}

export function SettingsPage() {
  const { showToast } = useToast();
  const [saved, setSaved] = useState<LlmSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(DEFAULTS.gemini_model);
  const [delay, setDelay] = useState(DEFAULTS.ingest_delay_seconds);
  const [preferEvents, setPreferEvents] = useState(DEFAULTS.prefer_events);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const hydrate = (value: LlmSettings) => {
    setSaved(value);
    setModel(value.gemini_model);
    setDelay(value.ingest_delay_seconds);
    setPreferEvents(value.prefer_events);
  };

  useEffect(() => {
    settingsApi.getLlmSettings().then(hydrate).catch(setError).finally(() => setIsLoading(false));
  }, []);

  const saveSettings = async () => {
    const result = await settingsApi.saveLlmSettings({
      ...(apiKey.trim() ? { gemini_api_key: apiKey.trim() } : {}),
      gemini_model: model,
      ingest_delay_seconds: delay,
      prefer_events: preferEvents,
    });
    hydrate(result);
    setApiKey('');
    return result;
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await saveSettings();
      showToast('success', 'LLM settings saved.');
    } catch (saveError) {
      showToast('error', saveError instanceof Error ? saveError.message : 'Settings could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      if (apiKey.trim()) await saveSettings();
      const result = await settingsApi.testLlmConnection();
      showToast('success', result.detail);
    } catch (testError) {
      const message = testError instanceof ApiError ? testError.message : 'Connection test failed.';
      showToast('error', message);
    } finally {
      setIsTesting(false);
    }
  };

  const clearKey = () => setApiKey('');

  if (isLoading) {
    return <div className="max-w-4xl space-y-6"><SkeletonBlock className="h-16 w-2/5" /><SkeletonBlock className="h-80 w-full" /></div>;
  }
  if (error || !saved) return <ErrorMessage error={error} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="border-b border-border pb-6">
        <p className="eyebrow-label text-accent">WORKSPACE SETTINGS</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display text-text-primary">Research configuration</h1>
            <p className="mt-2 max-w-2xl text-body text-text-secondary">Configure the model used to classify source material and write evidence-based chain hypotheses.</p>
          </div>
          <div className="flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1.5 text-small-medium text-text-secondary">
            <span className={`h-1.5 w-1.5 rounded-pill ${saved.key_set ? 'bg-positive' : 'bg-warning'}`} />
            {saved.key_set ? `Key on file · •••• ${saved.key_suffix}` : 'No API key saved'}
          </div>
        </div>
      </header>

      <form onSubmit={save} className="space-y-6">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border bg-surface-raised px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-control bg-accent-muted text-accent"><KeyRound className="h-icon w-icon" aria-hidden="true" /></div>
              <div><h2 className="text-h3 text-text-primary">Gemini access</h2><p className="mt-1 text-small text-text-secondary">Used only when a pipeline step needs classification or an explanation.</p></div>
            </div>
          </div>
          <div className="p-5">
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="relative">
                <Input label={saved.key_set ? 'Replace Gemini API key' : 'Gemini API key'} name="gemini-api-key" type={showKey ? 'text' : 'password'} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={saved.key_set ? 'Leave blank to keep the saved key' : 'Paste your Gemini API key'} autoComplete="off" />
                <button type="button" aria-label={showKey ? 'Hide API key' : 'Show API key'} onClick={() => setShowKey((value) => !value)} className="absolute bottom-2.5 right-3 text-text-muted transition-colors hover:text-text-primary">
                  {showKey ? <EyeOff className="h-icon w-icon" /> : <Eye className="h-icon w-icon" />}
                </button>
              </div>
              <InteractiveHoverButton type="button" onClick={testConnection} disabled={isTesting || (!saved.key_set && !apiKey.trim())} text={isTesting ? 'Testing...' : 'Test connection'} />
            </div>
            <div className="mt-4 flex gap-3 rounded-control border border-border bg-canvas px-3 py-3 text-small text-text-secondary">
              <ShieldCheck className="mt-0.5 h-icon w-icon shrink-0 text-positive" aria-hidden="true" />
              <p>Your key is encrypted before storage and is never returned by this application. Testing a newly entered key saves it first, then verifies the connection.</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="flex items-center gap-3"><SlidersHorizontal className="h-icon w-icon text-accent" aria-hidden="true" /><h2 className="text-h3 text-text-primary">Model policy</h2></div>
            <div className="mt-5 space-y-5">
              <Select label="Gemini model" name="gemini-model" value={model} onChange={(event) => setModel(event.target.value)}>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite — recommended</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              </Select>
              <label className="flex cursor-pointer items-start gap-3 rounded-control border border-border p-3 transition-colors hover:bg-surface-hover">
                <input type="checkbox" checked={preferEvents} onChange={(event) => setPreferEvents(event.target.checked)} className="mt-0.5 h-4 w-4 accent-accent" />
                <span><span className="block text-body-medium text-text-primary">Prioritize hard events</span><span className="mt-1 block text-small text-text-secondary">Skip investment-opinion articles when ingesting news. Recommended for cleaner backtests.</span></span>
              </label>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3"><Timer className="h-icon w-icon text-accent" aria-hidden="true" /><h2 className="text-h3 text-text-primary">Request pacing</h2></div>
            <div className="mt-5">
              <div className="flex items-baseline justify-between"><label htmlFor="ingest-delay" className="text-small-medium text-text-secondary">Delay between Gemini requests</label><span className="text-data text-text-primary">{delay.toFixed(1)}s</span></div>
              <input id="ingest-delay" type="range" min="0" max="10" step="0.5" value={delay} onChange={(event) => setDelay(Number(event.target.value))} className="mt-4 w-full accent-accent" />
              <div className="mt-2 flex justify-between text-small text-text-muted"><span>Fast</span><span>Rate-limit safe</span></div>
              <p className="mt-5 border-t border-border pt-4 text-small text-text-secondary">Use 2 seconds for the free tier. Increase it if Gemini reports a quota or rate-limit error.</p>
            </div>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <p className="text-small text-text-muted">Changes apply to future pipeline jobs only.</p>
          <div className="flex gap-3"><InteractiveHoverButton type="button" onClick={clearKey} disabled={!apiKey} text="Discard key entry" /><InteractiveHoverButton type="submit" disabled={isSaving} text={isSaving ? 'Saving...' : 'Save configuration'} /></div>
        </div>
      </form>
    </div>
  );
}
