import { useMemo } from 'react';
import { parseISO, format, startOfWeek, addDays, subWeeks } from 'date-fns';
import clsx from 'clsx';
import type { IndexEntry } from '@/lib/types';

interface Props {
  items: IndexEntry[];
  weeks?: number;
}

// GitHub-style 52-week activity heatmap. Each cell = a day; intensity =
// number of items closed that day.
export function ActivityHeatmap({ items, weeks = 26 }: Props) {
  const { days, max } = useMemo(() => {
    const today = new Date();
    const end = startOfWeek(today, { weekStartsOn: 1 });
    const start = startOfWeek(subWeeks(end, weeks - 1), { weekStartsOn: 1 });
    const totalDays = weeks * 7;
    const counts = new Array(totalDays).fill(0);
    let m = 0;
    for (const it of items) {
      const closed = it.completed_at || it.cancelled_at || it.converted_at;
      if (!closed) continue;
      const d = parseISO(closed);
      const dayIdx = Math.floor((d.getTime() - start.getTime()) / 86400000);
      if (dayIdx >= 0 && dayIdx < totalDays) {
        counts[dayIdx]++;
        if (counts[dayIdx] > m) m = counts[dayIdx];
      }
    }
    const dayList = Array.from({ length: totalDays }, (_, i) => addDays(start, i));
    return { days: dayList.map((d, i) => ({ date: d, count: counts[i] })), max: m };
  }, [items, weeks]);

  if (items.length === 0) {
    return <div className="h-full flex items-center justify-center text-ink-muted text-xs">no activity</div>;
  }

  // Group by week (column)
  const cols: { date: Date; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    cols.push(days.slice(i, i + 7));
  }

  const intensity = (c: number) => {
    if (c === 0) return 'bg-surface-2';
    if (max === 0) return 'bg-surface-2';
    const t = c / max;
    if (t < 0.25) return 'bg-emerald-200 dark:bg-emerald-900';
    if (t < 0.5) return 'bg-emerald-300 dark:bg-emerald-700';
    if (t < 0.75) return 'bg-emerald-400 dark:bg-emerald-500';
    return 'bg-emerald-500 dark:bg-emerald-400';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-0.5 min-w-fit">
          {cols.map((week, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {week.map(({ date, count }) => (
                <div
                  key={+date}
                  className={clsx('w-2.5 h-2.5 rounded-sm', intensity(count))}
                  title={`${format(date, 'yyyy-MM-dd')}: ${count} closed`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2 text-[9px] text-ink-muted">
        <span>less</span>
        <div className="w-2.5 h-2.5 rounded-sm bg-surface-2" />
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-300 dark:bg-emerald-700" />
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400 dark:bg-emerald-500" />
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
        <span>more</span>
        <span className="ml-auto">{weeks} weeks · max {max}/day</span>
      </div>
    </div>
  );
}
