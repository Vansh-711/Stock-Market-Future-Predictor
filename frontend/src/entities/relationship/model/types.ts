export type RelationshipType = 'supplier' | 'customer' | 'competitor' | 'peer' | string;

export type Relationship = {
  id: number;
  company: number;
  related_company: number;
  company_symbol: string;
  related_symbol: string;
  relationship_type: RelationshipType;
  notes: string;
};
