import { useMemo } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, Handle, Position,
  type Node, type Edge, type NodeProps, ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import clsx from 'clsx';
import { TYPE_COLORS } from '@/lib/status';
import { isFinal } from '@/lib/status';
import type { IndexEntry, WorkType } from '@/lib/types';

interface GraphCanvasProps {
  items: IndexEntry[];
  onOpen: (id: string) => void;
}

// Inner node component — a small card with the id, type, and title.
function ItemNode({ data, selected }: NodeProps) {
  const d = data as { item: IndexEntry };
  const it = d.item;
  const final = isFinal(it.status);
  return (
    <div
      className={clsx(
        'rounded-md bg-surface shadow-soft-sm border text-[10px] overflow-hidden',
        selected ? 'border-accent ring-2 ring-accent/40' : 'border-border',
        final && 'opacity-60',
      )}
      style={{ minWidth: 140, maxWidth: 200 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-border !w-1.5 !h-1.5" />
      <div
        className="h-1"
        style={{ backgroundColor: TYPE_COLORS[it.type] }}
      />
      <div className="px-2 py-1.5 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: TYPE_COLORS[it.type] }}
          />
          <code className="font-mono text-[10px] text-ink-muted truncate">{it.id}</code>
        </div>
        <div className="text-[11px] text-ink truncate font-medium">{it.title}</div>
        <div className="text-[9px] text-ink-muted truncate">{it.status}</div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-border !w-1.5 !h-1.5" />
    </div>
  );
}

const nodeTypes = { item: ItemNode };

export function GraphCanvas({ items, onOpen }: GraphCanvasProps) {
  const idSet = useMemo(() => new Set(items.map(i => i.id)), [items]);

  // Layout: columns by type, rows by id within each type. Edges = parent_id
  // and plan_id links (since blocks/related_to are only in the full item, not
  // the index — to get them we'd need a per-item fetch, which the index
  // doesn't carry).
  const { nodes, edges } = useMemo(() => {
    const byType: Record<string, IndexEntry[]> = {};
    for (const it of items) (byType[it.type] ||= []).push(it);

    const colW = 240;
    const rowH = 90;
    const types = Object.keys(byType);
    const ns: Node[] = [];
    const es: Edge[] = [];

    for (const it of items) {
      const addEdge = (to: string, kind: 'parent' | 'plan') => {
        if (!idSet.has(to)) return;
        es.push({
          id: `${it.id}-${kind}-${to}`,
          source: it.id,
          target: to,
          style: { stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 2' },
        });
      };
      if (it.parent_id) addEdge(it.parent_id, 'parent');
      if (it.plan_id) addEdge(it.plan_id, 'plan');
    }

    types.forEach((t, col) => {
      const colItems = byType[t].slice().sort((a, b) => a.id.localeCompare(b.id));
      colItems.forEach((it, row) => {
        ns.push({
          id: it.id,
          type: 'item',
          position: { x: col * colW, y: row * rowH },
          data: { item: it },
        });
      });
    });

    return { nodes: ns, edges: es };
  }, [items, idSet]);

  if (items.length === 0) {
    return <div className="h-full flex items-center justify-center text-ink-muted text-sm">No items to graph</div>;
  }

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={1.5}
        onNodeClick={(_, n) => onOpen(n.id)}
        proOptions={{ hideAttribution: true }}
        className="bg-bg"
      >
        <Background gap={24} color="currentColor" className="text-surface-3" />
        <Controls position="bottom-right" className="!bg-surface !border-border !shadow-soft-sm [&>button]:!bg-surface [&>button]:!border-border [&>button]:!text-ink-muted [&>button:hover]:!bg-surface-2" />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(0,0,0,0.05)"
          nodeColor={(n) => {
            const t = (n.data as any)?.item?.type as WorkType | undefined;
            return (t && TYPE_COLORS[t]) || '#888';
          }}
          className="!bg-surface !border-border"
        />
      </ReactFlow>
    </ReactFlowProvider>
  );
}
