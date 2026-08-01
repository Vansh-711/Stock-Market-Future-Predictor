import { useCallback, useMemo, useState } from 'react';
import { Menu, Network, SlidersHorizontal, X } from 'lucide-react';
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
import { Select } from '@/shared/ui/Select';
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
  const [sector, setSector] = useState('all');
  const [relationshipType, setRelationshipType] = useState('all');

  const companies = data?.companies ?? [];
  const relationships = data?.relationships ?? [];
  const graph = data?.graph ?? { nodes: [], edges: [] };

  const sectors = useMemo(() => [...new Set(companies.map((company) => company.sector))].sort(), [companies]);
  const relationshipTypes = useMemo(() => [...new Set(relationships.map((relationship) => relationship.relationship_type))].sort(), [relationships]);
  const filteredCompanies = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return companies.filter((company) => (sector === 'all' || company.sector === sector) && (!normalized || `${company.symbol} ${company.name} ${company.sector}`.toLowerCase().includes(normalized)));
  }, [companies, query, sector]);

  const filteredGraph = useMemo(() => {
    const visibleSymbols = new Set(filteredCompanies.map((company) => company.symbol));
    return {
      nodes: graph.nodes.filter((node) => visibleSymbols.has(node.id)),
      edges: graph.edges.filter((edge) => visibleSymbols.has(edge.source) && visibleSymbols.has(edge.target) && (relationshipType === 'all' || edge.type === relationshipType)),
    };
  }, [filteredCompanies, graph, relationshipType]);

  const relationshipCounts = useMemo(() => filteredGraph.edges.reduce<Record<string, number>>((counts, edge) => ({ ...counts, [edge.type]: (counts[edge.type] ?? 0) + 1 }), {}), [filteredGraph.edges]);

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
        <div><h1 className="text-display text-text-primary">Explorer</h1><p className="mt-1 text-body text-text-secondary">Filter the relationship surface before tracing a company’s dependencies.</p></div>
        {status === 'success' ? <div className="flex flex-wrap items-end gap-3">
          <Select label="Sector" name="explorer-header-sector" className="w-40" value={sector} onChange={(event) => setSector(event.target.value)}><option value="all">All sectors</option>{sectors.map((value) => <option key={value} value={value}>{value}</option>)}</Select>
          <Select label="Relationship" name="explorer-relationship" className="w-40" value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)}><option value="all">All types</option>{relationshipTypes.map((value) => <option key={value} value={value}>{value}</option>)}</Select>
          {!isDesktop && !isMobile ? <Button variant="secondary" leftIcon={<Menu className="h-icon w-icon" aria-hidden="true" />} onClick={() => setIsDrawerOpen(true)}>Browse companies</Button> : null}
        </div> : null}
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
              <ExplorerSidebar companies={filteredCompanies} query={query} selectedSymbol={selectedSymbol} onQueryChange={setQuery} onSelect={handleSelectCompany} sectors={sectors} sector={sector} onSectorChange={setSector} relationshipCounts={relationshipCounts} />
            ) : null}
            <main className="min-w-0 flex-1">
              {filteredGraph.nodes.length ? <RelationshipGraph data={filteredGraph} selectedSymbol={selectedSymbol} onSelectNode={handleSelectCompany} /> : <EmptyState icon={<SlidersHorizontal className="h-8 w-8" aria-hidden="true" />} title="No graph matches this filter" description="Choose another sector or relationship type to restore nodes and connections." />}
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
            <ExplorerSidebar companies={filteredCompanies} query={query} selectedSymbol={selectedSymbol} onQueryChange={setQuery} onSelect={handleSelectCompany} sectors={sectors} sector={sector} onSectorChange={setSector} relationshipCounts={relationshipCounts} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
