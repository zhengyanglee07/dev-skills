"""Shared helpers for project-spaces scripts.

Lives next to the other scripts in ~/.claude/skills/project-spaces/scripts/.
Used by next_id.py, validate_transition.py, and update_index.py.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Iterable

TYPE_TO_PREFIX = {
    "action": "ACT",
    "backlog": "BLG",
    "bug": "BUG",
    "doc": "DOC",
    "epic": "EPIC",
    "improvement": "IMP",
    "plan": "PLAN",
    "task": "TASK",
    "sub-task": "SUB",
}

TYPE_TO_FOLDER = {
    "action": "Action",
    "backlog": "Backlog",
    "bug": "Bug",
    "doc": "Docs",
    "epic": "Epic",
    "improvement": "Improvement",
    "plan": "Plan",
    "task": "Task",
    "sub-task": "Sub-task",  # rarely used as a top-level folder; sub-tasks nest under parents
}

PREFIX_TO_TYPE = {v: k for k, v in TYPE_TO_PREFIX.items()}

ID_PATTERN = re.compile(r"^(ACT|BLG|BUG|DOC|EPIC|IMP|PLAN|TASK|SUB)-(\d+)(?:-(.+))?$")


def skill_root() -> Path:
    """The project-spaces skill directory (one level up from scripts/)."""
    return Path(__file__).resolve().parent.parent


def load_workflows() -> dict:
    with (skill_root() / "workflows.json").open("r", encoding="utf-8") as f:
        return json.load(f)


def spaces_dir(project_root: Path) -> Path:
    return Path(project_root).resolve() / "Spaces"


def iter_work_item_files(project_root: Path) -> Iterable[Path]:
    """Yield every JSON file in Spaces/ that looks like a work item.

    A work-item file is any .json under Spaces/ whose filename or stem matches
    the TYPE-NNN-slug pattern, OR a `<type>.json` (epic.json, task.json, etc.)
    inside a folder whose name matches the pattern.
    """
    base = spaces_dir(project_root)
    if not base.exists():
        return
    skip_names = {"index.json"}
    for path in base.rglob("*.json"):
        if path.name in skip_names:
            continue
        stem = path.stem
        # Match files like TASK-001-foo.json directly
        if ID_PATTERN.match(stem):
            yield path
            continue
        # Match <type>.json inside a TYPE-NNN-slug folder
        if path.parent.name and ID_PATTERN.match(path.parent.name):
            type_name = path.stem.lower().replace("_", "-")
            if type_name in TYPE_TO_PREFIX:
                yield path


def parse_id(item_id: str) -> tuple[str, int, str | None] | None:
    m = ID_PATTERN.match(item_id)
    if not m:
        return None
    prefix, num, slug = m.groups()
    return prefix, int(num), slug


def read_item(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_item(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def iter_doc_files(project_root: Path) -> Iterable[Path]:
    """Yield every .md file in Spaces/Docs/ whose stem matches DOC-NNN-slug.

    Strict: only `DOC-NNN-slug.md` files. Used by workflows that rely on a
    well-formed id from the filename. For the full set (including subfolders
    and loose files), see `iter_all_doc_files`.
    """
    docs_dir = spaces_dir(project_root) / "Docs"
    if not docs_dir.exists():
        return
    for path in docs_dir.rglob("*.md"):
        if ID_PATTERN.match(path.stem):
            yield path


def iter_all_doc_files(project_root: Path) -> Iterable[Path]:
    """Yield every .md file under Spaces/Docs/, including subfolders and loose
    files that don't match the DOC-NNN-slug convention.

    Use this for the preview index — every doc file is interesting. Strict
    consumers (anything that needs a parseable id) should keep using
    `iter_doc_files` and the frontmatter check.
    """
    docs_dir = spaces_dir(project_root) / "Docs"
    if not docs_dir.exists():
        return
    # README.md at any level is intentionally skipped — it's a folder landing
    # page, not a knowledge doc. (We still surface the file from the index if
    # the caller wants it; this generator is inclusive by design. The preview
    # UI may filter README out at render time.)
    for path in docs_dir.rglob("*.md"):
        yield path


def iter_business_plan_files(project_root: Path) -> Iterable[Path]:
    """Yield every .md file under Spaces/BusinessPlan/.

    BusinessPlan content is markdown-only: top-level files (e.g. index.md) plus
    subfolders per plan (e.g. BP-001-foo/journey.md, growth.md, scale.md, ...).
    """
    bp_dir = spaces_dir(project_root) / "BusinessPlan"
    if not bp_dir.exists():
        return
    for path in bp_dir.rglob("*.md"):
        yield path


def find_item_by_id(project_root: Path, item_id: str) -> Path | None:
    """Locate a work-item JSON file by its `id` field. Returns None if not found."""
    for path in iter_work_item_files(project_root):
        try:
            item = read_item(path)
        except (OSError, ValueError):
            continue
        if item.get("id") == item_id:
            return path
    return None


def read_doc_frontmatter(path: Path) -> dict:
    """Parse YAML-style frontmatter from a doc .md file.

    Expects the file to start with '---', followed by key: value lines, then
    a closing '---'. Returns a dict of the parsed fields; returns {} on failure.
    Arrays are written as [a, b, c] and parsed into Python lists.
    """
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return {}
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    fm_text = text[3:end].strip()
    result: dict = {}
    for line in fm_text.splitlines():
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        key = key.strip()
        val = val.strip()
        if val.startswith("[") and val.endswith("]"):
            inner = val[1:-1]
            result[key] = [item.strip() for item in inner.split(",") if item.strip()]
        else:
            result[key] = val
    return result
