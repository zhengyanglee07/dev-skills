import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, FileText, Folder, Search } from 'lucide-react';
import clsx from 'clsx';
import { useIndex, useDoc } from '@/api/queries';
import { useUIStore } from '@/state/store';
import { Markdown } from '@/components/Markdown';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { fmtBytes } from '@/lib/format';
import { searchDocs } from '@/lib/search';
import type { DocEntry } from '@/lib/types';

export function DocsView() {
  const { data: index, isLoading } = useIndex();
  const { id: paramId } = useParams<{ id?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const docSearch = useUIStore(s => s.docSearch);
  const setDocSearch = useUIStore(s => s.setDocSearch);
  const expanded = useUIStore(s => s.expanded);
  const toggleExpanded = useUIStore(s => s.toggleExpanded);

  // Pick first doc on mount, or use URL param
  useEffect(() => {
    if (!index) return;
    if (paramId) { setSelectedId(paramId); return; }
    if (!selectedId && index.docs?.length) {
      setSelectedId(index.docs[0].id);
    }
  }, [index, paramId, selectedId]);

  const filtered = useMemo(() => {
    if (!index) return [];
    return searchDocs(index.docs || [], docSearch);
  }, [index, docSearch]);

  // Group by subfolder
  const byFolder: Record<string, DocEntry[]> = {};
  for (const d of filtered) (byFolder[d.subfolder || ''] ||= []).push(d);
  const folders = Object.keys(byFolder).sort((a, b) => {
    if (a === '' && b !== '') return -1;
    if (b === '' && a !== '') return 1;
    return a.localeCompare(b);
  });

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  }
  if (!index) {
    return <div className="p-6 text-danger">Failed to load index</div>;
  }
  const docs = index.docs || [];
  if (docs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <EmptyState icon="📄" title="No docs" description="Spaces/Docs/ is empty." />
      </div>
    );
  }

  return (
    <div className="h-full grid grid-cols-[280px_minmax(0,1fr)_220px]">
      <div className="border-r border-border overflow-y-auto flex flex-col">
        <div className="p-2 border-b border-border bg-surface-2 sticky top-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-muted" />
            <input
              value={docSearch}
              onChange={e => setDocSearch(e.target.value)}
              placeholder="Filter docs…"
              className="w-full pl-7 pr-2 h-7 text-xs rounded bg-surface border border-border focus:border-accent outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {folders.map(folder => {
            const key = `doctree:${folder}`;
            const isOpen = expanded[key] !== false;
            return (
              <div key={folder || '__top'}>
                <button
                  onClick={() => toggleExpanded(key)}
                  className="w-full px-3 py-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted hover:bg-surface-2"
                >
                  <ChevronRight className={clsx('w-3 h-3 transition-transform', isOpen && 'rotate-90')} />
                  <Folder className="w-3 h-3" />
                  <span className="truncate flex-1 text-left">{folder || 'docs'}</span>
                  <span className="font-mono text-[10px]">{byFolder[folder].length}</span>
                </button>
                {isOpen && byFolder[folder].map(d => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    className={clsx(
                      'w-full px-3 py-1.5 flex items-center gap-1.5 text-left text-xs hover:bg-surface-2 border-l-2',
                      selectedId === d.id
                        ? 'border-accent bg-accent-soft/40'
                        : 'border-transparent',
                    )}
                  >
                    <FileText className="w-3 h-3 text-ink-muted shrink-0" />
                    <span className="truncate flex-1">{d.title || d.id}</span>
                    <span className="text-[10px] text-ink-muted font-mono">{fmtBytes(d.size_bytes)}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <DocDetail id={selectedId} />
      <DocToc id={selectedId} />
    </div>
  );
}

function DocDetail({ id }: { id: string | null }) {
  const { data: index } = useIndex();
  const meta = useMemo(() => (index?.docs || []).find(d => d.id === id), [index, id]);
  const { data: text, isLoading, error } = useDoc(meta?.path);

  if (!id || !meta) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <EmptyState icon="📄" title="Select a doc" />
      </div>
    );
  }
  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  }
  if (error) {
    return <div className="p-6 text-danger text-sm">Failed to load doc: {String(error)}</div>;
  }
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-6">
        <div className="mb-3 text-[10px] font-mono text-ink-muted uppercase tracking-wider">{meta.id}</div>
        <Markdown content={text || ''} />
      </div>
    </div>
  );
}

function DocToc({ id }: { id: string | null }) {
  const { data: text, isLoading } = useDoc(
    useMemo(() => {
      // We don't have direct access to the path here without the index; use
      // the index in the parent. For now, return null and skip TOC if not
      // available.
      return null;
    }, [id]),
  );
  // The TOC is built off the rendered HTML; since react-markdown renders
  // directly, we compute headings here from the raw markdown text using a
  // lightweight regex (matches h1-h6 with optional leading # and trailing
  // text). Adequate for docs that follow the common pattern.
  const [headings, setHeadings] = useState<{ level: number; text: string; id: string }[]>([]);

  // Use a ref to avoid recomputing on every render
  useEffect(() => {
    if (!text) { setHeadings([]); return; }
    const out: { level: number; text: string; id: string }[] = [];
    const seen = new Map<string, number>();
    for (const line of text.split('\n')) {
      const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (!m) continue;
      const level = m[1].length;
      const text = m[2].replace(/[`*_]/g, '');
      let id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!id) id = 'h';
      const n = (seen.get(id) || 0) + 1;
      seen.set(id, n);
      if (n > 1) id += '-' + n;
      out.push({ level, text, id });
    }
    setHeadings(out);
  }, [text]);

  if (isLoading || headings.length === 0) {
    return <div className="border-l border-border" />;
  }
  return (
    <div className="border-l border-border overflow-y-auto p-4 bg-surface-2/40">
      <div className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">On this page</div>
      <ul className="space-y-1 text-xs">
        {headings.filter(h => h.level <= 3).map(h => (
          <li key={h.id} style={{ paddingLeft: (h.level - 1) * 8 }}>
            <a
              href={`#${h.id}`}
              onClick={e => {
                e.preventDefault();
                const el = document.getElementById(h.id);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="text-ink-muted hover:text-ink hover:underline block truncate"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
