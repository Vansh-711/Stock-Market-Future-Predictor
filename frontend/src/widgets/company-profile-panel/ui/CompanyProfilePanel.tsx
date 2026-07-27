import { X } from 'lucide-react';
import type { Company } from '@/entities/company/model/types';
import { SectorBadge } from '@/entities/company/ui/SectorBadge';
import type { Relationship } from '@/entities/relationship/model/types';
import { IconButton } from '@/shared/ui/IconButton';
import { formatRelationshipType } from '@/shared/lib/format';

type CompanyProfilePanelProps = {
  company: Company;
  relationships: Relationship[];
  companiesBySymbol: Map<string, Company>;
  onSelectCompany: (symbol: string) => void;
  onClose?: () => void;
};

const groupKey = (relationshipType: string) => {
  if (relationshipType === 'supplier' || relationshipType === 'customer') return 'supplier/customer';
  return relationshipType;
};

const groupOrder = ['supplier/customer', 'competitor', 'peer'];

export function CompanyProfilePanel({ company, relationships, companiesBySymbol, onSelectCompany, onClose }: CompanyProfilePanelProps) {
  const grouped = relationships.reduce<Record<string, Relationship[]>>((acc, relationship) => {
    const key = groupKey(relationship.relationship_type);
    acc[key] = [...(acc[key] ?? []), relationship];
    return acc;
  }, {});

  const orderedGroups = [...groupOrder, ...Object.keys(grouped).filter((key) => !groupOrder.includes(key))].filter((key) => grouped[key]?.length);

  return (
    <aside className="h-full w-full overflow-auto rounded-card border border-border bg-surface-raised p-5 xl:w-detail-panel xl:shrink-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-data-lg text-text-primary">{company.symbol}</div>
          <h2 className="mt-2 text-h2 text-text-primary">{company.name}</h2>
          <SectorBadge className="mt-3" sector={company.sector} />
        </div>
        {onClose ? (
          <IconButton label="Close company profile" onClick={onClose}>
            <X className="h-icon w-icon" aria-hidden="true" />
          </IconButton>
        ) : null}
      </div>

      <p className="mt-6 text-body text-text-secondary">{company.description || 'Company profile description is not available from the market dataset.'}</p>

      <div className="mt-6">
        <h3 className="text-h3 text-text-primary">Relationships</h3>
        {orderedGroups.length === 0 ? (
          <p className="mt-3 text-body text-text-secondary">No relationships are currently mapped for this company.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {orderedGroups.map((type) => (
              <div key={type}>
                <div className="text-small-medium text-text-muted">{formatRelationshipType(type)}</div>
                <div className="mt-2 overflow-hidden rounded-card border border-border bg-surface">
                  {grouped[type].map((relationship) => {
                    const relatedSymbol = relationship.company_symbol === company.symbol ? relationship.related_symbol : relationship.company_symbol;
                    const relatedCompany = companiesBySymbol.get(relatedSymbol);
                    return (
                      <button
                        key={relationship.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-3 text-left transition-colors duration-ui ease-out last:border-b-0 hover:bg-surface-hover"
                        onClick={() => onSelectCompany(relatedSymbol)}
                      >
                        <div className="min-w-0">
                          <div className="text-data text-text-primary">{relatedSymbol}</div>
                          <div className="mt-1 line-clamp-1 text-small text-text-secondary">{relatedCompany?.name ?? 'Related company'}</div>
                        </div>
                        <span className="text-small text-text-muted">{formatRelationshipType(relationship.relationship_type)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
