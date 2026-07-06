import { useMemo, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useIndex } from '@/api/queries';
import { useUIStore } from '@/state/store';
import { Filters } from '@/components/Filters';
import { Spinner } from '@/components/Spinner';
import { searchItems } from '@/lib/search';
import { isFinal } from '@/lib/status';
import { TYPE_ORDER, TYPE_COLORS } from '@/lib/status';
import type { WorkType } from '@/lib/types';
import type { IndexEntry } from '@/lib/types';

// Lazy-load the heavy graph lib only when this view is opened
const GraphCanvas = lazy(() => import('@/components/GraphCanvas').then(m => ({ default: m.GraphCanvas })));

export function GraphView() {
  const { data: index, isLoading } = useIndex();
  const search = useUIStore(s => s.search);
  const typeFilter = useUIStore(s => s.typeFilter);
  const statusFilter = useUIStore(s => s.statusFilter);
  const priorityFilter = useUIStore(s => s.priorityFilter);
  const tagFilter = useUIStore(s => s.tagFilter);
  const showOpen = useUIStore(s => s.showOpen);
  const [enabledTypes, setEnabledTypes] = useState<Record<WorkType, boolean>>(
    () => Object.fromEntries(TYPE_ORDER.map(t => [t, true])) as any,
  );
  const nav = useNavigate();

  const items = useMemo<IndexEntry[]>(() => {
    if (!index) return [];
    let xs = searchItems(index.items || [], search);
    if (typeFilter !== 'all') xs = xs.filter(i => i.type === typeFilter);
    if (statusFilter !== 'all') xs = xs.filter(i => i.status === statusFilter);
    if (priorityFilter !== 'all') xs = xs.filter(i => i.priority === priorityFilter);
    if (tagFilter !== 'all') xs = xs.filter(i => (i.tags || []).includes(tagFilter));
    if (showOpen === 'open') xs = xs.filter(i => !isFinal(i.status));
    if (showOpen === 'done') xs = xs.filter(i => isFinal(i.status));
    return xs.filter(i => enabledTypes[i.type]);
  }, [index, search, typeFilter, statusFilter, priorityFilter, tagFilter, showOpen, enabledTypes]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  }
  if (!index) {
    return <div className="p-6 text-danger">Failed to load index</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <Filters />
      <div className="px-4 py-2 border-b border-border bg-surface flex items-center gap-3 text-xs flex-wrap">
        <span className="text-ink-muted text-[10px] uppercase tracking-wider font-medium">Show types</span>
        {TYPE_ORDER.map(t => {
          const present = (index.items || []).some(x => x.type === t);
          if (!present) return null;
          return (
            <button
              key={t}
              onClick={() => setEnabledTypes(s => ({ ...s, [t]: !s[t] }))}
              className={clsx(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors',
                enabledTypes[t] ? 'text-ink' : 'text-ink-muted opacity-50',
              )}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[t] }} />
              {t}
            </button>
          );
        })}
        <span className="ml-auto text-ink-muted">
          <span className="font-mono">{items.length}</span> nodes
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <Suspense fallback={<div className="h-full flex items-center justify-center text-ink-muted text-sm"><Spinner /> loading graph…</div>}>
          <GraphCanvas items={items} onOpen={id => nav(`/items/${id}`)} />
        </Suspense>
      </div>
    </div>
  );
}
