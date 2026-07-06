// Workflow status sets, derived from workflows.json. Kept in one place so the
// dashboard, table, and filters all agree on what counts as "open" vs
// "in-flight" vs "ready to start".

import type { Priority, WorkType } from './types';

export const FINAL_STATUSES: ReadonlySet<string> = new Set([
  'Closed',
  'Cancelled',
  'Converted',
  'Subtask Done',
]);

// In-flight (intermediate) statuses. Anything not in FINAL_STATUSES and not
// in this set is "ready to start" (To Do, Ready, New Request, Needs Clarification).
export const IN_PROGRESS_STATUSES: ReadonlySet<string> = new Set([
  'Coding',
  'Code Review',
  'Staging',
  'Ready For Deploy',
  'In Progress',
  'Subtask In Progress',
  'Plan Review',
  'Planning',
  'Accepted',
  'Under Review',
  'Production',
  'Approved',
]);

export const READY_STATUSES: ReadonlySet<string> = new Set([
  'To Do',
  'Ready',
  'New Request',
  'Needs Clarification',
]);

export function isFinal(status: string | undefined | null): boolean {
  return !!status && FINAL_STATUSES.has(status);
}
export function isInProgress(status: string | undefined | null): boolean {
  return !!status && IN_PROGRESS_STATUSES.has(status);
}
export function isReady(status: string | undefined | null): boolean {
  return !!status && READY_STATUSES.has(status);
}

export const TYPE_ORDER: readonly WorkType[] = [
  'plan', 'epic', 'task', 'bug', 'improvement', 'sub-task', 'action', 'backlog',
];

export const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};
export function priorityRank(p: Priority | string | undefined): number {
  if (!p) return 99;
  return PRIORITY_RANK[p as Priority] ?? 99;
}

// Visual type → tailwind colour hint (used in graphs, gantt, etc. where we
// need a deterministic colour per type without bringing in a UI lib).
export const TYPE_COLORS: Record<WorkType, string> = {
  plan: '#0e7490',       // cyan-700
  epic: '#c2410c',       // orange-700
  task: '#1d4ed8',       // blue-700
  bug: '#b91c1c',        // red-700
  improvement: '#15803d',// green-700
  'sub-task': '#a21caf', // purple-700
  action: '#6d28d9',     // violet-700
  backlog: '#57534e',    // stone-600
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: '#b91c1c',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#65a30d',
};

// All known statuses (collected from workflow data). Used to populate the
// status filter chip row when no items exist yet but a saved filter does.
export const ALL_STATUSES: readonly string[] = [
  'New Request',
  'Needs Clarification',
  'Ready',
  'To Do',
  'Planning',
  'Plan Review',
  'Accepted',
  'Under Review',
  'In Progress',
  'Approved',
  'Coding',
  'Code Review',
  'Staging',
  'Ready For Deploy',
  'Production',
  'Closed',
  'Cancelled',
  'Converted',
  'Subtask In Progress',
  'Subtask Done',
];

export const ALL_PRIORITIES: readonly Priority[] = ['urgent', 'high', 'medium', 'low'];
