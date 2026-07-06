import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, eachDayOfInterval, format, startOfMonth, startOfQuarter, startOfWeek, addDays, addWeeks, isSameDay, max, min, parseISO } from 'date-fns';
import clsx from 'clsx';
import { useIndex } from '@/api/queries';
import { useUIStore } from '@/state/store';
import { Filters } from '@/components/Filters';
import { TypeBadge } from '@/components/Badge';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityDot } from '@/components/PriorityBadge';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { searchItems } from '@/lib/search';
import { itemsHaveDate } from '@/lib/sort';
import { isFinal } from '@/lib/status';
import { TYPE_COLORS } from '@/lib/status';
import type { IndexEntry } from '@/lib/types';

export function GanttView() {
  const { data: index, isLoading } = useIndex();
  const search = useUIStore(s => s.search);
  const typeFilter = useUIStore(s => s.typeFilter);
  const statusFilter = useUIStore(s => s.statusFilter);
  const priorityFilter = useUIStore(s => s.priorityFilter);
  const tagFilter = useUIStore(s => s.tagFilter);
  const showOpen = useUIStore(s => s.showOpen);
  const ganttZoom = useUIStore(s => s.ganttZoom);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const { withDates, withoutDates } = useMemo(() => {
    const wd: IndexEntry[] = [], wod: IndexEntry[] = [];
    for (const it of items) (itemsHaveDate(it) ? wd : wod).push(it);
    return { withDates: wd, withoutDates: wod };
  }, [items]);

  const range = useMemo(() => {
    if (withDates.length === 0) {
      const now = new Date();
      return { start: startOfMonth(addDays(now, -7)), end: addDays(now, 30) };
    }
    let lo = parseISO(withDates[0].started_at!);
    let hi = parseISO(withDates[0].completed_at || withDates[0].started_at!);
    for (const it of withDates) {
      const s = it.started_at ? parseISO(it.started_at) : null;
      const e = it.completed_at ? parseISO(it.completed_at) : s;
      if (s) lo = min([lo, s]);
      if (e) hi = max([hi, e]);
    }
    lo = startOfMonth(addDays(lo, -7));
    hi = addDays(hi, 14);
    return { start: lo, end: hi };
  }, [withDates]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  }
  if (!index) {
    return <div className="p-6 text-danger">Failed to load index</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <Filters />
      <div className="px-4 py-2 border-b border-border bg-surface flex items-center gap-3 text-xs">
        <span className="text-ink-muted">
          <span className="font-mono">{withDates.length}</span> with dates,{' '}
          <span className="font-mono">{withoutDates.length}</span> without
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        {withDates.length === 0 && withoutDates.length === 0 ? (
          <EmptyState icon="📅" title="No items" description="Try clearing filters or adding date fields to items." />
        ) : (
          <GanttChart
            items={withDates}
            range={range}
            zoom={ganttZoom}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpen={id => nav(`/items/${id}`)}
          />
        )}
        {withoutDates.length > 0 && (
          <div className="border-t border-border bg-surface-2 px-4 py-2 text-xs">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">No dates ({withoutDates.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {withoutDates.slice(0, 50).map(it => (
                <button
                  key={it.id}
                  onClick={() => nav(`/items/${it.id}`)}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface text-ink-muted hover:text-ink border border-border"
                >
                  {it.id}
                </button>
              ))}
              {withoutDates.length > 50 && (
                <span className="text-[10px] text-ink-muted">+{withoutDates.length - 50} more</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GanttChart({
  items, range, zoom, selectedId, onSelect, onOpen,
}: {
  items: IndexEntry[];
  range: { start: Date; end: Date };
  zoom: 'week' | 'month' | 'quarter';
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const days = differenceInDays(range.end, range.start);
  const pxPerDay = zoom === 'week' ? 28 : zoom === 'month' ? 10 : 4;
  const totalWidth = days * pxPerDay;
  const rowH = 28;

  // Build header bands
  const headerBands: { label: string; span: { from: number; to: number }; sub?: { label: string; span: { from: number; to: number } }[] }[] = useMemo(() => {
    const out: typeof headerBands = [];
    if (zoom === 'week') {
      let cursor = startOfWeek(range.start, { weekStartsOn: 1 });
      while (cursor < range.end) {
        const next = addWeeks(cursor, 1);
        const from = Math.max(0, differenceInDays(cursor, range.start));
        const to = Math.min(days, differenceInDays(next, range.start));
        const sub: { label: string; span: { from: number; to: number } }[] = [];
        let dC = cursor;
        while (dC < next && dC < range.end) {
          const dN = addDays(dC, 1);
          sub.push({
            label: format(dC, 'd'),
            span: {
              from: Math.max(0, differenceInDays(dC, range.start)),
              to: Math.min(days, differenceInDays(dN, range.start)),
            },
          });
          dC = dN;
        }
        out.push({ label: format(cursor, 'MMM d'), span: { from, to }, sub });
        cursor = next;
      }
    } else if (zoom === 'month') {
      let cursor = startOfMonth(range.start);
      while (cursor < range.end) {
        const next = startOfMonth(addDays(cursor, 32));
        const from = Math.max(0, differenceInDays(cursor, range.start));
        const to = Math.min(days, differenceInDays(next, range.start));
        out.push({ label: format(cursor, 'MMM yyyy'), span: { from, to } });
        cursor = next;
      }
    } else {
      let cursor = startOfQuarter(range.start);
      while (cursor < range.end) {
        const next = startOfQuarter(addDays(cursor, 95));
        const from = Math.max(0, differenceInDays(cursor, range.start));
        const to = Math.min(days, differenceInDays(next, range.start));
        out.push({ label: `Q${Math.floor(cursor.getMonth() / 3) + 1} ${format(cursor, 'yyyy')}`, span: { from, to } });
        cursor = next;
      }
    }
    return out;
  }, [range, zoom, days]);

  // Today marker
  const todayX = differenceInDays(today, range.start) * pxPerDay;
  const showToday = todayX >= 0 && todayX <= totalWidth;

  return (
    <div className="relative">
      <div className="flex sticky top-0 z-10 bg-surface-2 border-b border-border">
        <div className="w-72 shrink-0 border-r border-border px-2 py-1 text-[10px] uppercase tracking-wider text-ink-muted font-medium">
          Item
        </div>
        <div ref={containerRef} className="flex-1 overflow-hidden relative" style={{ width: totalWidth }}>
          {/* Primary band */}
          <div className="flex h-6 border-b border-border">
            {headerBands.map((b) => (
              <div
                key={b.label}
                className="border-r border-border text-[10px] uppercase tracking-wider text-ink-muted font-medium flex items-center px-1.5"
                style={{ marginLeft: b.span.from * pxPerDay, width: (b.span.to - b.span.from) * pxPerDay }}
              >
                {b.label}
              </div>
            ))}
          </div>
          {/* Sub band (week zoom) */}
          {zoom === 'week' && (
            <div className="flex h-5 border-b border-border bg-surface">
              {headerBands.flatMap((b) => b.sub || []).map((s, j) => {
                const d = addDays(range.start, s.span.from);
                const isToday = isSameDay(d, today);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={j}
                    className={clsx(
                      'border-r border-border text-[9px] flex items-center justify-center',
                      isWeekend && 'bg-surface-3/40',
                      isToday && 'bg-accent-soft font-bold text-accent',
                    )}
                    style={{ marginLeft: (s.span.from - (j > 0 ? headerBands.flatMap(b => b.sub || [])[j - 1].span.to : 0)) * pxPerDay, width: (s.span.to - s.span.from) * pxPerDay }}
                  >
                    {s.label}
                  </div>
                );
              })}
            </div>
          )}
          {zoom === 'month' && (
            <div className="flex h-5 border-b border-border bg-surface">
              {eachDayOfInterval({ start: range.start, end: addDays(range.end, -1) }).filter(d => d.getDay() === 0 || d.getDay() === 6).map((d, i) => {
                const from = differenceInDays(d, range.start);
                return (
                  <div key={`${d.toISOString()}-${i}`} className="border-r border-border bg-surface-3/40" style={{ marginLeft: i === 0 ? from * pxPerDay : 7 * pxPerDay, width: pxPerDay }} />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="relative">
        {showToday && (
          <div
            className="absolute top-0 bottom-0 w-px bg-accent z-20 pointer-events-none"
            style={{ left: 288 + todayX }}
          >
            <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-accent" />
          </div>
        )}
        {items.map((it) => {
          const s = it.started_at ? parseISO(it.started_at) : null;
          const e = it.completed_at ? parseISO(it.completed_at) : s;
          if (!s || !e) return null;
          const from = Math.max(0, differenceInDays(s, range.start)) * pxPerDay;
          const to = Math.min(days, differenceInDays(addDays(e, 1), range.start)) * pxPerDay;
          const w = Math.max(2, to - from);
          const isFinal_ = isFinal(it.status);
          const isActive = selectedId === it.id;
          return (
            <div
              key={it.id}
              className={clsx('flex border-b border-border items-center', isActive && 'bg-accent-soft/30')}
              style={{ height: rowH }}
              onClick={() => onSelect(it.id)}
              onDoubleClick={() => onOpen(it.id)}
            >
              <div className="w-72 shrink-0 border-r border-border px-2 flex items-center gap-1.5 min-w-0 cursor-pointer" style={{ height: rowH }} onClick={() => onSelect(it.id)}>
                <TypeBadge type={it.type} />
                <code className="text-[10px] font-mono text-ink-muted shrink-0">{it.id}</code>
                <span className="truncate text-xs flex-1">{it.title}</span>
                {it.priority && <PriorityDot priority={it.priority} />}
                <StatusBadge status={it.status} />
              </div>
              <div className="relative flex-1" style={{ height: rowH, width: totalWidth }}>
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-4 rounded-sm shadow-soft-sm cursor-pointer hover:h-5 transition-all"
                  style={{
                    left: from,
                    width: w,
                    backgroundColor: TYPE_COLORS[it.type],
                    opacity: isFinal_ ? 0.5 : 1,
                  }}
                  title={`${it.id} ${it.title}\n${it.started_at} → ${it.completed_at || 'ongoing'}`}
                  onClick={(e) => { e.stopPropagation(); onSelect(it.id); }}
                  onDoubleClick={(e) => { e.stopPropagation(); onOpen(it.id); }}
                />
                {/* Milestone marker if same-day */}
                {isSameDay(s, e) && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 rotate-45 w-2.5 h-2.5 bg-accent"
                    style={{ left: from - 5 }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
