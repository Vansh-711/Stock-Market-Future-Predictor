import { useCallback, useMemo, useState } from 'react';
import { Menu, Network, X } from 'lucide-react';
import { getCompanies } from '@/entities/company/api/companyApi';
import type { Company } from '@/entities/company/model/types';
import { SectorBadge } from '@/entities/company/ui/SectorBadge';
import { getGraph } from '@/entities/graph/api/graphApi';
import type { RelationshipGraphData } from '@/entities/graph/model/types';
import { getRelationships } from '@/entities/relationship/api/relationshipApi';
import type { Relationship } from '@/entities/relationship/model/types';
import { CompanyProfilePanel } from '@/widgets/company-profile-panel/ui/CompanyProfilePanel';
import { ExplorerSidebar } from '@/widgets/explorer-sidebar/ui/ExplorerSidebar';
import { RelationshipGraph } from '@/widgets/relationship-graph/ui/RelationshipGraph';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { IconButton } from '@/shared/ui/IconButton';
import { Input } from '@/shared/ui/Input';
import { CardSkeleton, SkeletonBlock } from '@/shared/ui/Skeleton';
import { cn } from '@/shared/lib/cn';

type ExplorerData = {
  companies: Company[];
  relationships: Relationship[];
  graph: RelationshipGraphData;
};

async function loadExplorerData(): Promise<ExplorerData> {
  const [companies, relationships, graph] = await Promise.all([getCompanies(''), getRelationships(), getGraph()]);
  return { companies, relationships, graph };
}

function ExplorerSkeleton() {
  return (
    <div className="flex gap-6">
      <div className="hidden w-sidebar shrink-0 xl:block">
        <CardSkeleton />
      </div>
      <div className="min-h-graph flex-1 rounded-card border border-border bg-surface p-5">
        <SkeletonBlock className="h-full min-h-graph w-full" />
      </div>
    </div>
  );
}

function MobileCompanyList({ companies, selectedSymbol, onSelect }: { companies: Company[]; selectedSymbol: string | null; onSelect: (symbol: string) => void }) {
  return (
    <div className="rounded-card border border-border bg-surface">
      {companies.map((company) => (
        <button
          key={company.id}
          type="button"
          onClick={() => onSelect(company.symbol)}
          className={cn(
            'flex w-full items-center gap-3 border-b border-border px-4 py-4 text-left transition-colors duration-ui ease-out last:border-b-0 hover:bg-surface-hover',
            selectedSymbol === company.symbol && 'bg-accent-muted',
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="text-data text-text-primary">{company.symbol}</div>
            <div className="mt-1 line-clamp-1 text-body text-text-secondary">{company.name}</div>
          </div>
          <SectorBadge sector={company.sector} />
        </button>
      ))}
    </div>
  );
}

export function ExplorerPage() {
  const loader = useCallback(() => loadExplorerData(), []);
  const { data, error, isLoading, status, refetch } = useRemoteData(loader, []);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const [query, setQuery] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const companies = data?.companies ?? [];
  const relationships = data?.relationships ?? [];
  const graph = data?.graph ?? { nodes: [], edges: [] };

  const filteredCompanies = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return companies;
    return companies.filter((company) => `${company.symbol} ${company.name} ${company.sector}`.toLowerCase().includes(normalized));
  }, [companies, query]);

  const companiesBySymbol = useMemo(() => new Map(companies.map((company) => [company.symbol, company])), [companies]);
  const selectedCompany = selectedSymbol ? companiesBySymbol.get(selectedSymbol) ?? null : null;
  const selectedRelationships = useMemo(() => {
    if (!selectedSymbol) return [];
    return relationships.filter((relationship) => relationship.company_symbol === selectedSymbol || relationship.related_symbol === selectedSymbol);
  }, [relationships, selectedSymbol]);

  const handleSelectCompany = (symbol: string) => {
    setSelectedSymbol(symbol);
    setIsDrawerOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-display text-text-primary">Explorer</h1>
        {!isDesktop && !isMobile && status === 'success' ? (
          <Button variant="secondary" leftIcon={<Menu className="h-icon w-icon" aria-hidden="true" />} onClick={() => setIsDrawerOpen(true)}>
            Browse companies
          </Button>
        ) : null}
      </div>

      {isLoading ? <ExplorerSkeleton /> : null}
      {status === 'error' && error ? <ErrorState message={error} onRetry={refetch} /> : null}

      {status === 'success' && data ? (
        companies.length === 0 || graph.nodes.length === 0 ? (
          <EmptyState
            icon={<Network className="h-8 w-8" aria-hidden="true" />}
            title="No companies yet"
            description="Relationship graph data will appear after companies and mapped edges are available."
          />
        ) : isMobile ? (
          <div className="space-y-4">
            <Input name="mobile-company-filter" placeholder="Search companies" value={query} onChange={(event) => setQuery(event.target.value)} />
            {filteredCompanies.length === 0 ? (
              <EmptyState
                icon={<Network className="h-8 w-8" aria-hidden="true" />}
                title="No companies match"
                description="Adjust the company search to find another ticker, name, or sector."
              />
            ) : (
              <MobileCompanyList companies={filteredCompanies} selectedSymbol={selectedSymbol} onSelect={handleSelectCompany} />
            )}
            {selectedCompany ? (
              <CompanyProfilePanel company={selectedCompany} relationships={selectedRelationships} companiesBySymbol={companiesBySymbol} onSelectCompany={handleSelectCompany} />
            ) : null}
          </div>
        ) : (
          <div className="flex gap-6">
            {isDesktop ? (
              <ExplorerSidebar companies={filteredCompanies} query={query} selectedSymbol={selectedSymbol} onQueryChange={setQuery} onSelect={handleSelectCompany} />
            ) : null}
            <main className="min-w-0 flex-1">
              <RelationshipGraph data={graph} selectedSymbol={selectedSymbol} onSelectNode={handleSelectCompany} />
            </main>
            {selectedCompany ? (
              <CompanyProfilePanel
                company={selectedCompany}
                relationships={selectedRelationships}
                companiesBySymbol={companiesBySymbol}
                onSelectCompany={handleSelectCompany}
                onClose={() => setSelectedSymbol(null)}
              />
            ) : null}
          </div>
        )
      ) : null}

      {!isDesktop && !isMobile && isDrawerOpen ? (
        <div className="fixed inset-0 z-50 bg-canvas xl:hidden">
          <div className="h-full w-sidebar border-r border-border bg-surface-raised p-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-h3 text-text-primary">Companies</h2>
              <IconButton label="Close company drawer" onClick={() => setIsDrawerOpen(false)}>
                <X className="h-icon w-icon" aria-hidden="true" />
              </IconButton>
            </div>
            <ExplorerSidebar companies={filteredCompanies} query={query} selectedSymbol={selectedSymbol} onQueryChange={setQuery} onSelect={handleSelectCompany} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
