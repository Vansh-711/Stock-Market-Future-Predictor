import type { Company } from '@/entities/company/model/types';
import { SectorBadge } from '@/entities/company/ui/SectorBadge';

export function CompanyHeader({ company }: { company: Company }) {
  return (
    <header>
      <div className="text-display-data text-text-primary">{company.symbol}</div>
      <h1 className="mt-2 text-h2 text-text-primary">{company.name}</h1>
      <SectorBadge className="mt-3" sector={company.sector} />
    </header>
  );
}
