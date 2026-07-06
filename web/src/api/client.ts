// Tiny fetch wrapper. The preview server routes all /api/* to live data;
// everything else under /preview/ is static.
//
// Read-only by design — the SKILL.md is explicit: "The UI is read-only — it
// never writes back." This client deliberately doesn't expose POST/PUT/etc.

export class ApiError extends Error {
  status: number;
  hint?: string;
  constructor(message: string, status: number, hint?: string) {
    super(message);
    this.status = status;
    this.hint = hint;
  }
}

export async function apiGetJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let body: { error?: string; hint?: string } = {};
    try { body = await res.json(); } catch { /* ignore */ }
    throw new ApiError(
      body.error || `GET ${path} → ${res.status}`,
      res.status,
      body.hint,
    );
  }
  return res.json() as Promise<T>;
}

export async function apiGetText(path: string): Promise<string> {
  const res = await fetch(path, { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    throw new ApiError(`GET ${path} → ${res.status}`, res.status);
  }
  return res.text();
}

export function spacesFileUrl(path: string): string {
  // `path` is a path from index.json (e.g. "Spaces/Task/TASK-001.json" or
  // "Spaces/Docs/Report/Report_foo.md"). The Python server's /api/file
  // accepts both "Spaces/..." and bare relative paths and resolves them
  // against the spaces dir.
  return `/api/file?path=${encodeURIComponent(path)}`;
}
