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
