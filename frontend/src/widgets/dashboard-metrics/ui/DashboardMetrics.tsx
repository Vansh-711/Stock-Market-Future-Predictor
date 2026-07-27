import { MetricCard } from '@/shared/ui/Card';
import { formatInteger } from '@/shared/lib/format';

export function DashboardMetrics({ trackedCompanies, activePatterns, chainsThisWeek }: { trackedCompanies: number; activePatterns: number; chainsThisWeek: number }) {
  return (
    <section className="grid gap-4 md:grid-cols-3" aria-label="Dashboard metrics">
      <MetricCard label="Tracked companies" value={formatInteger(trackedCompanies)} />
      <MetricCard label="Active patterns" value={formatInteger(activePatterns)} />
      <MetricCard label="Chains this week" value={formatInteger(chainsThisWeek)} />
    </section>
  );
}
