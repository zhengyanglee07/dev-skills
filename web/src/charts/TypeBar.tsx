import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { TYPE_COLORS, TYPE_ORDER } from '@/lib/status';

interface Props {
  data: Record<string, number>;
}

// Horizontal bar chart of items by type, sorted descending.
export function TypeBar({ data }: Props) {
  const ordered = TYPE_ORDER
    .map(t => [t, data[t] || 0] as [string, number])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (ordered.length === 0) {
    return <div className="h-full flex items-center justify-center text-ink-muted text-xs">no items</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, ordered.length * 24 + 40)}>
      <BarChart data={ordered.map(([name, value]) => ({ name, value }))} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          width={70}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--surface-2)' }}
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
          itemStyle={{ color: 'var(--text)' }}
        />
        <Bar dataKey="value" radius={[0, 3, 3, 0]}>
          {ordered.map(([t]) => <Cell key={t} fill={TYPE_COLORS[t as keyof typeof TYPE_COLORS] || '#888'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
