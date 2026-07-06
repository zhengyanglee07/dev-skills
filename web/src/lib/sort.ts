import { parseId, priorityRank } from './format';
import { isFinal } from './status';
import type { IndexEntry } from './types';

export type ItemsSortCol =
  | 'id' | 'title' | 'type' | 'status' | 'priority' | 'created' | 'updated';
export type ItemsSortDir = 'asc' | 'desc';

export function compareItems(
  a: IndexEntry,
  b: IndexEntry,
  col: ItemsSortCol,
  dir: ItemsSortDir,
): number {
  const sign = dir === 'asc' ? 1 : -1;
  switch (col) {
    case 'id': {
      const pa = parseId(a.id);
      const pb = parseId(b.id);
      if (pa && pb) {
        if (pa.prefix !== pb.prefix) return pa.prefix.localeCompare(pb.prefix) * sign;
        return (pa.num - pb.num) * sign;
      }
      return String(a.id).localeCompare(String(b.id)) * sign;
    }
    case 'title':
      return a.title.localeCompare(b.title) * sign;
    case 'type': {
      const order: Record<string, number> = {
        plan: 0, epic: 1, task: 2, bug: 3, improvement: 4,
        'sub-task': 5, action: 6, backlog: 7,
      };
      return ((order[a.type] ?? 99) - (order[b.type] ?? 99)) * sign;
    }
    case 'status':
      return a.status.localeCompare(b.status) * sign;
    case 'priority':
      return (priorityRank(a.priority) - priorityRank(b.priority)) * sign;
    case 'created':
      return (a.created_at ?? '').localeCompare(b.created_at ?? '') * sign;
    case 'updated': {
      const aT = a.completed_at || a.cancelled_at || a.converted_at || a.started_at || a.created_at || '';
      const bT = b.completed_at || b.cancelled_at || b.converted_at || b.started_at || b.created_at || '';
      return aT.localeCompare(bT) * sign;
    }
  }
}

export function itemsHaveDate(x: IndexEntry): boolean {
  return !!(x.started_at || x.completed_at);
}
export function itemsIsOpen(x: IndexEntry): boolean {
  return !isFinal(x.status);
}
