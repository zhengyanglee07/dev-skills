import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths,
} from 'date-fns';
import clsx from 'clsx';
import { useIndex } from '@/api/queries';
import { useUIStore } from '@/state/store';
import { Filters } from '@/components/Filters';
import { Spinner } from '@/components/Spinner';
import { searchItems } from '@/lib/search';
import { isFinal, TYPE_COLORS } from '@/lib/status';
import type { IndexEntry } from '@/lib/types';

export function CalendarView() {
  const { data: index, isLoading } = useIndex();
  const search = useUIStore(s => s.search);
  const typeFilter = useUIStore(s => s.typeFilter);
  const statusFilter = useUIStore(s => s.statusFilter);
  const priorityFilter = useUIStore(s => s.priorityFilter);
  const tagFilter = useUIStore(s => s.tagFilter);
  const showOpen = useUIStore(s => s.showOpen);
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const nav = useNavigate();

  const items = useMemo<IndexEntry[]>(() => {
    if (!index) return [];
    let xs = searchItems(index.items || [], search);
    if (typeFilter !== 'all') xs = xs.filter(i => i.type === typeFilter);
    if (statusFilter !== 'all') xs = xs.filter(i => i.status === statusFilter);
    if (priorityFilter !== 'all') xs = xs.filter(i => i.priority === priorityFilter);
    if (tagFilter !== 'all') xs = xs.filter(i => (i.tags || []).includes(tagFilter));
    if (showOpen === 'open') xs = xs.filter(i => !isFinal(i.status));
    if (showOpen === 'done') xs = xs.filter(i => isFinal(i.status));
    return xs;
  }, [index, search, typeFilter, statusFilter, priorityFilter, tagFilter, showOpen]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  }
  if (!index) {
    return <div className="p-6 text-danger">Failed to load index</div>;
  }

  // Build day list
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Index items by start date (YYYY-MM-DD) and end date
  const byStartDay = new Map<string, IndexEntry[]>();
  const byEndDay = new Map<string, IndexEntry[]>();
  for (const it of items) {
    if (it.started_at) {
      const k = it.started_at.slice(0, 10);
      if (!byStartDay.has(k)) byStartDay.set(k, []);
      byStartDay.get(k)!.push(it);
    }
    if (it.completed_at) {
      const k = it.completed_at.slice(0, 10);
      if (!byEndDay.has(k)) byEndDay.set(k, []);
      byEndDay.get(k)!.push(it);
    }
  }

  const today = new Date();
  const total = items.length;
  const withDates = items.filter(i => i.started_at || i.completed_at).length;

  return (
    <div className="h-full flex flex-col">
      <Filters />
      <div className="px-4 py-2 border-b border-border bg-surface flex items-center gap-3 text-xs">
        <button
          onClick={() => setMonth(startOfMonth(addMonths(month, -1)))}
          className="p-1 rounded hover:bg-surface-2 text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <h2 className="text-sm font-medium min-w-[140px] text-center">{format(month, 'MMMM yyyy')}</h2>
        <button
          onClick={() => setMonth(startOfMonth(addMonths(month, 1)))}
          className="p-1 rounded hover:bg-surface-2 text-ink-muted hover:text-ink"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setMonth(startOfMonth(today))}
          className="px-2 py-0.5 rounded text-[10px] bg-surface-2 border border-border hover:bg-surface-3"
        >
          today
        </button>
        <span className="ml-auto text-ink-muted">
          <span className="font-mono">{withDates}</span> of <span className="font-mono">{total}</span> have dates
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 border-b border-border bg-surface-2 sticky top-0 z-10">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="px-2 py-1 text-[10px] uppercase tracking-wider text-ink-muted font-medium border-r border-border last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const k = format(d, 'yyyy-MM-dd');
            const starts = byStartDay.get(k) || [];
            const ends = byEndDay.get(k) || [];
            const all = [...starts, ...ends.filter(e => !starts.includes(e))];
            const inMonth = isSameMonth(d, month);
            const isToday = isSameDay(d, today);
            return (
              <div
                key={i}
                className={clsx(
                  'border-r border-b border-border min-h-[100px] p-1.5 space-y-1',
                  !inMonth && 'bg-surface-2/40 text-ink-muted',
                  isToday && 'bg-accent-soft/30',
                )}
              >
                <div className={clsx(
                  'text-[10px] font-mono',
                  isToday ? 'text-accent font-bold' : 'text-ink-muted',
                )}>
                  {format(d, 'd')}
                </div>
                {all.slice(0, 5).map((it, j) => {
                  const isStart = starts.includes(it);
                  return (
                    <button
                      key={`${it.id}-${j}`}
                      onClick={() => nav(`/items/${it.id}`)}
                      className="w-full text-left text-[10px] truncate flex items-center gap-1 hover:bg-surface-2 px-1 py-0.5 rounded"
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[it.type] }} />
                      <span className="font-mono text-ink-muted shrink-0">{it.id}</span>
                      <span className="truncate">{it.title}</span>
                      {isStart ? null : <span className="text-ink-muted text-[8px]">✓</span>}
                    </button>
                  );
                })}
                {all.length > 5 && (
                  <div className="text-[9px] text-ink-muted px-1">+{all.length - 5} more</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
