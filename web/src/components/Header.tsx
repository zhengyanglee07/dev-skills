import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ListTodo, GanttChart, Network, Calendar, GitFork,
  BookOpen, Briefcase, AlertTriangle, Search, RefreshCw, Sun, Moon, Laptop, Command,
} from 'lucide-react';
import clsx from 'clsx';
import { useIndex, useIndexStatus, useRefresh } from '@/api/queries';
import { useUIStore, type ViewName } from '@/state/store';
import { StatusDot } from './StatusDot';
import { Spinner } from './Spinner';
import { relTime } from '@/lib/format';
import { useEffect } from 'react';

const VIEWS: { id: ViewName; label: string; icon: typeof LayoutDashboard; path: string }[] = [
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard, path: '/dashboard' },
  { id: 'items',     label: 'Items',      icon: ListTodo,       path: '/items' },
  { id: 'gantt',     label: 'Gantt',      icon: GanttChart,     path: '/gantt' },
  { id: 'graph',     label: 'Graph',      icon: Network,        path: '/graph' },
  { id: 'calendar',  label: 'Calendar',   icon: Calendar,       path: '/calendar' },
  { id: 'tree',      label: 'Tree',       icon: GitFork,        path: '/tree' },
  { id: 'docs',      label: 'Docs',       icon: BookOpen,       path: '/docs' },
  { id: 'plans',     label: 'Plans',      icon: Briefcase,      path: '/plans' },
  { id: 'warnings',  label: 'Warnings',   icon: AlertTriangle,  path: '/warnings' },
];

export function Header() {
  const { data: status } = useIndexStatus();
  const { data: index, isLoading: indexLoading, error: indexError } = useIndex();
  const refresh = useRefresh();
  const view = useUIStore(s => s.view);
  const setView = useUIStore(s => s.setView);
  const setPaletteOpen = useUIStore(s => s.setPaletteOpen);
  const theme = useUIStore(s => s.theme);
  const setTheme = useUIStore(s => s.setTheme);
  const search = useUIStore(s => s.search);
  const setSearch = useUIStore(s => s.setSearch);
  const nav = useNavigate();
  const loc = useLocation();

  // Derive the active view from the URL so deep links highlight correctly
  useEffect(() => {
    const p = loc.pathname.replace(/^\/preview\/?/, '').split('/')[0] || 'dashboard';
    if (p !== view) {
      const valid = VIEWS.find(v => v.id === p);
      if (valid) setView(valid.id);
    }
  }, [loc.pathname, view, setView]);

  // Cmd/Ctrl+K opens the palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen]);

  const warnings = status?.warning_count ?? index?.warnings?.length ?? 0;
  const items = status?.item_count ?? index?.items?.length ?? 0;
  const docs = status?.doc_count ?? index?.docs?.length ?? 0;
  const plans = status?.plan_count ?? index?.business_plans?.length ?? 0;

  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-border h-12 flex items-center px-4 gap-3">
      <Link to="/dashboard" className="flex items-center gap-2 group">
        <span className="inline-block w-2 h-2 rounded-full bg-accent group-hover:scale-110 transition-transform" />
        <span className="font-semibold text-sm tracking-tight">Spaces</span>
        <span className="text-ink-muted text-xs">·</span>
        <span className="text-ink-muted text-xs font-mono">
          {indexError ? <span className="text-danger">no index</span> :
           indexLoading ? <Spinner size={12} /> :
           `${items} items`}
        </span>
      </Link>

      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
        <input
          type="text"
          placeholder="Search…  ⌘K"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && search.trim()) {
              useUIStore.getState().pushRecentSearch(search);
              useUIStore.getState().setPaletteOpen(true);
            }
          }}
          className="w-full pl-8 pr-3 h-8 text-sm rounded-md bg-surface-2 border border-border focus:border-accent focus:bg-surface outline-none"
        />
      </div>

      <nav className="flex items-center gap-0.5 p-0.5 rounded-md bg-surface-2 border border-border">
        {VIEWS.map(v => {
          const Icon = v.icon;
          const isActive = view === v.id;
          const count =
            v.id === 'items' ? items :
            v.id === 'docs' ? docs :
            v.id === 'plans' ? plans :
            v.id === 'warnings' ? warnings : null;
          return (
            <Link
              key={v.id}
              to={v.path}
              onClick={() => setView(v.id)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 h-7 rounded text-xs transition-colors',
                isActive
                  ? 'bg-surface text-ink shadow-soft-sm font-medium'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{v.label}</span>
              {count != null && (
                <span className={clsx(
                  'ml-0.5 text-[10px] font-mono px-1 rounded',
                  v.id === 'warnings' && count > 0 ? 'bg-warn-bg text-warn' :
                  'text-ink-muted',
                )}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-1">
        <StatusDot />
        <span className="text-[10px] text-ink-muted font-mono">
          {status?.index_age_seconds != null
            ? `updated ${relTime(new Date(Date.now() - status.index_age_seconds * 1000).toISOString())}`
            : ''}
        </span>
        <button
          onClick={() => {
            nav(0); // not actually used
            refresh.mutate();
          }}
          className="p-1.5 rounded hover:bg-surface-2 text-ink-muted hover:text-ink"
          title="Refresh data"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', refresh.isPending && 'spin')} />
        </button>
        <button
          onClick={() => setPaletteOpen(true)}
          className="p-1.5 rounded hover:bg-surface-2 text-ink-muted hover:text-ink"
          title="Command palette (⌘K)"
        >
          <Command className="w-3.5 h-3.5" />
        </button>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </header>
  );
}

function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: 'auto' | 'light' | 'dark';
  setTheme: (v: 'auto' | 'light' | 'dark') => void;
}) {
  const next = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto';
  const Icon = theme === 'auto' ? Laptop : theme === 'light' ? Sun : Moon;
  return (
    <button
      onClick={() => setTheme(next)}
      className="p-1.5 rounded hover:bg-surface-2 text-ink-muted hover:text-ink"
      title={`Theme: ${theme} (click to switch)`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
