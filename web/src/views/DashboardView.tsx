import { useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  ListTodo, Briefcase, AlertTriangle, CheckCircle2, Circle,
  Wrench, Sparkles, ArrowRight, Clock,
} from 'lucide-react';
import clsx from 'clsx';
import { useIndex, useIndexStatus } from '@/api/queries';
import { Spinner } from '@/components/Spinner';
import { TypeBadge } from '@/components/Badge';
import { StatusBadge } from '@/components/StatusBadge';
import { isFinal, isInProgress, isReady } from '@/lib/status';
import { relTime } from '@/lib/format';

// Lazy-load the recharts bundle so it doesn't bloat the main chunk
const StatusDonut = lazy(() => import('@/charts/StatusDonut').then(m => ({ default: m.StatusDonut })));
const TypeBar = lazy(() => import('@/charts/TypeBar').then(m => ({ default: m.TypeBar })));
const PriorityBar = lazy(() => import('@/charts/PriorityBar').then(m => ({ default: m.PriorityBar })));
const ActivityLine = lazy(() => import('@/charts/ActivityLine').then(m => ({ default: m.ActivityLine })));
const ActivityHeatmap = lazy(() => import('@/charts/ActivityHeatmap').then(m => ({ default: m.ActivityHeatmap })));
const VelocityChart = lazy(() => import('@/charts/VelocityChart').then(m => ({ default: m.VelocityChart })));

export function DashboardView() {
  const { data: index, isLoading, error } = useIndex();
  const { data: status } = useIndexStatus();

  const counts = useMemo(() => {
    if (!index) return null;
    const items = index.items || [];
    const final = items.filter(i => isFinal(i.status)).length;
    const inProgress = items.filter(i => isInProgress(i.status)).length;
    const ready = items.filter(i => isReady(i.status)).length;
    const blocked = items.filter(i => (i as any).blocked_by?.length > 0 && !isFinal(i.status)).length;
    const overdue = items.filter(i => {
      if (isFinal(i.status)) return false;
      if (!(i as any).due_date) return false;
      return new Date((i as any).due_date) < new Date();
    }).length;
    return { total: items.length, final, inProgress, ready, blocked, overdue };
  }, [index]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  }
  if (error || !index) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-2 max-w-md">
          <AlertTriangle className="w-8 h-8 text-danger mx-auto" />
          <div className="text-sm font-medium text-ink">Failed to load index</div>
          <div className="text-xs text-ink-muted font-mono break-all">{String(error)}</div>
          <div className="text-[11px] text-ink-muted">
            Run <code className="px-1 bg-surface-2 rounded">python scripts/update_index.py &lt;project&gt;</code> to generate it.
          </div>
        </div>
      </div>
    );
  }

  const items = index.items || [];
  const recent = [...items]
    .filter(i => i.completed_at || i.cancelled_at || i.converted_at)
    .sort((a, b) => (b.completed_at || b.cancelled_at || b.converted_at || '').localeCompare(a.completed_at || a.cancelled_at || a.converted_at || ''))
    .slice(0, 6);
  const recentCreated = [...items]
    .filter(i => i.created_at)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 6);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-5 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI
            icon={ListTodo}
            label="Items"
            value={counts?.total ?? 0}
            sub={`${counts?.ready ?? 0} ready · ${counts?.inProgress ?? 0} in progress`}
            accent="blue"
          />
          <KPI
            icon={CheckCircle2}
            label="Closed"
            value={counts?.final ?? 0}
            sub={`${counts && counts.total > 0 ? Math.round((counts.final / counts.total) * 100) : 0}% of total`}
            accent="emerald"
          />
          <KPI
            icon={AlertTriangle}
            label="Warnings"
            value={index.warnings?.length ?? 0}
            sub={status?.index_age_seconds != null ? `index ${relTime(new Date(Date.now() - status.index_age_seconds * 1000).toISOString())}` : ''}
            accent={(index.warnings?.length ?? 0) > 0 ? 'amber' : 'stone'}
            href="/warnings"
          />
          <KPI
            icon={Briefcase}
            label="Plans / Docs"
            value={(index.business_plans?.length ?? 0) + (index.docs?.length ?? 0)}
            sub={`${index.business_plans?.length ?? 0} plans · ${index.docs?.length ?? 0} docs`}
            accent="violet"
          />
        </div>

        {/* Charts row 1: status donut, type bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card title="Status distribution" icon={Circle}>
            <Chart height={240}>
              <StatusDonut data={index.counts_by_status || {}} />
            </Chart>
          </Card>
          <Card title="Items by type" icon={ListTodo}>
            <Chart height={240}>
              <TypeBar data={index.counts_by_type || {}} />
            </Chart>
          </Card>
        </div>

        {/* Charts row 2: priority, activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card title="Items by priority" icon={Sparkles}>
            <Chart height={200}>
              <PriorityBar data={items.reduce((acc, i) => {
                if (i.priority) acc[i.priority] = (acc[i.priority] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)} />
            </Chart>
          </Card>
          <Card title="Activity (last 26 weeks)" icon={Clock}>
            <Chart height={200}>
              <ActivityLine items={items} weeks={26} />
            </Chart>
          </Card>
        </div>

        {/* Charts row 3: velocity, heatmap */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card title="Velocity" icon={Wrench} className="md:col-span-2">
            <Chart height={220}>
              <VelocityChart items={items} weeks={26} />
            </Chart>
          </Card>
          <Card title="Heatmap" icon={CheckCircle2}>
            <Chart height={220}>
              <ActivityHeatmap items={items} weeks={26} />
            </Chart>
          </Card>
        </div>

        {/* Recent activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card title="Recently closed" icon={CheckCircle2} action={<Link to="/items?sort=updated" className="text-[10px] text-accent hover:underline flex items-center gap-0.5">view all <ArrowRight className="w-3 h-3" /></Link>}>
            <ul className="space-y-1 text-xs">
              {recent.length === 0 && <li className="text-ink-muted text-center py-4">No closed items</li>}
              {recent.map(it => (
                <li key={it.id} className="flex items-center gap-2 group">
                  <TypeBadge type={it.type} />
                  <Link to={`/items/${it.id}`} className="font-mono text-[10px] text-ink-muted hover:text-accent shrink-0">{it.id}</Link>
                  <Link to={`/items/${it.id}`} className="flex-1 truncate hover:text-accent">{it.title}</Link>
                  <span className="text-[10px] text-ink-muted font-mono shrink-0">
                    {relTime((it.completed_at || it.cancelled_at || it.converted_at)!)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Recently created" icon={Sparkles} action={<Link to="/items?sort=created" className="text-[10px] text-accent hover:underline flex items-center gap-0.5">view all <ArrowRight className="w-3 h-3" /></Link>}>
            <ul className="space-y-1 text-xs">
              {recentCreated.length === 0 && <li className="text-ink-muted text-center py-4">No items</li>}
              {recentCreated.map(it => (
                <li key={it.id} className="flex items-center gap-2 group">
                  <TypeBadge type={it.type} />
                  <Link to={`/items/${it.id}`} className="font-mono text-[10px] text-ink-muted hover:text-accent shrink-0">{it.id}</Link>
                  <Link to={`/items/${it.id}`} className="flex-1 truncate hover:text-accent">{it.title}</Link>
                  <StatusBadge status={it.status} />
                  <span className="text-[10px] text-ink-muted font-mono shrink-0">{relTime(it.created_at!)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KPI({
  icon: Icon, label, value, sub, accent, href,
}: {
  icon: any; label: string; value: number; sub?: string; accent: 'blue' | 'emerald' | 'amber' | 'stone' | 'violet'; href?: string;
}) {
  const colorMap = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
    stone: 'text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800/40',
    violet: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40',
  };
  const inner = (
    <div className="rounded-lg border border-border bg-surface shadow-soft-sm p-3.5 flex items-start gap-3 hover:shadow-soft transition-shadow">
      <div className={clsx('w-9 h-9 rounded-md flex items-center justify-center shrink-0', colorMap[accent])}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">{label}</div>
        <div className="text-2xl font-semibold leading-none mt-1 font-mono">{value}</div>
        {sub && <div className="text-[10px] text-ink-muted mt-1 truncate">{sub}</div>}
      </div>
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

function Card({ title, icon: Icon, children, action, className }: { title: string; icon?: any; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <section className={clsx('rounded-lg border border-border bg-surface shadow-soft-sm p-4', className)}>
      <header className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-3.5 h-3.5 text-ink-muted" />}
        <h2 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </header>
      {children}
    </section>
  );
}

function Chart({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <div className="relative" style={{ height }}>
      <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-ink-muted text-xs"><Spinner size={12} /></div>}>
        {children}
      </Suspense>
    </div>
  );
}
