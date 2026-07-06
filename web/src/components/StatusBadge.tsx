import clsx from 'clsx';
import { isFinal, isInProgress, isReady } from '@/lib/status';

function statusClasses(status: string | undefined | null): string {
  if (!status) return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 ring-stone-200/60 dark:ring-stone-700';
  if (isFinal(status)) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 ring-emerald-200/60 dark:ring-emerald-800/60';
  if (isInProgress(status)) return 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 ring-blue-200/60 dark:ring-blue-800/60';
  if (isReady(status)) return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 ring-stone-200/60 dark:ring-stone-700/60';
  return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 ring-stone-200/60 dark:ring-stone-700/60';
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded text-[10px] font-medium px-1.5 py-0.5 ring-1 ring-inset',
        statusClasses(status),
        className,
      )}
    >
      {status}
    </span>
  );
}
