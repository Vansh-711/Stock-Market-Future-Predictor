import { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { getChainEvidence } from '@/features/pipeline/api/pipelineApi';

const RANGE_LABELS: Record<string, string> = {
  '2Y': '2 Years',
  '1Y': '1 Year',
  '2M': '2 Months',
  '5D': 'Event + 5 Days',
  '3D': 'Event + 3 Days',
  '1D': 'Event + 1 Day',
};

export function ChainEvidenceGraph({ chainId, windowDays }: { chainId: number; windowDays?: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('2Y');

  useEffect(() => {
    getChainEvidence(chainId).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [chainId]);

  const filteredData = useMemo(() => {
    if (!data || !data.chart_data) return [];
    if (timeRange === '2Y') return data.chart_data;
    
    const eventDate = new Date(data.event_date).getTime();
    const dayMs = 1000 * 3600 * 24;
    
    return data.chart_data.filter((pt: any) => {
      const ptDate = new Date(pt.date).getTime();
      const diffDays = (ptDate - eventDate) / dayMs;
      
      switch (timeRange) {
        case '1Y': return Math.abs(diffDays) <= 180;
        case '2M': return Math.abs(diffDays) <= 30;
        case '5D': return diffDays >= -2 && diffDays <= 5;
        case '3D': return diffDays >= -2 && diffDays <= 3;
        case '1D': return diffDays >= -2 && diffDays <= 1;
        default: return true;
      }
    });
  }, [data, timeRange]);

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-border flex justify-center py-8">
        <div className="animate-pulse h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }
  
  if (!data) return null;

  // Calculate the end of the measurement window
  let windowEndText = '';
  if (windowDays && data.event_date) {
    const d = new Date(data.event_date);
    d.setDate(d.getDate() + windowDays);
    windowEndText = d.toISOString().split('T')[0];
  }

  // Calculate dynamic Y-axis domain to add padding so the line isn't touching the top/bottom
  const prices = filteredData.map((d: any) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1 || maxPrice * 0.05;

  let closestDate = data.event_date;
  if (filteredData.length > 0) {
    const eventTime = new Date(data.event_date).getTime();
    const closestPoint = filteredData.reduce((prev: any, curr: any) => {
      const prevDiff = Math.abs(new Date(prev.date).getTime() - eventTime);
      const currDiff = Math.abs(new Date(curr.date).getTime() - eventTime);
      return currDiff < prevDiff ? curr : prev;
    });
    closestDate = closestPoint.date;
  }

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="mb-6 flex flex-col gap-1 rounded-card bg-surface-raised p-4 border border-border relative overflow-hidden group/card transition-all duration-500 hover:shadow-popover hover:border-accent/30">
        <div className="absolute inset-0 w-[200%] bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[150%] group-hover/card:translate-x-[100%] transition-transform duration-[1.5s] ease-in-out pointer-events-none" />
        <p className="text-small text-text-secondary relative z-10">
          <strong className="text-text-primary">1. Trigger Date:</strong> The catalyst headline was published on <strong className="text-accent">{data.event_date}</strong>.
        </p>
        {windowDays ? (
          <p className="text-small text-text-secondary relative z-10">
            <strong className="text-text-primary">2. Measurement Window:</strong> We look for a <strong className={data.direction === 'down' ? 'text-negative' : 'text-positive'}>{data.direction === 'down' ? 'downfall' : 'rise'}</strong> in {data.affected_symbol} over a <strong className="text-text-primary">{windowDays}-day period</strong> following the trigger (until {windowEndText}).
          </p>
        ) : null}
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-body-medium text-text-primary">Historical Price Evidence</h4>
        
        {/* Sexy Dropdown adapted from styled-components logic */}
        <div className="group relative inline-block z-50">
          <button className="relative flex items-center justify-center gap-2 px-5 py-2 rounded-2xl overflow-hidden text-text-primary transition-all duration-[480ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-white group-hover:rounded-b-none border border-border group-hover:border-accent">
            <div className="absolute inset-0 bg-accent scale-x-0 origin-left transition-transform duration-[480ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-x-100 z-0" />
            <span className="text-small-medium relative z-10">{RANGE_LABELS[timeRange]}</span>
            <ChevronDown className="w-3.5 h-3.5 transition-transform duration-[480ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-rotate-180 relative z-10" />
          </button>
          
          <div className="absolute top-full left-0 w-full flex flex-col bg-surface border border-accent border-t-transparent rounded-b-2xl overflow-hidden opacity-0 invisible -translate-y-3 transition-all duration-[480ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 shadow-popover pointer-events-none group-hover:pointer-events-auto">
            {Object.entries(RANGE_LABELS).map(([key, label]) => (
              <button 
                key={key}
                onClick={() => setTimeRange(key)}
                className="relative block w-full px-4 py-2.5 text-center text-small text-text-secondary transition-colors duration-[480ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-white group/item"
              >
                <div className="absolute inset-0 bg-accent scale-x-0 origin-left transition-transform duration-[480ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/item:scale-x-100 z-0" />
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[250px] w-full relative">
        {filteredData.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-raised/50 rounded-card border border-dashed border-border">
            <p className="text-body-medium text-text-secondary">No price data available in this time range.</p>
            <p className="text-small text-text-muted mt-1">The event date ({data.event_date}) may fall outside the historical data window.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData}>
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickMargin={8} minTickGap={30} />
              <YAxis domain={[minPrice - padding, maxPrice + padding]} stroke="var(--text-muted)" fontSize={12} width={50} tickFormatter={(v) => `$${v.toFixed(1)}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(var(--surface-rgb), 0.8)' }} 
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <ReferenceLine x={closestDate} stroke="var(--accent)" strokeDasharray="3 3" strokeWidth={1.5} label={{ position: 'top', value: 'Trigger Date', fill: 'var(--accent)', fontSize: 12, fontWeight: 600 }} />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={data.direction === 'down' ? 'var(--negative)' : 'var(--positive)'} 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 6, fill: data.direction === 'down' ? 'var(--negative)' : 'var(--positive)', stroke: 'var(--surface)', strokeWidth: 2 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
