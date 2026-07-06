import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { PRIORITY_COLORS, ALL_PRIORITIES } from '@/lib/status';

interface Props {
  data: Record<string, number>;
}

// Vertical bar chart of items by priority.
export function PriorityBar({ data }: Props) {
  const ordered = ALL_PRIORITIES.map(p => ({ name: p, value: data[p] || 0 }));
  const total = ordered.reduce((s, o) => s + o.value, 0);
  if (total === 0) {
    return <div className="h-full flex items-center justify-center text-ink-muted text-xs">no items</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={ordered} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          cursor={{ fill: 'var(--surface-2)' }}
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
          itemStyle={{ color: 'var(--text)' }}
        />
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {ordered.map(o => <Cell key={o.name} fill={PRIORITY_COLORS[o.name as keyof typeof PRIORITY_COLORS]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
