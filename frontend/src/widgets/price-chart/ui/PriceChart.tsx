import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PricePoint } from '@/shared/lib/priceSeries';
import { formatCurrency } from '@/shared/lib/format';
import { formatDate } from '@/shared/lib/time';
import { TOKEN_COLORS } from '@/shared/lib/theme';
import { LiveSourceBadge } from '@/shared/ui/Badge';

type PriceChartProps = {
  data: PricePoint[];
  label: string;
  tone?: 'accent' | 'positive' | 'negative';
  height?: number;
};

const colorByTone = {
  accent: TOKEN_COLORS.accent,
  positive: TOKEN_COLORS.positive,
  negative: TOKEN_COLORS.negative,
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-control border border-border-strong bg-surface-raised p-3">
      <div className="text-small text-text-secondary">{formatDate(label)}</div>
      <div className="mt-1 text-data text-text-primary">{formatCurrency(payload[0].value)}</div>
    </div>
  );
}

export function PriceChart({ data, label, tone = 'accent', height = 280 }: PriceChartProps) {
  const stroke = colorByTone[tone];
  const gradientId = `price-gradient-${tone}`;

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-dot w-dot rounded-pill" style={{ backgroundColor: stroke }} aria-hidden="true" />
          <span className="text-small text-text-secondary">{label}</span>
        </div>
        <LiveSourceBadge type="historical" />
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.12} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={TOKEN_COLORS.border} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(new Date(value))}
              tick={{ fill: TOKEN_COLORS.textMuted, fontFamily: 'Inter', fontSize: 12, fontWeight: 400 }}
              axisLine={false}
              tickLine={false}
              minTickGap={32}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(Number(value)).replace('.00', '')}
              tick={{ fill: TOKEN_COLORS.textMuted, fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 400 }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: TOKEN_COLORS.borderStrong, strokeWidth: 1 }} />
            <Area type="monotone" dataKey="value" stroke={stroke} strokeWidth={1.5} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 3, fill: stroke, stroke: TOKEN_COLORS.canvas }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
