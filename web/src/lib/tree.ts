// Build Plan → Epic → Task → Sub-task hierarchies from the flat index.
// Each item can be parented by `parent_id` (any type) or `plan_id` (a Plan).
// Sub-tasks usually have a `parent_id` pointing at their Task.

import type { IndexEntry } from './types';

export interface TreeNode {
  item: IndexEntry;
  children: TreeNode[];
}

export function buildTree(items: IndexEntry[]): {
  plans: TreeNode[];
  loose: IndexEntry[];
} {
  const byId = new Map<string, IndexEntry>();
  for (const it of items) byId.set(it.id, it);
  const childOf = new Map<string, IndexEntry[]>();
  for (const it of items) {
    if (it.parent_id) {
      const k = it.parent_id;
      if (!childOf.has(k)) childOf.set(k, []);
      childOf.get(k)!.push(it);
    } else if (it.plan_id) {
      const k = it.plan_id;
      if (!childOf.has(k)) childOf.set(k, []);
      childOf.get(k)!.push(it);
    }
  }
  const build = (it: IndexEntry): TreeNode => {
    const kids = childOf.get(it.id) || [];
    kids.sort((a, b) => a.id.localeCompare(b.id));
    return { item: it, children: kids.map(build) };
  };
  const plans = items
    .filter(x => x.type === 'plan')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(build);
  const loose = items.filter(
    x => !x.parent_id && !x.plan_id && x.type !== 'plan',
  );
  return { plans, loose };
}
