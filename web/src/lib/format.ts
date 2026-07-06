// Formatters for timestamps, durations, and human-readable fields. All
// timestamps in the JSON are ISO-8601 UTC (e.g. "2026-05-16T06:00:00Z") so
// we just slice and re-arrange for display.

export function fmtTimestamp(ts: unknown): string {
  if (typeof ts !== 'string' || !ts) return '';
  // "2026-05-16T06:00:00Z" → "2026-05-16 06:00:00 UTC"
  return ts.replace('T', ' ').replace(/\.\d+/, '').replace('Z', ' UTC');
}

export function fmtDate(ts: unknown): string {
  if (typeof ts !== 'string' || !ts) return '';
  return ts.slice(0, 10);
}

export function fmtBytes(n: number | undefined | null): string {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}k`;
  return `${(n / 1024 / 1024).toFixed(1)}M`;
}

export function relTime(ts: string | undefined | null, now: Date = new Date()): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(+d)) return '';
  const diff = (+d - +now) / 1000; // seconds; positive = future
  const abs = Math.abs(diff);
  const past = diff < 0;
  let s: string;
  if (abs < 60) s = 'just now';
  else if (abs < 3600) s = `${Math.round(abs / 60)}m`;
  else if (abs < 86400) s = `${Math.round(abs / 3600)}h`;
  else if (abs < 86400 * 30) s = `${Math.round(abs / 86400)}d`;
  else if (abs < 86400 * 365) s = `${Math.round(abs / (86400 * 30))}mo`;
  else s = `${Math.round(abs / (86400 * 365))}y`;
  if (s === 'just now') return s;
  return past ? `${s} ago` : `in ${s}`;
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return n === 1 ? singular : (plural ?? `${singular}s`);
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

// Re-exported here for sort.ts which used to import it from here. Kept in
// status.ts as the source of truth.
export { priorityRank } from './status';

// Parsed id from a string like "TASK-007" or "EPIC-001-phase-1-foo".
export interface ParsedId {
  prefix: string;
  num: number;
  slug: string | null;
}
const ID_RE = /^(ACT|BLG|BUG|DOC|EPIC|IMP|PLAN|TASK|SUB)-(\d+)(?:-(.+))?$/i;
export function parseId(s: string | undefined | null): ParsedId | null {
  if (!s) return null;
  const m = ID_RE.exec(s);
  if (!m) return null;
  return { prefix: m[1].toUpperCase(), num: parseInt(m[2], 10), slug: m[3] ?? null };
}
