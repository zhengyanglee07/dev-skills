import { useIndex } from '@/api/queries';
import { useUIStore } from '@/state/store';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import clsx from 'clsx';

export function WarningsView() {
  const { data: index, isLoading, error } = useIndex();
  const warnKindFilter = useUIStore(s => s.warnKindFilter);
  const setWarnKindFilter = useUIStore(s => s.setWarnKindFilter);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  }
  if (error) {
    return <div className="p-6 text-danger text-sm">Failed to load index: {String(error)}</div>;
  }

  const warnings = index?.warnings || [];
  const kinds = ['all', ...Array.from(new Set(warnings.map(w => w.kind).filter(Boolean))).sort()];
  const filtered = warnKindFilter === 'all' ? warnings : warnings.filter(w => w.kind === warnKindFilter);

  if (warnings.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <EmptyState icon="🎉" title="No warnings" description="All work items pass validation." />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-border bg-surface-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mr-1">Kind</span>
          {kinds.map(k => (
            <button
              key={k}
              onClick={() => setWarnKindFilter(k)}
              className={clsx(
                'px-2 py-0.5 rounded text-[11px] transition-colors',
                warnKindFilter === k
                  ? 'bg-accent text-white'
                  : 'bg-surface text-ink-muted hover:text-ink border border-border',
              )}
            >
              {k} <span className="opacity-60 font-mono">
                {k === 'all' ? warnings.length : warnings.filter(w => w.kind === k).length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((w, i) => (
          <div key={i} className="px-4 py-2.5 border-b border-border last:border-0 hover:bg-surface-2">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-warn bg-warn-bg px-1.5 py-0.5 rounded">
                {w.kind}
              </span>
              <code className="text-[11px] text-ink-muted truncate">{w.path}</code>
            </div>
            <div className="text-sm text-ink">{w.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
