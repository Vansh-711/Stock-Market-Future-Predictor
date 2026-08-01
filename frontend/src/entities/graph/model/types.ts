export type GraphNode = {
  id: string;
  name: string;
  sector: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  type: string;
};

export type RelationshipGraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type GraphStats = {
  company_count: number;
  edge_count: number;
  by_sector: Record<string, number>;
  by_relationship_type: Record<string, number>;
};
