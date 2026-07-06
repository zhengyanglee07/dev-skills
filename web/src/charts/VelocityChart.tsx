import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import type { IndexEntry } from '@/lib/types';

interface Props {
  items: IndexEntry[];
  weeks?: number;
}

// Cumulative open vs closed over time. "Open" counts items created up
// to that week minus items closed up to that week. "Closed" is the
// running total of closed items.
export function VelocityChart({ items, weeks = 26 }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(subWeeks(now, weeks - 1), { weekStartsOn: 1 });
    const buckets: { wk: string; open: number; closed: number }[] = [];
    let cursor = start;
    for (let i = 0; i < weeks; i++) {
      buckets.push({ wk: format(cursor, "MMM d"), open: 0, closed: 0 });
      cursor = addWeeks(cursor, 1);
    }
    const created: string[] = [];
    const closed: string[] = [];
    for (const it of items) {
      if (it.created_at) created.push(it.created_at);
      const c = it.completed_at || it.cancelled_at || it.converted_at;
      if (c) closed.push(c);
    }
    created.sort();
    closed.sort();
    for (let i = 0; i < weeks; i++) {
      const wkEnd = addWeeks(start, i + 1);
      const wkEndIso = wkEnd.toISOString();
      const createdToDate = created.filter(t => t < wkEndIso).length;
      const closedToDate = closed.filter(t => t < wkEndIso).length;
      buckets[i].open = createdToDate - closedToDate;
      buckets[i].closed = closedToDate;
    }
    return buckets;
  }, [items, weeks]);

  if (items.length === 0) {
    return <div className="h-full flex items-center justify-center text-ink-muted text-xs">no activity</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="closedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
          </linearGradient>
        </defs>
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
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
          itemStyle={{ color: 'var(--text)' }}
        />
        <Area type="monotone" dataKey="open" stroke="#f59e0b" strokeWidth={1.5} fill="url(#openGrad)" name="open" />
        <Area type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={1.5} fill="url(#closedGrad)" name="closed" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
