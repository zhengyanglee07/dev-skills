#!/usr/bin/env python3
"""Serve the shared Spaces preview UI for any project.

Designed to be run from anywhere with the script's full path:

    python ~/.claude/skills/project-spaces/scripts/preview.py /path/to/Spaces

The preview UI lives in this skill at ~/.claude/skills/project-spaces/preview/
and is shared across every project — it is never copied into a project tree.
This script starts a local HTTP server that routes:

    /                  → 302 redirect to /preview/
    /preview/*         → the skill's preview/ folder      (the React app)
    /api/index         → the project's Spaces/index.json  (live read)
    /api/status        → summary of index.json (for the startup banner)
    /api/file?path=..  → read any file under Spaces/      (live read)
    /index.json, /Docs/*, /Epic/*, etc.
                        → legacy direct paths into Spaces/ (backward compat)

The React app (built into preview/) is a single-page application: any
unmatched /preview/* path serves preview/index.html and the client-side
router takes over. This is how deep links like /preview/items/TASK-007
work on a hard refresh.

The script is read-only by design — POST/PUT/PATCH/DELETE all return 405.
That's a hard rule from SKILL.md.

Arguments:
    spaces-path   Path to the project's Spaces/ folder. If omitted:
                  - if ./Spaces exists in the cwd, uses that;
                  - otherwise uses the cwd.
                  Convenience only — passing the path explicitly is the
                  canonical form, since this script is meant to be invoked
                  by full path from any working directory.
    --port        Port to bind. Default 0 (the OS picks any free port) — so
                  multiple instances can run side by side without collisions.
                  Pass an explicit port if you want a stable URL.
    --host        Host to bind. Default 0.0.0.0 — reachable from other
                  machines on the LAN (e.g. http://192.168.x.x:<port>/preview/).
                  Use 127.0.0.1 to restrict to localhost only.
    --no-lan      Suppress the auto-detected LAN URL even when binding to
                  0.0.0.0. Useful for quick local-only runs.
    --open        Print a one-liner you can paste to open the URL in your
                  default browser (e.g. `open http://...` on macOS,
                  `xdg-open http://...` on Linux). The script does NOT
                  auto-launch a browser — that's a hard rule from SKILL.md.

Prints the preview URL(s) when ready, plus a short summary of what was
loaded from index.json (item count, doc count, plan count, warning count,
last-generated timestamp). Ctrl+C to stop.
"""
from __future__ import annotations

import argparse
import http.server
import json
import platform
import socket
import socketserver
import sys
from pathlib import Path
import urllib.parse

from _common import skill_root


def detect_lan_ip() -> str | None:
    """Best-effort LAN IPv4 discovery. Returns None if it can't be determined."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't actually send packets; just picks the route's source address.
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


def _open_command(url: str) -> str | None:
    """Return a shell one-liner that opens `url` in the platform's default
    browser. None when the platform is unknown. We never invoke it from
    inside the script — the user pastes it themselves.
    """
    system = platform.system().lower()
    if system == "darwin":
        return f"open {url}"
    if system == "linux":
        # Prefer xdg-open (most desktops); fall back to wslview on WSL.
        try:
            osrelease = Path("/proc/sys/kernel/osrelease").read_text(errors="ignore").lower()
        except OSError:
            osrelease = ""
        if "microsoft" in osrelease:
            return f"wslview {url}"
        return f"xdg-open {url}"
    if system == "windows":
        return f"start {url}"
    return None


def _read_index_summary(spaces_dir: Path) -> str | None:
    """Peek at Spaces/index.json to print a one-line 'what's loaded' banner.
    Returns None if the file is missing or unreadable — we never want a
    bad index to keep the server from starting.
    """
    idx_path = spaces_dir / "index.json"
    try:
        data = json.loads(idx_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    n_items = len(data.get("items") or [])
    n_docs = len(data.get("docs") or [])
    n_plans = len(data.get("business_plans") or [])
    n_warn = len(data.get("warnings") or [])
    gen = (data.get("generated_at") or "").replace("T", " ").replace("Z", " UTC")
    gen = gen.split(".")[0]
    return f"{n_items} items · {n_docs} docs · {n_plans} plans · {n_warn} warnings  (index {gen})"


def make_handler(spaces_dir: Path, preview_dir: Path):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def translate_path(self, path: str) -> str:
            # Strip query/fragment, decode percent-escapes, split on '/'
            raw = urllib.parse.unquote(path).split("?", 1)[0].split("#", 1)[0]
            parts = [p for p in raw.split("/") if p and p != "."]
            # Refuse traversal
            if any(p == ".." for p in parts):
                return str(spaces_dir / "__forbidden__")
            # Root → preview index
            if not parts:
                return str(preview_dir / "index.html")
            # /preview or /preview/<rest>
            if parts[0] == "preview":
                rest = "/".join(parts[1:]) or "index.html"
                target = preview_dir / rest
                # SPA fallback: if the file doesn't exist inside /preview,
                # serve the React app's index.html. This is how deep links
                # like /preview/items/TASK-007 work — the React Router takes
                # over client-side.
                if not target.exists() and not rest.endswith("/"):
                    # Try with .html extension (Vite's "clean URLs")
                    alt = preview_dir / (rest + ".html")
                    if alt.exists():
                        return str(alt)
                    # Otherwise serve the SPA shell
                    return str(preview_dir / "index.html")
                return str(target)
            # Everything else → Spaces
            return str(spaces_dir / "/".join(parts))

        # ---------- new /api/* routes ----------
        # The React app talks to these instead of the legacy /index.json +
        # /Docs/* paths. Same data, but consistent namespacing and the
        # /api/file?path=... endpoint lets the client fetch any Spaces file
        # without us having to enumerate routes per folder.

        def _send_json(self, status: int, payload: dict) -> None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _send_text(self, status: int, body: bytes, content_type: str) -> None:
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _resolve_spaces_path(self, raw: str) -> Path | None:
            """Resolve a user-supplied path and verify it lives under spaces_dir.

            Returns the resolved Path, or None if the path is missing, empty,
            or attempts to escape spaces_dir. The caller decides the 4xx.
            """
            if not raw:
                return None
            # index.json paths are project-root-relative (e.g. "Spaces/Action/ACT-001.json").
            # spaces_dir is the Spaces/ directory itself, so strip a leading "Spaces/"
            # (or "./Spaces/") before joining — otherwise we'd resolve to Spaces/Spaces/...
            cleaned = raw
            for prefix in ("Spaces/", "./Spaces/", "Spaces\\", "./Spaces\\"):
                if cleaned.startswith(prefix):
                    cleaned = cleaned[len(prefix):]
                    break
            p = Path(cleaned)
            if not p.is_absolute():
                p = spaces_dir / p
            try:
                p = p.resolve()
            except (OSError, ValueError):
                return None
            try:
                p.relative_to(spaces_dir.resolve())
            except ValueError:
                return None
            return p

        def do_GET(self) -> None:  # noqa: N802 (BaseHTTPRequestHandler API)
            parsed = urllib.parse.urlparse(self.path)
            raw_path = urllib.parse.unquote(parsed.path).rstrip("/")
            qs = urllib.parse.parse_qs(parsed.query)

            # ---- /api/index — Spaces/index.json ----
            if raw_path == "/api/index":
                idx = spaces_dir / "index.json"
                if not idx.exists():
                    return self._send_json(404, {
                        "error": "index.json not found",
                        "hint": f"run: python {skill_root()}/scripts/update_index.py <project-root>",
                    })
                try:
                    body = idx.read_bytes()
                except OSError as e:
                    return self._send_json(500, {"error": f"read failed: {e}"})
                return self._send_text(200, body, "application/json; charset=utf-8")

            # ---- /api/status — index summary for the startup banner ----
            if raw_path == "/api/status":
                idx = spaces_dir / "index.json"
                if not idx.exists():
                    return self._send_json(200, {
                        "index_exists": False,
                        "item_count": 0,
                        "doc_count": 0,
                        "plan_count": 0,
                        "warning_count": 0,
                        "index_age_seconds": None,
                    })
                try:
                    data = json.loads(idx.read_text(encoding="utf-8"))
                except (OSError, ValueError):
                    return self._send_json(200, {"index_exists": True, "parse_error": True})
                age = None
                try:
                    mtime = idx.stat().st_mtime
                    age = int(__import__("time").time() - mtime)
                except OSError:
                    pass
                return self._send_json(200, {
                    "index_exists": True,
                    "index_age_seconds": age,
                    "item_count": len(data.get("items") or []),
                    "doc_count": len(data.get("docs") or []),
                    "plan_count": len(data.get("business_plans") or []),
                    "warning_count": len(data.get("warnings") or []),
                    "counts_by_type": data.get("counts_by_type") or {},
                    "counts_by_status": data.get("counts_by_status") or {},
                    "generated_at": data.get("generated_at"),
                })

            # ---- /api/file?path=<encoded> — read any file under Spaces/ ----
            if raw_path == "/api/file":
                rel = (qs.get("path") or [""])[0]
                p = self._resolve_spaces_path(rel)
                if p is None:
                    return self._send_json(400, {
                        "error": "missing or invalid path",
                        "hint": "pass ?path=Spaces/Docs/foo.md or similar",
                    })
                if not p.exists():
                    return self._send_json(404, {"error": f"not found: {rel}"})
                if not p.is_file():
                    return self._send_json(400, {"error": f"not a file: {rel}"})
                try:
                    body = p.read_bytes()
                except OSError as e:
                    return self._send_json(500, {"error": f"read failed: {e}"})
                ct = "text/markdown; charset=utf-8" if p.suffix == ".md" else \
                     "application/json; charset=utf-8" if p.suffix == ".json" else \
                     "application/octet-stream"
                return self._send_text(200, body, ct)

            # ---- / (root) → redirect to /preview/ ----
            if raw_path == "" or raw_path == "/":
                self.send_response(302)
                self.send_header("Location", "/preview/")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return

            # Anything else: defer to the static handler.
            super().do_GET()

        # Read-only by design. The UI never writes back; that's a hard rule
        # from SKILL.md. Return 405 for any other method.
        def do_POST(self) -> None:  # noqa: N802
            self._send_json(405, {"error": "read-only: POST not allowed"})

        def do_PUT(self) -> None:  # noqa: N802
            self._send_json(405, {"error": "read-only: PUT not allowed"})

        def do_PATCH(self) -> None:  # noqa: N802
            self._send_json(405, {"error": "read-only: PATCH not allowed"})

        def do_DELETE(self) -> None:  # noqa: N802
            self._send_json(405, {"error": "read-only: DELETE not allowed"})

        def end_headers(self) -> None:
            # The data backing the UI is meant to be live — never cache it
            # so a refresh picks up updates to index.json.
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def log_message(self, format: str, *args) -> None:
            sys.stderr.write(
                f"  [HTTP] {self.address_string()} {format % args}\n"
            )

    return Handler


def resolve_spaces_dir(arg: str | None) -> Path:
    if arg:
        return Path(arg).resolve()
    cwd = Path.cwd()
    if (cwd / "Spaces").is_dir():
        return (cwd / "Spaces").resolve()
    return cwd.resolve()


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Serve the shared Spaces preview UI for any project.",
    )
    parser.add_argument(
        "spaces_path",
        nargs="?",
        help="Path to Spaces/ folder. Defaults to ./Spaces if it exists, else cwd.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=0,
        help="Port to bind (default: 0 — OS picks any free port; "
        "lets you run multiple instances side by side).",
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Host to bind (default: 0.0.0.0 — reachable from other machines "
        "on the LAN). Use 127.0.0.1 to restrict to localhost.",
    )
    parser.add_argument(
        "--no-lan",
        action="store_true",
        help="Suppress the auto-detected LAN URL (default: show it when binding 0.0.0.0).",
    )
    parser.add_argument(
        "--open",
        action="store_true",
        help="Print a one-liner to open the URL in your default browser "
        "(does NOT auto-launch).",
    )
    args = parser.parse_args(argv[1:])

    spaces_dir = resolve_spaces_dir(args.spaces_path)
    if not spaces_dir.is_dir():
        print(f"error: {spaces_dir} is not a directory", file=sys.stderr)
        return 1
    if spaces_dir.name != "Spaces" and not (spaces_dir / "index.json").exists():
        print(
            f"warning: {spaces_dir} does not look like a Spaces folder "
            f"(name is not 'Spaces' and no index.json). Continuing anyway.",
            file=sys.stderr,
        )

    preview_dir = skill_root() / "preview"
    if not (preview_dir / "index.html").exists():
        print(f"error: preview UI missing at {preview_dir}/index.html", file=sys.stderr)
        return 1

    handler = make_handler(spaces_dir, preview_dir)

    # Allow rapid restart without TIME_WAIT errors
    class _Server(socketserver.TCPServer):
        allow_reuse_address = True

    try:
        with _Server((args.host, args.port), handler) as httpd:
            # Read the actual port back (in case args.port was 0 → OS-assigned)
            actual_port = httpd.server_address[1]
            local_url = f"http://localhost:{actual_port}/preview/"
            print("", flush=True)
            print(f"  → {local_url}", flush=True)
            if args.host in ("0.0.0.0", "::") and not args.no_lan:
                lan_ip = detect_lan_ip()
                if lan_ip and lan_ip != "127.0.0.1":
                    print(
                        f"  → http://{lan_ip}:{actual_port}/preview/  (LAN)",
                        flush=True,
                    )
            elif args.host not in ("0.0.0.0", "::"):
                print(
                    f"  → http://{args.host}:{actual_port}/preview/",
                    flush=True,
                )
            print(f"\n  serving {spaces_dir}", flush=True)

            summary = _read_index_summary(spaces_dir)
            if summary:
                print(f"  loaded  {summary}", flush=True)
            else:
                print(
                    "  loaded  (no index.json — run "
                    "scripts/update_index.py <project-root> to build one)",
                    flush=True,
                )

            if args.open:
                cmd = _open_command(local_url)
                print(f"\n  open in browser:  {cmd or local_url}\n", flush=True)
            else:
                print("", flush=True)

            print("  Ctrl+C to stop\n", flush=True)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")
        return 0
    except OSError as e:
        print(
            f"error: could not bind to {args.host}:{args.port} — {e}",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
