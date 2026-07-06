import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Hash, FileText, Briefcase, X } from 'lucide-react';
import clsx from 'clsx';
import { useIndex } from '@/api/queries';
import { useUIStore } from '@/state/store';
import { globalSearch, type SearchResult } from '@/lib/search';

export function CommandPalette() {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const { data: index } = useIndex();
  const setPaletteOpen = useUIStore(s => s.setPaletteOpen);
  const pushRecent = useUIStore(s => s.pushRecentSearch);
  const recent = useUIStore(s => s.recentSearches);

  const results = useMemo<SearchResult[]>(() => {
    if (!index) return [];
    return globalSearch(
      index.items || [], index.docs || [], index.business_plans || [],
      query, 50,
    );
  }, [index, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPaletteOpen(false);
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(results.length - 1, i + 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(0, i - 1)); }
      if (e.key === 'Enter') {
        const r = results[selectedIdx];
        if (r) {
          pushRecent(query);
          nav(r.navigateTo);
          setPaletteOpen(false);
        } else if (query.trim()) {
          pushRecent(query);
          useUIStore.getState().setSearch(query);
          nav('/items');
          setPaletteOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [results, selectedIdx, query, nav, setPaletteOpen, pushRecent]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/30 backdrop-blur-sm"
      onClick={() => setPaletteOpen(false)}
    >
      <div
        className="w-[560px] max-w-[92vw] rounded-lg border border-border bg-surface shadow-soft-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 h-11 border-b border-border">
          <Search className="w-4 h-4 text-ink-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            placeholder="Search items, docs, plans…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <button onClick={() => setPaletteOpen(false)} className="text-ink-muted hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {!query.trim() && recent.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-muted">Recent</div>
              {recent.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(r)}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-surface-2 text-sm text-left"
                >
                  <Search className="w-3.5 h-3.5 text-ink-muted" />
                  <span>{r}</span>
                </button>
              ))}
            </div>
          )}
          {query.trim() && results.length === 0 && (
            <div className="px-3 py-8 text-center text-ink-muted text-sm">No matches for {query}</div>
          )}
          {results.map((r, i) => {
            const Icon = r.kind === 'item' ? Hash : r.kind === 'doc' ? FileText : Briefcase;
            return (
              <button
                key={`${r.kind}-${r.id}`}
                onClick={() => {
                  pushRecent(query);
                  nav(r.navigateTo);
                  setPaletteOpen(false);
                }}
                onMouseEnter={() => setSelectedIdx(i)}
                className={clsx(
                  'w-full px-3 py-2 flex items-center gap-2.5 text-left text-sm',
                  i === selectedIdx ? 'bg-accent-soft' : 'hover:bg-surface-2',
                )}
              >
                <Icon className="w-4 h-4 text-ink-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{r.title}</div>
                  <div className="text-[10px] text-ink-muted truncate">{r.subtitle}</div>
                </div>
                <div className="font-mono text-[10px] text-ink-muted shrink-0">{r.id}</div>
                {i === selectedIdx && <ArrowRight className="w-3.5 h-3.5 text-accent shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="px-3 py-1.5 border-t border-border bg-surface-2 text-[10px] text-ink-muted flex items-center gap-3">
          <span><kbd className="px-1 bg-surface border border-border rounded">up dn</kbd> navigate</span>
          <span><kbd className="px-1 bg-surface border border-border rounded">enter</kbd> open</span>
          <span><kbd className="px-1 bg-surface border border-border rounded">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
