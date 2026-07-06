import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useIndex } from '@/api/queries';
import type { IndexEntry, DocEntry, BusinessPlanEntry } from '@/lib/types';

interface IdLinkProps {
  id: string;
  className?: string;
}

// Renders a clickable id that navigates to the right view, depending on
// whether the id refers to an item, doc, or plan. Falls back to a plain span
// if the id isn't found in the index.
export function IdLink({ id, className }: IdLinkProps) {
  const { data: index } = useIndex();
  const kind = resolveKind(id, index?.items, index?.docs, index?.business_plans);
  if (!kind) {
    return <span className={clsx('font-mono text-xs text-ink-muted', className)}>{id}</span>;
  }
  return (
    <Link
      to={kind.path}
      className={clsx(
        'font-mono text-xs px-1 py-0.5 rounded',
        'bg-surface-2 hover:bg-accent-soft text-accent hover:text-accent-strong',
        'transition-colors',
        className,
      )}
    >
      {id}
    </Link>
  );
}

function resolveKind(
  id: string,
  items: IndexEntry[] | undefined,
  docs: DocEntry[] | undefined,
  plans: BusinessPlanEntry[] | undefined,
): { kind: 'item' | 'doc' | 'plan'; path: string } | null {
  if (items?.some(x => x.id === id)) return { kind: 'item', path: `/items/${id}` };
  if (docs?.some(x => x.id === id)) return { kind: 'doc', path: `/docs/${id}` };
  if (plans?.some(x => x.id === id)) return { kind: 'plan', path: `/plans/${id}` };
  return null;
}
