import clsx from 'clsx';
import type { Priority } from '@/lib/types';

const PRIORITY_CLS: Record<Priority, string> = {
  urgent: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 ring-red-300/60 dark:ring-red-700/60',
  high:   'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 ring-orange-300/60 dark:ring-orange-700/60',
  medium: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ring-amber-300/60 dark:ring-amber-700/60',
  low:    'bg-lime-50 text-lime-800 dark:bg-lime-950 dark:text-lime-300 ring-lime-300/60 dark:ring-lime-700/60',
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded text-[10px] font-medium px-1.5 py-0.5 ring-1 ring-inset uppercase tracking-wider',
        PRIORITY_CLS[priority],
        className,
      )}
    >
      {priority}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: Priority | undefined | null }) {
  if (!priority) return null;
  const colors: Record<Priority, string> = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-lime-500',
  };
  return <span className={clsx('inline-block w-1.5 h-1.5 rounded-full mr-1.5', colors[priority])} title={priority} />;
}
