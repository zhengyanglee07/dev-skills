import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from 'recharts';
import { parseISO, format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import type { IndexEntry } from '@/lib/types';

interface Props {
  items: IndexEntry[];
  weeks?: number;
}

// Two lines: items created per week, items closed (completed/cancelled/converted) per week.
export function ActivityLine({ items, weeks = 26 }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(subWeeks(now, weeks - 1), { weekStartsOn: 1 });
    const buckets: { wk: string; created: number; closed: number }[] = [];
    let cursor = start;
    for (let i = 0; i < weeks; i++) {
      buckets.push({ wk: format(cursor, "MMM d"), created: 0, closed: 0 });
      cursor = addWeeks(cursor, 1);
    }
    const idx = (d: Date) => {
      const diff = Math.floor((startOfWeek(d, { weekStartsOn: 1 }).getTime() - start.getTime()) / (7 * 86400000));
      return diff >= 0 && diff < weeks ? diff : -1;
    };
    for (const it of items) {
      if (it.created_at) {
        const i = idx(parseISO(it.created_at));
        if (i >= 0) buckets[i].created++;
      }
      const closed = it.completed_at || it.cancelled_at || it.converted_at;
      if (closed) {
        const i = idx(parseISO(closed));
        if (i >= 0) buckets[i].closed++;
      }
    }
    return buckets;
  }, [items, weeks]);

  if (items.length === 0) {
    return <div className="h-full flex items-center justify-center text-ink-muted text-xs">no activity</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="wk"
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
          width={28}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
          itemStyle={{ color: 'var(--text)' }}
        />
        <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-muted)' }} iconType="circle" iconSize={8} />
        <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
        <Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
