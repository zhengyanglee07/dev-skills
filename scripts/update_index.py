#!/usr/bin/env python3
"""Rebuild Spaces/index.json from a full walk of Spaces/.

Usage:
    python update_index.py <project-root>

The index summarises every work item with id, type, title, status, path, and
timestamps. Useful for fast lookups, dashboards, and skill recall.

Warnings about malformed items are written both to stderr AND inline into
index.json under the `warnings: [...]` array, so drift is visible to anyone
reading the index.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import re

from _common import (
    iter_all_doc_files,
    iter_business_plan_files,
    iter_work_item_files,
    parse_id,
    read_doc_frontmatter,
    read_item,
    spaces_dir,
)


def _first_h1(path) -> str:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return ""
    in_fm = False
    for i, line in enumerate(text.splitlines()):
        if i == 0 and line.strip() == "---":
            in_fm = True
            continue
        if in_fm:
            if line.strip() == "---":
                in_fm = False
            continue
        m = re.match(r"^#\s+(.+)$", line)
        if m:
            return m.group(1).strip().strip('"')
    return ""


def _synthesize_doc_id(docs_dir: Path, path: Path, fm: dict) -> str:
    """Build a fallback id when frontmatter is missing.

    Resolution order:
      1. Frontmatter `id` (preferred).
      2. Filename stem that already matches `DOC-NNN-...` — use as-is.
      3. Subfolder + stem, with the subfolder name stripped from the stem's
         prefix to avoid `Report-Report-ClosingSales`. Example:
         `Spaces/Docs/Report/Report_ClosingSales.md` → `DOC-Report-ClosingSales`.
         Top-level files → `DOC-<stem>`.
    """
    if fm.get("id"):
        return fm["id"]
    parsed = parse_id(path.stem)
    if parsed:
        # e.g. "DOC-004-user-account" — already a valid id
        return path.stem
    try:
        rel = path.parent.relative_to(docs_dir)
    except ValueError:
        rel = path.parent
    sub = "" if rel == Path(".") else str(rel).replace("\\", "/")
    stem = path.stem
    if sub:
        for sep in ("_", "-"):
            prefix = sub + sep
            if stem.lower().startswith(prefix.lower()):
                stem = stem[len(prefix):]
                break
    pieces = [p for p in (sub, stem) if p]
    slug = "-".join(pieces)
    slug = re.sub(r"[_\s]+", "-", slug)
    slug = re.sub(r"[^A-Za-z0-9\-]+", "", slug)
    slug = slug.strip("-") or "doc"
    return f"DOC-{slug}"


def _doc_subfolder(docs_dir: Path, path: Path) -> str:
    """Subfolder name under Docs/ (e.g. 'Report'), or '' at top level."""
    try:
        rel = path.parent.relative_to(docs_dir)
    except ValueError:
        return ""
    if rel == Path("."):
        return ""
    return str(rel).replace("\\", "/")


def build_entry(project_root: Path, path: Path, warnings: list[dict]) -> dict | None:
    rel_str = str(path.relative_to(Path(project_root).resolve())).replace("\\", "/")

    try:
        item = read_item(path)
    except (OSError, ValueError) as e:
        msg = f"could not read: {e}"
        print(f"warn: {path}: {msg}", file=sys.stderr)
        warnings.append({"path": rel_str, "kind": "read_error", "message": msg})
        return None

    required = ["id", "type", "title", "status", "created_at"]
    missing = [k for k in required if k not in item]
    if missing:
        msg = f"missing fields: {missing}"
        print(f"warn: {path} {msg}", file=sys.stderr)
        warnings.append({"path": rel_str, "kind": "missing_fields", "message": msg})

    item_type = (item.get("type") or "").lower()
    code_producing = {"bug", "task", "improvement", "sub-task"}

    # fix_attempts and automated_tests are required only on code-producing types
    if item_type in code_producing:
        for field in ("fix_attempts", "automated_tests"):
            if not isinstance(item.get(field), list):
                msg = f"{field} must be present as an array (may be empty)"
                print(f"warn: {path} {msg}", file=sys.stderr)
                warnings.append({"path": rel_str, "kind": "shape_violation", "message": msg})

    # status_history is required on every type
    if not isinstance(item.get("status_history"), list):
        msg = "status_history must be present as an array"
        print(f"warn: {path} {msg}", file=sys.stderr)
        warnings.append({"path": rel_str, "kind": "shape_violation", "message": msg})

    status = item.get("status") or ""
    pre_coding_statuses = {"To Do", "Backlog", "New Request", "Triaging", "Needs Clarification", "Ready"}
    if (
        item_type in code_producing
        and status not in pre_coding_statuses
        and status != "Cancelled"
        and isinstance(item.get("verification_criteria"), list)
        and isinstance(item.get("automated_tests"), list)
    ):
        criteria = item["verification_criteria"]
        tests = item["automated_tests"]
        covered_indices = {
            t.get("criterion_index")
            for t in tests
            if isinstance(t, dict)
            and t.get("status") in {"passing", "skipped"}
        }
        uncovered = [
            i for i in range(len(criteria)) if i not in covered_indices
        ]
        if uncovered:
            msg = f"verification_criteria indices {uncovered} have no passing/skipped automated_tests entry"
            print(f"warn: {path} {msg}", file=sys.stderr)
            warnings.append({"path": rel_str, "kind": "test_coverage_gap", "message": msg})

    # Backlog-specific: Ready/Converted with unanswered questions
    if item_type == "backlog":
        questions = item.get("clarification_questions") or []
        unanswered = [
            q for q in questions
            if isinstance(q, dict) and q.get("answer") in (None, "")
        ]
        if status in ("Ready", "Converted") and unanswered:
            ids = [q.get("id") for q in unanswered]
            msg = f"status is {status!r} but unanswered clarification_questions remain: {ids}"
            print(f"warn: {path} {msg}", file=sys.stderr)
            warnings.append({"path": rel_str, "kind": "backlog_unanswered", "message": msg})
        if status == "Converted" and not item.get("converted_to"):
            msg = "status is 'Converted' but converted_to is empty"
            print(f"warn: {path} {msg}", file=sys.stderr)
            warnings.append({"path": rel_str, "kind": "backlog_missing_converted_to", "message": msg})

    parsed = parse_id(item.get("id", ""))
    if not parsed:
        msg = f"non-conforming id {item.get('id')!r}"
        print(f"warn: {path} {msg}", file=sys.stderr)
        warnings.append({"path": rel_str, "kind": "bad_id", "message": msg})

    return {
        "id": item.get("id"),
        "type": item.get("type"),
        "title": item.get("title"),
        "status": item.get("status"),
        "priority": item.get("priority"),
        "path": rel_str,
        "parent_id": item.get("parent_id"),
        "plan_id": item.get("plan_id"),
        "tags": item.get("tags", []),
        "created_at": item.get("created_at"),
        "started_at": item.get("started_at"),
        "completed_at": item.get("completed_at"),
        "cancelled_at": item.get("cancelled_at"),
        "converted_at": item.get("converted_at"),
    }


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    project_root = Path(argv[1]).resolve()
    base = spaces_dir(project_root)
    base.mkdir(parents=True, exist_ok=True)

    warnings: list[dict] = []
    entries: list[dict] = []
    for path in sorted(iter_work_item_files(project_root)):
        entry = build_entry(project_root, path, warnings)
        if entry is not None:
            entries.append(entry)

    # Sort: by type, then by ID number.
    def sort_key(e: dict):
        parsed = parse_id(e.get("id") or "") or ("", 0, None)
        return (parsed[0], parsed[1])

    entries.sort(key=sort_key)

    counts: dict[str, int] = {}
    by_status: dict[str, int] = {}
    for e in entries:
        counts[e.get("type") or "unknown"] = counts.get(e.get("type") or "unknown", 0) + 1
        by_status[e.get("status") or "unknown"] = by_status.get(e.get("status") or "unknown", 0) + 1

    # Collect learn docs from Spaces/Docs/ — every .md file, including
    # subfolders and loose files. Frontmatter id is preferred; for files
    # without one we synthesize a stable id from the path.
    doc_entries: list[dict] = []
    docs_dir = base / "Docs"
    for path in sorted(iter_all_doc_files(project_root)):
        fm = read_doc_frontmatter(path)
        rel = str(path.relative_to(Path(project_root).resolve())).replace("\\", "/")
        # Skip README files — they're folder landing pages, not knowledge
        # docs. They're still discoverable through the file tree if the
        # preview wants to render them.
        if path.stem.upper() == "README":
            continue
        synth_id = _synthesize_doc_id(docs_dir, path, fm)
        if not fm.get("id"):
            warnings.append({
                "path": rel, "kind": "doc_missing_id",
                "message": f"synthesized id {synth_id!r} from path",
            })
        try:
            size = path.stat().st_size
        except OSError:
            size = 0
        doc_entries.append({
            "id": synth_id,
            "title": fm.get("title", "") or _first_h1(path) or path.stem,
            "created_at": fm.get("created_at", ""),
            "tags": fm.get("tags", []),
            "related_items": fm.get("related_items", []),
            "source": fm.get("source", ""),
            "path": rel,
            "subfolder": _doc_subfolder(docs_dir, path),
            "size_bytes": size,
        })

    # Collect BusinessPlan markdown files (top-level + per-journey subfolders).
    bp_entries: list[dict] = []
    bp_dir = base / "BusinessPlan"
    for path in sorted(iter_business_plan_files(project_root)):
        rel = str(path.relative_to(Path(project_root).resolve())).replace("\\", "/")
        fm = read_doc_frontmatter(path)
        title = fm.get("title") or _first_h1(path) or path.stem
        try:
            folder = str(path.parent.relative_to(bp_dir)).replace("\\", "/")
        except ValueError:
            folder = ""
        if folder == ".":
            folder = ""
        bp_entries.append({
            "id": fm.get("id") or path.stem,
            "title": title,
            "path": rel,
            "folder": folder,
            "filename": path.name,
            "phase": fm.get("phase", ""),
            "status": fm.get("status", ""),
            "client": fm.get("client", ""),
            "owner": fm.get("owner", ""),
            "created_at": fm.get("created_at", ""),
        })

    index = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "counts_by_type": counts,
        "counts_by_status": by_status,
        "items": entries,
        "docs": doc_entries,
        "business_plans": bp_entries,
        "warnings": warnings,
    }

    out_path = base / "index.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(
        f"wrote {out_path} "
        f"({len(entries)} items, {len(doc_entries)} docs, "
        f"{len(bp_entries)} business-plans, "
        f"{len(warnings)} warnings)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
