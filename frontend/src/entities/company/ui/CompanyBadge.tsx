import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';

type CompanyBadgeProps = {
  symbol: string;
  to?: string;
  className?: string;
};

export function CompanyBadge({ symbol, to, className }: CompanyBadgeProps) {
  const classes = cn(
    'inline-flex items-center rounded-control border border-border-strong bg-surface-raised px-3 py-1 text-data text-text-primary transition-colors duration-ui ease-out',
    to && 'hover:bg-surface-hover',
    className,
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {symbol}
      </Link>
    );
  }

  return <span className={classes}>{symbol}</span>;
}
