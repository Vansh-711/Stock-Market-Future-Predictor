import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Maximize2, Minus, Plus } from 'lucide-react';
import type { GraphEdge, GraphNode, RelationshipGraphData } from '@/entities/graph/model/types';
import { IconButton } from '@/shared/ui/IconButton';
import { nodeRadiusForSymbol } from '@/shared/lib/marketCap';
import { sectorColor, TOKEN_COLORS } from '@/shared/lib/theme';
import { useElementSize } from '@/shared/hooks/useElementSize';

type GraphLink = GraphEdge & {
  source: string | GraphNode;
  target: string | GraphNode;
};

type MutableGraphNode = GraphNode & {
  x?: number;
  y?: number;
};

type RelationshipGraphProps = {
  data: RelationshipGraphData;
  selectedSymbol: string | null;
  onSelectNode: (symbol: string) => void;
};

const endpointSymbol = (endpoint: string | GraphNode) => (typeof endpoint === 'string' ? endpoint : endpoint.id);
const isDirectional = (type: string) => type === 'supplier' || type === 'customer' || type === 'suppliercustomer';

export function RelationshipGraph({ data, selectedSymbol, onSelectNode }: RelationshipGraphProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(containerRef);
  const [hoverSymbol, setHoverSymbol] = useState<string | null>(null);

  const graphData = useMemo(
    () => ({
      nodes: data.nodes,
      links: data.edges.map((edge) => ({ ...edge })),
    }),
    [data],
  );

  const focusSymbol = hoverSymbol ?? selectedSymbol;

  useEffect(() => {
    if (!selectedSymbol || !graphRef.current) return;
    const currentData = graphRef.current.graphData?.();
    const node = currentData?.nodes?.find((candidate: MutableGraphNode) => candidate.id === selectedSymbol);
    if (typeof node?.x === 'number' && typeof node?.y === 'number') {
      graphRef.current.centerAt?.(node.x, node.y, 200);
      graphRef.current.zoom?.(1.6, 200);
    }
  }, [selectedSymbol]);

  const linkColor = (link: GraphLink) => {
    const source = endpointSymbol(link.source);
    const target = endpointSymbol(link.target);
    const isConnected = focusSymbol && (source === focusSymbol || target === focusSymbol);
    if (isConnected) return TOKEN_COLORS.accent;
    if (link.type === 'peer') return 'rgba(255,255,255,0.064)';
    return TOKEN_COLORS.borderStrong;
  };

  const paintNode = (node: MutableGraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const radius = nodeRadiusForSymbol(node.id);
    const isSelected = node.id === selectedSymbol;
    const isHovered = node.id === hoverSymbol;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = sectorColor(node.sector);
    ctx.fill();

    if (isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 3 / globalScale, 0, 2 * Math.PI, false);
      ctx.lineWidth = 1.5 / globalScale;
      ctx.strokeStyle = TOKEN_COLORS.accent;
      ctx.stroke();
    }

    if (globalScale > 1.4 || isSelected || isHovered) {
      const fontSize = 12 / globalScale;
      ctx.font = `400 ${fontSize}px Inter`;
      ctx.fillStyle = TOKEN_COLORS.textPrimary;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.id, x + radius + 4 / globalScale, y);
    }
  };

  const paintPointerArea = (node: MutableGraphNode, color: string, ctx: CanvasRenderingContext2D) => {
    const radius = nodeRadiusForSymbol(node.id) + 6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI, false);
    ctx.fill();
  };

  const handleZoom = (factor: number) => {
    const graph = graphRef.current;
    if (!graph) return;
    const currentZoom = typeof graph.zoom === 'function' ? graph.zoom() : 1;
    graph.zoom(currentZoom * factor, 200);
  };

  const handleFit = () => {
    graphRef.current?.zoomToFit?.(200, 32);
  };

  return (
    <div ref={containerRef} className="relative min-h-graph overflow-hidden rounded-card border border-border bg-canvas">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={size.width || 960}
        height={size.height || 600}
        backgroundColor={TOKEN_COLORS.canvas}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={paintPointerArea}
        nodeRelSize={1}
        linkWidth={() => 1}
        linkColor={linkColor}
        linkLineDash={(link: GraphLink) => {
          if (link.type === 'competitor') return [6, 4];
          if (link.type === 'peer') return [1, 4];
          return null;
        }}
        linkDirectionalArrowLength={(link: GraphLink) => (isDirectional(link.type) ? 4 : 0)}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={linkColor}
        cooldownTicks={80}
        onNodeHover={(node: MutableGraphNode | null) => setHoverSymbol(node?.id ?? null)}
        onNodeClick={(node: MutableGraphNode) => onSelectNode(node.id)}
        onBackgroundClick={() => setHoverSymbol(null)}
      />
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 rounded-card border border-border bg-surface-raised p-2">
        <IconButton label="Zoom in" variant="secondary" onClick={() => handleZoom(1.25)}>
          <Plus className="h-icon w-icon" aria-hidden="true" />
        </IconButton>
        <IconButton label="Zoom out" variant="secondary" onClick={() => handleZoom(0.8)}>
          <Minus className="h-icon w-icon" aria-hidden="true" />
        </IconButton>
        <IconButton label="Fit to view" variant="secondary" onClick={handleFit}>
          <Maximize2 className="h-icon w-icon" aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}
