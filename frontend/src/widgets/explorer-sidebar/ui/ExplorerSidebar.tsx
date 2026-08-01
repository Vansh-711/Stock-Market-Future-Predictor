import { Search } from 'lucide-react';
import type { Company } from '@/entities/company/model/types';
import { SectorBadge } from '@/entities/company/ui/SectorBadge';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { cn } from '@/shared/lib/cn';

type ExplorerSidebarProps = {
  companies: Company[];
  query: string;
  selectedSymbol: string | null;
  onQueryChange: (query: string) => void;
  onSelect: (symbol: string) => void;
  sectors: string[];
  sector: string;
  onSectorChange: (sector: string) => void;
  relationshipCounts: Record<string, number>;
};

export function ExplorerSidebar({ companies, query, selectedSymbol, onQueryChange, onSelect, sectors, sector, onSectorChange, relationshipCounts }: ExplorerSidebarProps) {
  return (
    <aside className="flex h-full min-h-graph w-full flex-col rounded-card border border-border bg-surface p-4 xl:w-sidebar xl:shrink-0">
      <Input
        aria-label="Search company list"
        name="company-search"
        placeholder="Search companies"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        leftIcon={<Search className="h-icon w-icon" aria-hidden="true" />}
      />
      <div className="mt-3">
        <Select label="Sector" name="explorer-sector" value={sector} onChange={(event) => onSectorChange(event.target.value)}>
          <option value="all">All sectors</option>
          {sectors.map((value) => <option key={value} value={value}>{value}</option>)}
        </Select>
      </div>
      <div className="mt-4 border-y border-border py-3">
        <p className="text-small-medium text-text-secondary">Visible relationships</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-small text-text-muted">
          {Object.entries(relationshipCounts).map(([type, count]) => <span key={type}><span className="text-text-primary">{count}</span> {type}</span>)}
        </div>
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-auto">
        {companies.map((company) => {
          const isSelected = selectedSymbol === company.symbol;
          return (
            <button
              key={company.id}
              type="button"
              onClick={() => onSelect(company.symbol)}
              className={cn(
                'flex w-full items-center gap-3 border-b border-border px-2 py-3 text-left transition-colors duration-ui ease-out last:border-b-0 hover:bg-surface-hover',
                isSelected && 'bg-accent-muted',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-data text-text-primary">{company.symbol}</div>
                <div className="mt-1 line-clamp-1 text-body text-text-secondary">{company.name}</div>
              </div>
              <SectorBadge sector={company.sector} />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
