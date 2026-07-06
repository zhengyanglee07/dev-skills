import clsx from 'clsx';
import { X } from 'lucide-react';
import { useIndex } from '@/api/queries';
import { useUIStore, type ShowOpen, type GanttZoom, type ItemsLayout } from '@/state/store';
import { ALL_PRIORITIES, ALL_STATUSES, TYPE_ORDER } from '@/lib/status';
import type { WorkType } from '@/lib/types';

const VIEWS_WITH_FILTERS = new Set(['items', 'gantt', 'graph', 'calendar', 'tree']);

type OptionRow = [string, string];

export function Filters() {
  const { data: index } = useIndex();
  const view = useUIStore(s => s.view);
  const typeFilter = useUIStore(s => s.typeFilter);
  const statusFilter = useUIStore(s => s.statusFilter);
  const priorityFilter = useUIStore(s => s.priorityFilter);
  const tagFilter = useUIStore(s => s.tagFilter);
  const showOpen = useUIStore(s => s.showOpen);
  const itemsLayout = useUIStore(s => s.itemsLayout);
  const ganttZoom = useUIStore(s => s.ganttZoom);
  const setTypeFilter = useUIStore(s => s.setTypeFilter);
  const setStatusFilter = useUIStore(s => s.setStatusFilter);
  const setPriorityFilter = useUIStore(s => s.setPriorityFilter);
  const setTagFilter = useUIStore(s => s.setTagFilter);
  const setShowOpen = useUIStore(s => s.setShowOpen);
  const setItemsLayout = useUIStore(s => s.setItemsLayout);
  const setGanttZoom = useUIStore(s => s.setGanttZoom);

  if (!VIEWS_WITH_FILTERS.has(view)) return null;
  if (!index) return null;

  // Build status list from what's actually present, with ALL_STATUSES as
  // fallback for saved filters that reference statuses not currently in data.
  const presentStatuses = new Set((index.items || []).map(x => x.status).filter(Boolean) as string[]);
  const statuses = ALL_STATUSES.filter(s => presentStatuses.has(s) || statusFilter === s);

  // Top 12 tags
  const tagCount: Record<string, number> = {};
  for (const it of (index.items || [])) {
    for (const t of (it.tags || [])) tagCount[t] = (tagCount[t] || 0) + 1;
  }
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 12);

  // Type list, ordered by TYPE_ORDER
  const presentTypes = new Set((index.items || []).map(x => x.type));
  const types = (TYPE_ORDER as readonly string[]).filter(t => presentTypes.has(t as WorkType));

  return (
    <div className="border-b border-border bg-surface-2 px-4 py-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <FilterRow
        label="Type"
        active={typeFilter}
        onChange={v => setTypeFilter(v as 'all' | WorkType)}
        options={buildOptions(types.map(t => [t, t]))}
      />
      <FilterRow
        label="Status"
        active={statusFilter}
        onChange={setStatusFilter}
        options={buildOptions(statuses.map(s => [s, s]))}
      />
      <FilterRow
        label="Priority"
        active={priorityFilter}
        onChange={v => setPriorityFilter(v as 'all' | 'urgent' | 'high' | 'medium' | 'low')}
        options={buildOptions(ALL_PRIORITIES.map(p => [p, p]))}
      />
      {topTags.length > 0 && (view === 'items' || view === 'gantt') && (
        <FilterRow
          label="Tag"
          active={tagFilter}
          onChange={setTagFilter}
          options={buildOptions(topTags.map(([t, n]) => [t, `${t} (${n})`]))}
        />
      )}

      {view === 'items' && (
        <Segmented
          label="Show"
          value={showOpen}
          options={[['all', 'all'], ['open', 'open'], ['done', 'done']] as ['all' | 'open' | 'done', string][]}
          onChange={v => setShowOpen(v as ShowOpen)}
        />
      )}
      {view === 'items' && (
        <Segmented
          label="Layout"
          value={itemsLayout}
          options={[['grouped', 'grouped'], ['table', 'table']] as ['grouped' | 'table', string][]}
          onChange={v => setItemsLayout(v as ItemsLayout)}
        />
      )}
      {view === 'gantt' && (
        <Segmented
          label="Zoom"
          value={ganttZoom}
          options={[['week', 'week'], ['month', 'month'], ['quarter', 'quarter']] as ['week' | 'month' | 'quarter', string][]}
          onChange={v => setGanttZoom(v as GanttZoom)}
        />
      )}
    </div>
  );
}

function buildOptions(rows: OptionRow[]): OptionRow[] {
  return [['all', 'all'], ...rows];
}

function FilterRow({
  label,
  active,
  options,
  onChange,
}: {
  label: string;
  active: string;
  options: OptionRow[];
  onChange: (v: string) => void;
}) {
  const isFiltered = active !== 'all';
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-ink-muted text-[10px] uppercase tracking-wider font-medium">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map(([v, optLabel]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={clsx(
              'px-1.5 py-0.5 rounded text-[11px] transition-colors',
              active === v
                ? 'bg-accent text-white dark:bg-accent dark:text-bg'
                : 'bg-surface text-ink-muted hover:text-ink border border-border',
            )}
          >
            {optLabel}
          </button>
        ))}
        {isFiltered && (
          <button
            onClick={() => onChange('all')}
            className="p-0.5 text-ink-muted hover:text-ink"
            title="Clear filter"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-ink-muted text-[10px] uppercase tracking-wider font-medium">{label}</span>
      <div className="flex p-0.5 rounded bg-surface border border-border">
        {options.map(([v, optLabel]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={clsx(
              'px-2 py-0.5 rounded text-[11px] transition-colors',
              value === v
                ? 'bg-bg text-ink shadow-soft-sm font-medium'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {optLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
