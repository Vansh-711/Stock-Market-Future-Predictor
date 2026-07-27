import type { PriceRange } from '@/shared/lib/priceSeries';
import { buildPriceSeries } from '@/shared/lib/priceSeries';
import { cn } from '@/shared/lib/cn';
import { PriceChart } from '@/widgets/price-chart/ui/PriceChart';

const ranges: PriceRange[] = ['1M', '3M', '6M', '1Y'];

type CompanyPriceChartProps = {
  symbol: string;
  range: PriceRange;
  onRangeChange: (range: PriceRange) => void;
};

export function CompanyPriceChart({ symbol, range, onRangeChange }: CompanyPriceChartProps) {
  const data = buildPriceSeries(symbol, range);

  return (
    <section>
      <div className="mb-3 flex items-center gap-4 border-b border-border">
        {ranges.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onRangeChange(item)}
            className={cn(
              'relative h-9 px-2 text-body-medium transition-colors duration-ui ease-out',
              range === item ? 'text-text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <PriceChart data={data} label={`${symbol} price history`} height={320} />
    </section>
  );
}
