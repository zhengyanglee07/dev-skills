import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { isFinal, isInProgress, isReady } from '@/lib/status';

interface Props {
  data: Record<string, number>;
}

// Donut chart of items grouped by status. Statuses are colour-coded:
// final = emerald, in-progress = blue, ready = stone. Other = amber.
export function StatusDonut({ data }: Props) {
  const entries = Object.entries(data).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  if (total === 0) {
    return <div className="h-full flex items-center justify-center text-ink-muted text-xs">no items</div>;
  }
  const colourFor = (status: string) => {
    if (isFinal(status)) return '#10b981';
    if (isInProgress(status)) return '#3b82f6';
    if (isReady(status)) return '#a8a29e';
    return '#f59e0b';
  };
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={entries.map(([name, value]) => ({ name, value }))}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={1}
        >
          {entries.map(([s]) => <Cell key={s} fill={colourFor(s)} stroke="none" />)}
        </Pie>
        <Tooltip
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
          itemStyle={{ color: 'var(--text)' }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 10, color: 'var(--text-muted)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
