import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, ExternalLink, Hash, Tag, GitBranch, Link2,
  HelpCircle, Target, CheckSquare, TestTube, Wrench, FileCode2, BookOpen,
  Check, X, AlertCircle, GitCommit, History, ListChecks, MessageSquare,
  ShieldCheck, Clock, Users, FileText, Briefcase, StickyNote,
} from 'lucide-react';
import clsx from 'clsx';
import { useIndex, useItem } from '@/api/queries';
import { useUIStore } from '@/state/store';
import { Filters } from '@/components/Filters';
import { TypeBadge } from '@/components/Badge';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge, PriorityDot } from '@/components/PriorityBadge';
import { IdLink } from '@/components/IdLink';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { Markdown } from '@/components/Markdown';
import { isFinal } from '@/lib/status';
import { searchItems } from '@/lib/search';
import { compareItems, itemsIsOpen } from '@/lib/sort';
import { fmtDate, fmtTimestamp, relTime, truncate } from '@/lib/format';
import type { WorkItem, IndexEntry } from '@/lib/types';

export function ItemsView() {
  const { data: index, isLoading } = useIndex();
  const { id: paramId } = useParams<{ id?: string }>();
  const itemsLayout = useUIStore(s => s.itemsLayout);
  const showOpen = useUIStore(s => s.showOpen);
  const typeFilter = useUIStore(s => s.typeFilter);
  const statusFilter = useUIStore(s => s.statusFilter);
  const priorityFilter = useUIStore(s => s.priorityFilter);
  const tagFilter = useUIStore(s => s.tagFilter);
  const search = useUIStore(s => s.search);
  const setSearch = useUIStore(s => s.setSearch);
  const itemsSort = useUIStore(s => s.itemsSort);
  const setItemsSort = useUIStore(s => s.setItemsSort);
  const expanded = useUIStore(s => s.expanded);
  const toggleExpanded = useUIStore(s => s.toggleExpanded);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const nav = useNavigate();

  // Pick first item on mount, or use URL param
  useEffect(() => {
    if (!index) return;
    if (paramId) { setSelectedId(paramId); return; }
    if (!selectedId && index.items?.length) setSelectedId(index.items[0].id);
  }, [index, paramId, selectedId]);

  const filtered = useMemo<IndexEntry[]>(() => {
    if (!index) return [];
    let xs = searchItems(index.items || [], search);
    if (typeFilter !== 'all') xs = xs.filter(i => i.type === typeFilter);
    if (statusFilter !== 'all') xs = xs.filter(i => i.status === statusFilter);
    if (priorityFilter !== 'all') xs = xs.filter(i => i.priority === priorityFilter);
    if (tagFilter !== 'all') xs = xs.filter(i => (i.tags || []).includes(tagFilter));
    if (showOpen === 'open') xs = xs.filter(itemsIsOpen);
    if (showOpen === 'done') xs = xs.filter(i => isFinal(i.status));
    xs = [...xs].sort((a, b) => compareItems(a, b, itemsSort.col, itemsSort.dir));
    return xs;
  }, [index, search, typeFilter, statusFilter, priorityFilter, tagFilter, showOpen, itemsSort]);

  const byType = useMemo(() => {
    const out: Record<string, IndexEntry[]> = {};
    for (const it of filtered) (out[it.type] ||= []).push(it);
    return out;
  }, [filtered]);

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
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter items by id, title, tag, status…"
          className="flex-1 max-w-md h-7 px-2.5 rounded bg-surface-2 border border-border focus:border-accent outline-none text-xs"
        />
        <span className="text-ink-muted">
          <span className="font-mono">{filtered.length}</span> of{' '}
          <span className="font-mono">{index.items?.length || 0}</span>
        </span>
      </div>
      <div className="flex-1 grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] min-h-0">
        <div className="border-r border-border overflow-y-auto">
          {filtered.length === 0 && (
            <EmptyState icon="🔍" title="No items match" description="Try clearing some filters." />
          )}
          {itemsLayout === 'table' ? (
            <ItemsTable items={filtered} selectedId={selectedId} onSelect={setSelectedId} sort={itemsSort} setSort={setItemsSort} />
          ) : (
            <ItemsGrouped byType={byType} selectedId={selectedId} onSelect={setSelectedId} expanded={expanded} toggleExpanded={toggleExpanded} />
          )}
        </div>
        <div className="overflow-hidden flex flex-col">
          {selectedId ? (
            <ItemDetail id={selectedId} onOpen={id => nav(`/items/${id}`)} />
          ) : (
            <EmptyState icon="📋" title="Select an item" description="Pick something from the list." />
          )}
        </div>
      </div>
    </div>
  );
}

function ItemsTable({
  items, selectedId, onSelect, sort, setSort,
}: {
  items: IndexEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sort: { col: string; dir: 'asc' | 'desc' };
  setSort: (col: any, dir?: 'asc' | 'desc') => void;
}) {
  const cols: { key: string; label: string; className?: string }[] = [
    { key: 'id', label: 'ID', className: 'w-28' },
    { key: 'type', label: 'Type', className: 'w-16' },
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status', className: 'w-32' },
    { key: 'priority', label: 'Pri', className: 'w-16' },
    { key: 'updated', label: 'Updated', className: 'w-24' },
  ];
  return (
    <table className="w-full text-xs">
      <thead className="bg-surface-2 text-[10px] uppercase tracking-wider text-ink-muted sticky top-0">
        <tr>
          {cols.map(c => (
            <th
              key={c.key}
              onClick={() => setSort(c.key as any)}
              className={clsx('text-left px-2 py-1.5 font-medium cursor-pointer hover:text-ink', c.className)}
            >
              {c.label}
              {sort.col === c.key && (
                <span className="ml-0.5 text-accent">{sort.dir === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map(it => (
          <tr
            key={it.id}
            onClick={() => onSelect(it.id)}
            className={clsx(
              'border-b border-border cursor-pointer hover:bg-surface-2',
              selectedId === it.id && 'bg-accent-soft/30',
            )}
          >
            <td className="px-2 py-1.5 font-mono text-accent">{it.id}</td>
            <td className="px-2 py-1.5"><TypeBadge type={it.type} /></td>
            <td className="px-2 py-1.5 truncate max-w-0">{it.title}</td>
            <td className="px-2 py-1.5"><StatusBadge status={it.status} /></td>
            <td className="px-2 py-1.5">{it.priority && <PriorityDot priority={it.priority} />}{it.priority}</td>
            <td className="px-2 py-1.5 text-ink-muted font-mono text-[10px]">
              {fmtDate(it.completed_at || it.cancelled_at || it.converted_at || it.started_at || it.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ItemsGrouped({
  byType, selectedId, onSelect, expanded, toggleExpanded,
}: {
  byType: Record<string, IndexEntry[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  expanded: Record<string, boolean>;
  toggleExpanded: (k: string) => void;
}) {
  const order = Object.keys(byType).sort();
  return (
    <div>
      {order.map(t => {
        const key = `itemtype:${t}`;
        const isOpen = expanded[key] !== false;
        return (
          <div key={t}>
            <button
              onClick={() => toggleExpanded(key)}
              className="w-full px-3 py-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted bg-surface-2 border-b border-border hover:bg-surface-3"
            >
              {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span className="flex-1 text-left font-medium">{t}</span>
              <span className="font-mono">{byType[t].length}</span>
            </button>
            {isOpen && byType[t].map(it => (
              <button
                key={it.id}
                onClick={() => onSelect(it.id)}
                className={clsx(
                  'w-full pl-7 pr-3 py-1.5 flex items-center gap-2 text-left text-xs border-b border-border hover:bg-surface-2',
                  selectedId === it.id && 'bg-accent-soft/40',
                )}
              >
                <TypeBadge type={it.type} />
                <code className="text-[10px] font-mono text-ink-muted">{it.id}</code>
                <span className="flex-1 truncate">{it.title}</span>
                {it.priority && <PriorityDot priority={it.priority} />}
                <StatusBadge status={it.status} />
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ItemDetail({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  const { data: index } = useIndex();
  const meta = useMemo(() => (index?.items || []).find(i => i.id === id), [index, id]);
  const { data: item, isLoading, error } = useItem(meta?.path);

  if (!id || !meta) {
    return <EmptyState icon="📋" title="Select an item" />;
  }
  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  }
  if (error) {
    return <div className="p-6 text-danger text-sm">Failed to load item: {String(error)}</div>;
  }
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-5 space-y-4">
        <DetailHeader meta={meta} onOpen={onOpen} item={item} />
        {item?.description && <DescriptionCard text={item.description} />}
        {item?.tags && item.tags.length > 0 && <TagsCard tags={item.tags} />}
        <RelationshipsCard item={item!} meta={meta} onOpen={onOpen} />
        {item?.children_meta?.length ? <ChildrenCard children={item.children_meta} /> : null}
        {/* Backlog-specific */}
        {item?.what_is_unclear && <Card icon={HelpCircle} title="What is unclear">{item.what_is_unclear}</Card>}
        {item?.clarification_questions && item.clarification_questions.length > 0 && (
          <ClarificationCard qs={item.clarification_questions} />
        )}
        {item?.intended_type && <Card icon={Target} title="Intended type">{item.intended_type}</Card>}

        {/* Code-producing */}
        {item?.verification_criteria && item.verification_criteria.length > 0 && (
          <VerificationCard criteria={item.verification_criteria} />
        )}
        {item?.expected_outcomes && item.expected_outcomes.length > 0 && (
          <OutcomesCard outcomes={item.expected_outcomes} />
        )}
        {item?.automated_tests && item.automated_tests.length > 0 && (
          <TestsCard tests={item.automated_tests} />
        )}
        {item?.fix_attempts && item.fix_attempts.length > 0 && (
          <FixAttemptsCard attempts={item.fix_attempts} />
        )}
        {item?.affected_files && item.affected_files.length > 0 && (
          <AffectedFilesCard files={item.affected_files} />
        )}

        {/* Lifecycle */}
        {item?.solution_summary && <Card icon={BookOpen} title="Solution summary">{item.solution_summary}</Card>}
        {item?.commits && item.commits.length > 0 && <CommitsCard commits={item.commits} />}
        {item?.status_history && item.status_history.length > 0 && (
          <StatusHistoryCard history={item.status_history} />
        )}
        {item?.decisions && item.decisions.length > 0 && <DecisionsCard decisions={item.decisions} />}
        {item?.notes && item.notes.length > 0 && <NotesCard notes={item.notes} />}

        {/* Plan */}
        {item?.plan_body && <Card icon={FileText} title="Plan body"><Markdown content={item.plan_body} /></Card>}
        {(item?.approved_by || item?.approved_at) && <ApprovalCard item={item} />}

        <ItemPathCard meta={meta} />
      </div>
    </div>
  );
}

function DetailHeader({ meta, item: _item }: { meta: IndexEntry; onOpen?: (id: string) => void; item: WorkItem | undefined }) {
  return (
    <div className="space-y-2 pb-3 border-b border-border">
      <div className="flex items-center gap-2 flex-wrap">
        <TypeBadge type={meta.type} />
        <code className="text-[11px] font-mono text-ink-muted">{meta.id}</code>
        <Link to={`/items/${meta.id}`} className="text-ink-muted hover:text-ink"><ExternalLink className="w-3 h-3" /></Link>
      </div>
      <h1 className="text-xl font-semibold leading-tight">{meta.title}</h1>
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <StatusBadge status={meta.status} />
        {meta.priority && <PriorityBadge priority={meta.priority} />}
        {meta.tags?.map(t => (
          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-ink-muted font-mono">{t}</span>
        ))}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-ink-muted font-mono">
        {meta.created_at && <span>created {fmtDate(meta.created_at)}</span>}
        {meta.started_at && <span>started {fmtDate(meta.started_at)}</span>}
        {meta.completed_at && <span className="text-emerald-600 dark:text-emerald-400">completed {fmtDate(meta.completed_at)}</span>}
        {meta.cancelled_at && <span className="text-stone-500">cancelled {fmtDate(meta.cancelled_at)}</span>}
        {meta.converted_at && <span>converted {fmtDate(meta.converted_at)}</span>}
      </div>
    </div>
  );
}

function DescriptionCard({ text }: { text: string }) {
  return (
    <Card icon={FileText} title="Description">
      <Markdown content={text} />
    </Card>
  );
}

function TagsCard({ tags }: { tags: string[] }) {
  return (
    <Card icon={Tag} title="Tags">
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => (
          <span key={t} className="text-[11px] px-2 py-0.5 rounded bg-surface-2 text-ink-soft font-mono">{t}</span>
        ))}
      </div>
    </Card>
  );
}

function RelationshipsCard({ item, meta }: { item: WorkItem; meta: IndexEntry; onOpen: (id: string) => void; index?: any }) {
  const rels: { label: string; ids: string[]; icon: any }[] = [];
  if (meta.parent_id) rels.push({ label: 'Parent', ids: [meta.parent_id], icon: GitBranch });
  if (meta.plan_id) rels.push({ label: 'Plan', ids: [meta.plan_id], icon: Briefcase });
  if (item.blocks?.length) rels.push({ label: 'Blocks', ids: item.blocks, icon: ArrowRightR });
  if (item.blocked_by?.length) rels.push({ label: 'Blocked by', ids: item.blocked_by, icon: ArrowLeftR });
  if (item.related_to?.length) rels.push({ label: 'Related to', ids: item.related_to, icon: Link2 });
  if (item.converted_to) rels.push({ label: 'Converted to', ids: [item.converted_to], icon: ArrowRightR });
  if (rels.length === 0) return null;
  return (
    <Card icon={Link2} title="Relationships">
      <div className="space-y-1.5">
        {rels.map(r => (
          <div key={r.label} className="flex items-start gap-2 text-xs">
            <span className="text-ink-muted text-[10px] uppercase tracking-wider font-medium w-24 shrink-0 pt-0.5">{r.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {r.ids.map(id => <IdLink key={id} id={id} />)}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ChildrenCard({ children }: { children: { id: string; title?: string; type?: string; status?: string }[] }) {
  return (
    <Card icon={ListChecks} title={`Child items (${children.length})`}>
      <ul className="space-y-1 text-xs">
        {children.map(c => (
          <li key={c.id} className="flex items-center gap-2">
            {c.type && <TypeBadge type={c.type as any} />}
            <IdLink id={c.id} />
            <span className="flex-1 truncate text-ink-muted">{c.title}</span>
            {c.status && <StatusBadge status={c.status} />}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ClarificationCard({ qs }: { qs: { id?: string; question: string; answer?: string | null; asked_at?: string; answered_at?: string }[] }) {
  return (
    <Card icon={HelpCircle} title="Clarification questions">
      <ul className="space-y-3">
        {qs.map((q, i) => (
          <li key={q.id || i} className="text-xs space-y-1">
            <div className="flex items-start gap-2">
              <Hash className="w-3 h-3 text-ink-muted mt-0.5" />
              <div className="flex-1">
                <div className="text-ink">{q.question}</div>
                {q.asked_at && <div className="text-[10px] text-ink-muted">asked {fmtTimestamp(q.asked_at)}</div>}
              </div>
            </div>
            {q.answer ? (
              <div className="ml-5 pl-3 border-l-2 border-emerald-300/40">
                <div className="text-ink">{q.answer}</div>
                {q.answered_at && <div className="text-[10px] text-emerald-600 dark:text-emerald-400">answered {fmtTimestamp(q.answered_at)}</div>}
              </div>
            ) : (
              <div className="ml-5 text-[10px] text-amber-600 dark:text-amber-400 italic">unanswered</div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function VerificationCard({ criteria }: { criteria: (string | any)[] }) {
  return (
    <Card icon={ShieldCheck} title={`Verification criteria (${criteria.length})`}>
      <ul className="space-y-1.5 text-xs">
        {criteria.map((c, i) => {
          const text = typeof c === 'string' ? c : (c.text || c.criterion || JSON.stringify(c));
          return (
            <li key={i} className="flex items-start gap-2">
              <span className="text-ink-muted font-mono text-[10px] mt-0.5 shrink-0 w-5 text-right">{i + 1}.</span>
              <span className="text-ink">{text}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function OutcomesCard({ outcomes }: { outcomes: any[] }) {
  return (
    <Card icon={Target} title={`Expected outcomes (${outcomes.length})`}>
      <ul className="space-y-2 text-xs">
        {outcomes.map((o, i) => {
          const met = o.met;
          return (
            <li key={i} className="flex items-start gap-2 p-2 rounded bg-surface-2/40">
              <span className={clsx(
                'mt-0.5 shrink-0',
                met === true ? 'text-emerald-500' : met === false ? 'text-red-500' : 'text-ink-muted',
              )}>
                {met === true ? <Check className="w-3.5 h-3.5" /> : met === false ? <X className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              </span>
              <div className="flex-1 min-w-0 space-y-0.5">
                {o.label && <div className="font-medium text-ink">{o.label}</div>}
                {o.expected && <div className="text-ink-muted text-[11px]">expected: {o.expected}</div>}
                {o.actual && <div className="text-ink-soft text-[11px]">actual: {o.actual}</div>}
                {o.notes && <div className="text-ink-muted text-[11px] italic">{o.notes}</div>}
              </div>
              {o.verified_at && (
                <span className="text-[10px] text-ink-muted font-mono shrink-0">{relTime(o.verified_at)}</span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function TestsCard({ tests }: { tests: any[] }) {
  return (
    <Card icon={TestTube} title={`Automated tests (${tests.length})`}>
      <ul className="space-y-1.5 text-xs">
        {tests.map((t, i) => (
          <li key={i} className="flex items-start gap-2 p-1.5 rounded hover:bg-surface-2">
            <TestStatusDot status={t.status} />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[11px] text-ink">{t.id || t.test_name || t.test_file || `test ${i + 1}`}</div>
              {t.test_file && t.test_name && (
                <div className="text-[10px] text-ink-muted truncate font-mono">{t.test_file}</div>
              )}
              {t.last_result && <div className="text-[11px] text-ink-muted mt-0.5">{truncate(t.last_result, 200)}</div>}
            </div>
            {t.last_run_at && <span className="text-[10px] text-ink-muted font-mono shrink-0">{relTime(t.last_run_at)}</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TestStatusDot({ status }: { status?: string }) {
  const cls = status === 'passing' ? 'text-emerald-500'
    : status === 'failing' ? 'text-red-500'
    : status === 'skipped' ? 'text-amber-500'
    : 'text-ink-muted';
  const sym = status === 'passing' ? '●'
    : status === 'failing' ? '●'
    : status === 'skipped' ? '○'
    : '·';
  return <span className={cls + ' text-base leading-none mt-0.5'}>{sym}</span>;
}

function FixAttemptsCard({ attempts }: { attempts: any[] }) {
  return (
    <Card icon={Wrench} title={`Fix attempts (${attempts.length})`}>
      <ol className="space-y-2 text-xs">
        {attempts.map((a, i) => (
          <li key={i} className="flex items-start gap-2 p-2 rounded bg-surface-2/40">
            <span className="text-ink-muted font-mono text-[10px] mt-0.5 shrink-0 w-5 text-right">#{a.attempt ?? i + 1}</span>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <FixOutcomeBadge outcome={a.outcome} />
                {a.started_at && <span className="text-[10px] text-ink-muted font-mono">{fmtDate(a.started_at)}</span>}
              </div>
              {a.hypothesis && <div className="text-ink"><span className="text-ink-muted">hypothesis:</span> {a.hypothesis}</div>}
              {a.approach && <div className="text-ink-soft"><span className="text-ink-muted">approach:</span> {a.approach}</div>}
              {a.failure_reason && <div className="text-red-600 dark:text-red-400"><span className="text-ink-muted">why:</span> {a.failure_reason}</div>}
              {a.lesson && <div className="text-emerald-600 dark:text-emerald-400 italic"><span className="text-ink-muted">lesson:</span> {a.lesson}</div>}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function FixOutcomeBadge({ outcome }: { outcome?: string }) {
  if (!outcome) return null;
  const map: Record<string, string> = {
    fixed:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    partial: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    failed:  'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    open:    'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  };
  return <span className={clsx('text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded', map[outcome] || 'bg-stone-100 text-stone-700')}>{outcome}</span>;
}

function AffectedFilesCard({ files }: { files: string[] }) {
  return (
    <Card icon={FileCode2} title={`Affected files (${files.length})`}>
      <ul className="space-y-0.5 text-xs font-mono">
        {files.map((f, i) => (
          <li key={i} className="text-ink-soft hover:text-ink truncate flex items-center gap-1.5">
            <FileCode2 className="w-3 h-3 text-ink-muted shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CommitsCard({ commits }: { commits: any[] }) {
  return (
    <Card icon={GitCommit} title={`Commits (${commits.length})`}>
      <ul className="space-y-1 text-xs">
        {commits.map((c, i) => (
          <li key={i} className="flex items-start gap-2">
            {c.short_sha && (
              <code className="text-[10px] font-mono text-accent bg-accent-soft/40 px-1.5 py-0.5 rounded shrink-0">
                {c.short_sha}
              </code>
            )}
            <div className="flex-1 min-w-0">
              <div className="truncate">{c.message}</div>
              <div className="text-[10px] text-ink-muted font-mono">
                {c.branch && <span>{c.branch}</span>}
                {c.branch && c.committed_at && <span> · </span>}
                {c.committed_at && <span>{fmtTimestamp(c.committed_at)}</span>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function StatusHistoryCard({ history }: { history: any[] }) {
  return (
    <Card icon={History} title={`Status history (${history.length})`}>
      <ol className="relative space-y-2 ml-2 border-l border-border pl-4">
        {history.map((h, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[18px] top-1 w-2 h-2 rounded-full bg-surface-3 ring-2 ring-bg" />
            <div className="text-[10px] text-ink-muted font-mono">{fmtTimestamp(h.at)}</div>
            <div className="text-xs text-ink">
              {h.from ? <><StatusBadge status={h.from} /></> : <span className="text-ink-muted">—</span>}
              <span className="mx-1.5 text-ink-muted">→</span>
              <StatusBadge status={h.to} />
              {h.transition && <span className="ml-2 text-[10px] text-ink-muted font-mono">{h.transition}</span>}
            </div>
            {h.note && <div className="text-[11px] text-ink-muted mt-0.5 italic">{h.note}</div>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function DecisionsCard({ decisions }: { decisions: any[] }) {
  return (
    <Card icon={MessageSquare} title={`Decisions (${decisions.length})`}>
      <ul className="space-y-2 text-xs">
        {decisions.map((d, i) => (
          <li key={d.id || i} className="space-y-1 p-2 rounded bg-surface-2/40">
            <div className="flex items-center gap-2 flex-wrap">
              {d.id && <code className="text-[10px] font-mono text-ink-muted">{d.id}</code>}
              {d.topic && <span className="text-ink font-medium">{d.topic}</span>}
              {d.at && <span className="text-[10px] text-ink-muted font-mono ml-auto">{fmtDate(d.at)}</span>}
            </div>
            <div className="text-ink">{d.decision}</div>
            {d.rationale && <div className="text-ink-muted italic"><span className="text-ink-soft">why:</span> {d.rationale}</div>}
            {d.alternatives && d.alternatives.length > 0 && (
              <div className="text-[11px] text-ink-muted">
                <span className="text-ink-soft">alternatives considered:</span> {d.alternatives.join('; ')}
              </div>
            )}
            {(d.supersedes || d.superseded_by) && (
              <div className="text-[10px] text-ink-muted font-mono flex items-center gap-2 flex-wrap">
                {d.supersedes && <span>supersedes <IdLink id={d.supersedes} /></span>}
                {d.superseded_by && <span>superseded by <IdLink id={d.superseded_by} /></span>}
              </div>
            )}
            {d.made_by && <div className="text-[10px] text-ink-muted">by {d.made_by}</div>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NotesCard({ notes }: { notes: any[] }) {
  return (
    <Card icon={StickyNote} title={`Notes (${notes.length})`}>
      <ul className="space-y-2 text-xs">
        {notes.map((n, i) => (
          <li key={i} className="space-y-1 p-2 rounded bg-surface-2/40">
            <div className="flex items-center gap-2 text-[10px] text-ink-muted font-mono">
              {n.kind && <span className="uppercase tracking-wider font-medium text-accent">{n.kind}</span>}
              {n.at && <span>{fmtTimestamp(n.at)}</span>}
            </div>
            <div className="text-ink whitespace-pre-wrap">{n.body}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ApprovalCard({ item }: { item: WorkItem }) {
  return (
    <Card icon={CheckSquare} title="Approval">
      <div className="text-xs space-y-1">
        {item.approved_by && (
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-ink-muted" />
            <span className="text-ink-muted">approved by</span>
            <span className="font-medium">{item.approved_by}</span>
          </div>
        )}
        {item.approved_at && (
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-ink-muted" />
            <span className="text-ink-muted">at</span>
            <span className="font-mono">{fmtTimestamp(item.approved_at)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function ItemPathCard({ meta }: { meta: IndexEntry }) {
  return (
    <div className="text-[10px] text-ink-muted font-mono pt-2 border-t border-border">
      <span className="opacity-60">file:</span> {meta.path}
    </div>
  );
}

function Card({
  icon: Icon, title, children, action,
}: {
  icon?: any; title: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface shadow-soft-sm p-4">
      <header className="flex items-center gap-2 mb-2.5 -mt-0.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-ink-muted" />}
        <h2 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </header>
      <div className="text-sm">{children}</div>
    </section>
  );
}

function ArrowRightR() { return <span className="text-ink-muted text-xs">→</span>; }
function ArrowLeftR() { return <span className="text-ink-muted text-xs">←</span>; }
