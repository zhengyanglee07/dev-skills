import clsx from 'clsx';
import type { WorkType } from '@/lib/types';

const TYPE_BG: Record<WorkType, string> = {
  plan:        'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 ring-cyan-200/60 dark:ring-cyan-800/60',
  epic:        'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 ring-orange-200/60 dark:ring-orange-800/60',
  task:        'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 ring-blue-200/60 dark:ring-blue-800/60',
  bug:         'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 ring-red-200/60 dark:ring-red-800/60',
  improvement: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 ring-green-200/60 dark:ring-green-800/60',
  'sub-task':  'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300 ring-fuchsia-200/60 dark:ring-fuchsia-800/60',
  action:      'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300 ring-violet-200/60 dark:ring-violet-800/60',
  backlog:     'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 ring-stone-200/60 dark:ring-stone-700/60',
};

const TYPE_LABEL: Record<WorkType, string> = {
  plan: 'plan',
  epic: 'epic',
  task: 'task',
  bug: 'bug',
  improvement: 'imp',
  'sub-task': 'sub',
  action: 'act',
  backlog: 'blg',
};

export function TypeBadge({ type, className }: { type: WorkType; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded font-mono text-[10px] font-semibold uppercase tracking-wider',
        'px-1.5 py-0.5 ring-1 ring-inset',
        TYPE_BG[type],
        className,
      )}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}
