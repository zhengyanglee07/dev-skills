import type { IndexEntry, DocEntry, BusinessPlanEntry } from './types';

export function searchItems(items: IndexEntry[], q: string): IndexEntry[] {
  if (!q.trim()) return items;
  const needle = q.toLowerCase();
  return items.filter(it => {
    if (it.id.toLowerCase().includes(needle)) return true;
    if (it.title.toLowerCase().includes(needle)) return true;
    if (it.status.toLowerCase().includes(needle)) return true;
    if (it.type.toLowerCase().includes(needle)) return true;
    if (it.priority && it.priority.toLowerCase().includes(needle)) return true;
    if (it.tags?.some(t => t.toLowerCase().includes(needle))) return true;
    if (it.path.toLowerCase().includes(needle)) return true;
    return false;
  });
}

export function searchDocs(docs: DocEntry[], q: string): DocEntry[] {
  if (!q.trim()) return docs;
  const needle = q.toLowerCase();
  return docs.filter(d => {
    if (d.id.toLowerCase().includes(needle)) return true;
    if (d.title.toLowerCase().includes(needle)) return true;
    if (d.tags?.some(t => t.toLowerCase().includes(needle))) return true;
    if (d.subfolder?.toLowerCase().includes(needle)) return true;
    return false;
  });
}

export function searchPlans(plans: BusinessPlanEntry[], q: string): BusinessPlanEntry[] {
  if (!q.trim()) return plans;
  const needle = q.toLowerCase();
  return plans.filter(p => {
    if (p.id.toLowerCase().includes(needle)) return true;
    if (p.title.toLowerCase().includes(needle)) return true;
    if (p.phase?.toLowerCase().includes(needle)) return true;
    if (p.client?.toLowerCase().includes(needle)) return true;
    return false;
  });
}

export interface SearchResult {
  kind: 'item' | 'doc' | 'plan';
  id: string;
  title: string;
  subtitle?: string;
  navigateTo: string;
}

export function globalSearch(
  items: IndexEntry[],
  docs: DocEntry[],
  plans: BusinessPlanEntry[],
  q: string,
  limit = 50,
): SearchResult[] {
  if (!q.trim()) return [];
  const needle = q.toLowerCase();
  const results: SearchResult[] = [];
  for (const it of items) {
    if (
      it.id.toLowerCase().includes(needle) ||
      it.title.toLowerCase().includes(needle) ||
      (it.tags || []).some(t => t.toLowerCase().includes(needle))
    ) {
      results.push({
        kind: 'item',
        id: it.id,
        title: it.title,
        subtitle: `${it.type} · ${it.status}${it.parent_id ? ` · parent ${it.parent_id}` : ''}`,
        navigateTo: `/items/${encodeURIComponent(it.id)}`,
      });
      if (results.length >= limit) break;
    }
  }
  if (results.length < limit) {
    for (const d of docs) {
      if (
        d.id.toLowerCase().includes(needle) ||
        d.title.toLowerCase().includes(needle) ||
        (d.tags || []).some(t => t.toLowerCase().includes(needle))
      ) {
        results.push({
          kind: 'doc',
          id: d.id,
          title: d.title,
          subtitle: d.subfolder ? `doc · ${d.subfolder}/` : 'doc',
          navigateTo: `/docs/${encodeURIComponent(d.id)}`,
        });
        if (results.length >= limit) break;
      }
    }
  }
  if (results.length < limit) {
    for (const p of plans) {
      if (p.id.toLowerCase().includes(needle) || p.title.toLowerCase().includes(needle)) {
        results.push({
          kind: 'plan',
          id: p.id,
          title: p.title,
          subtitle: p.phase ? `plan · ${p.phase}` : 'plan',
          navigateTo: `/plans/${encodeURIComponent(p.id)}`,
        });
        if (results.length >= limit) break;
      }
    }
  }
  return results;
}
