import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Briefcase, ChevronRight, Folder } from 'lucide-react';
import clsx from 'clsx';
import { useIndex } from '@/api/queries';
import { useDoc } from '@/api/queries';
import { useUIStore } from '@/state/store';
import { Markdown } from '@/components/Markdown';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';

export function PlansView() {
  const { data: index, isLoading } = useIndex();
  const { id: paramId } = useParams<{ id?: string }>();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const setExpanded = useUIStore(s => s.setExpanded);
  const expanded = useUIStore(s => s.expanded);

  // Pick first plan on mount, or use URL param
  useEffect(() => {
    if (!index) return;
    if (paramId) {
      const plan = (index.business_plans || []).find(p => p.id === paramId);
      if (plan) setSelectedPath(plan.path);
      return;
    }
    if (!selectedPath && index.business_plans?.length) {
      setSelectedPath(index.business_plans[0].path);
    }
  }, [index, paramId, selectedPath]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  }
  if (!index) {
    return <div className="p-6 text-danger">Failed to load index</div>;
  }

  const plans = index.business_plans || [];
  if (plans.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <EmptyState icon="💼" title="No business plans" description="Spaces/BusinessPlan/ is empty." />
      </div>
    );
  }

  // Group plans by folder
  const byFolder: Record<string, typeof plans> = {};
  for (const p of plans) (byFolder[p.folder || ''] ||= []).push(p);
  const folders = Object.keys(byFolder).sort();

  return (
    <div className="h-full grid grid-cols-[280px_1fr]">
      <div className="border-r border-border overflow-y-auto">
        {folders.map(folder => {
          const key = `planfolder:${folder}`;
          const isOpen = expanded[key] !== false; // default open
          return (
            <div key={folder || '__top'}>
              {folder && (
                <button
                  onClick={() => setExpanded(key, !isOpen)}
                  className="w-full px-3 py-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted hover:bg-surface-2"
                >
                  <ChevronRight className={clsx('w-3 h-3 transition-transform', isOpen && 'rotate-90')} />
                  <Folder className="w-3 h-3" />
                  <span className="truncate">{folder}</span>
                </button>
              )}
              {(!folder || isOpen) && byFolder[folder].map(p => (
                <button
                  key={p.path}
                  onClick={() => setSelectedPath(p.path)}
                  className={clsx(
                    'w-full px-3 py-1.5 flex items-start gap-2 text-left text-sm hover:bg-surface-2 border-l-2',
                    selectedPath === p.path
                      ? 'border-accent bg-accent-soft/40'
                      : 'border-transparent',
                  )}
                >
                  <Briefcase className="w-3.5 h-3.5 text-ink-muted mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.title || p.filename}</div>
                    <div className="text-[10px] text-ink-muted truncate">
                      {p.phase && <span>{p.phase}</span>}
                      {p.phase && p.status && <span> · </span>}
                      {p.status && <span>{p.status}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <PlanDetail path={selectedPath} />
    </div>
  );
}

function PlanDetail({ path }: { path: string | null }) {
  const { data: text, isLoading } = useDoc(path);
  if (!path) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <EmptyState icon="💼" title="Select a plan" />
      </div>
    );
  }
  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  }
  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      <div className="max-w-3xl mx-auto">
        <Markdown content={text || ''} />
      </div>
    </div>
  );
}
