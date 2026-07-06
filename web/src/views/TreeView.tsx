import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { useIndex } from '@/api/queries';
import { useUIStore } from '@/state/store';
import { Filters } from '@/components/Filters';
import { TypeBadge } from '@/components/Badge';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityDot } from '@/components/PriorityBadge';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { buildTree, type TreeNode } from '@/lib/tree';
import { searchItems } from '@/lib/search';
import { isFinal } from '@/lib/status';
export function TreeView() {
  const { data: index, isLoading } = useIndex();
  const search = useUIStore(s => s.search);
  const expanded = useUIStore(s => s.expanded);
  const toggleExpanded = useUIStore(s => s.toggleExpanded);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const nav = useNavigate();

  const { plans, loose } = useMemo(() => {
    if (!index) return { plans: [], loose: [] };
    const items = searchItems(index.items || [], search);
    return buildTree(items);
  }, [index, search]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  }
  if (!index) {
    return <div className="p-6 text-danger">Failed to load index</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <Filters />
      <div className="flex-1 overflow-y-auto">
        {plans.length === 0 && loose.length === 0 && (
          <EmptyState icon="🌲" title="No matching items" />
        )}
        {plans.map(plan => (
          <TreeItem
            key={plan.item.id}
            node={plan}
            depth={0}
            expanded={expanded}
            onToggle={toggleExpanded}
            onSelect={setSelectedId}
            selectedId={selectedId}
            onOpen={id => nav(`/items/${id}`)}
          />
        ))}
        {loose.length > 0 && (
          <>
            <div className="px-4 py-1.5 mt-2 text-[10px] uppercase tracking-wider text-ink-muted bg-surface-2 border-y border-border flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              Loose items <span className="font-mono">{loose.length}</span>
            </div>
            {loose.map(it => (
              <TreeItem
                key={it.id}
                node={{ item: it, children: [] }}
                depth={0}
                expanded={expanded}
                onToggle={toggleExpanded}
                onSelect={setSelectedId}
                selectedId={selectedId}
                onOpen={id => nav(`/items/${id}`)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function TreeItem({
  node, depth, expanded, onToggle, onSelect, selectedId, onOpen,
}: {
  node: TreeNode;
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (k: string) => void;
  onSelect: (id: string | null) => void;
  selectedId: string | null;
  onOpen: (id: string) => void;
}) {
  const expKey = (node.item.type === 'plan' ? 'plan:' : 'epic:') + node.item.id;
  const isOpen = !!expanded[expKey];
  const hasChildren = node.children.length > 0;
  const closedKids = node.children.filter(c => isFinal(c.item.status)).length;
  const progress = hasChildren ? closedKids / node.children.length : 0;
  const isActive = selectedId === node.item.id;

  return (
    <>
      <div
        className={clsx(
          'flex items-center gap-1.5 py-1.5 pr-3 cursor-pointer hover:bg-surface-2 group',
          isActive && 'bg-accent-soft/40',
        )}
        style={{ paddingLeft: 12 + depth * 18 }}
        onClick={() => onSelect(isActive ? null : node.item.id)}
        onDoubleClick={() => onOpen(node.item.id)}
      >
        {hasChildren ? (
          <button
            onClick={e => { e.stopPropagation(); onToggle(expKey); }}
            className="p-0.5 -ml-0.5"
          >
            <ChevronRight className={clsx('w-3 h-3 text-ink-muted transition-transform', isOpen && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-3 h-3 inline-block" />
        )}
        <TypeBadge type={node.item.type} />
        <code className="text-[11px] font-mono text-ink-muted">{node.item.id}</code>
        <span className="flex-1 truncate text-sm">{node.item.title}</span>
        {node.item.priority && <PriorityDot priority={node.item.priority} />}
        <StatusBadge status={node.item.status} />
        {hasChildren && (
          <div className="w-12 h-1 rounded-full bg-surface-3 overflow-hidden">
            <div
              className={clsx(
                'h-full transition-all',
                progress === 1 ? 'bg-emerald-500' :
                progress === 0 ? 'bg-stone-300 dark:bg-stone-700' :
                'bg-amber-500',
              )}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
        <button
          onClick={e => { e.stopPropagation(); onOpen(node.item.id); }}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-accent hover:underline"
        >
          open →
        </button>
      </div>
      {hasChildren && isOpen && node.children.map(c => (
        <TreeItem
          key={c.item.id}
          node={c}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onSelect={onSelect}
          selectedId={selectedId}
          onOpen={onOpen}
        />
      ))}
    </>
  );
}
