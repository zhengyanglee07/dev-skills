#!/usr/bin/env python3
"""Print the next available ID for a work-item type.

Usage:
    python next_id.py <project-root> <type>

Example:
    python next_id.py /home/me/repo task   # prints e.g. TASK-008

Walks the entire Spaces/ tree to find the max existing number for the type's
prefix, then returns max+1 (zero-padded to 3 digits).
"""
from __future__ import annotations

import sys
from pathlib import Path

from _common import (
    PREFIX_TO_TYPE,
    TYPE_TO_PREFIX,
    iter_doc_files,
    iter_work_item_files,
    parse_id,
    read_doc_frontmatter,
    read_item,
)


def next_id(project_root: Path, type_name: str) -> str:
    if type_name not in TYPE_TO_PREFIX:
        raise SystemExit(
            f"unknown type {type_name!r}. valid types: {sorted(TYPE_TO_PREFIX)}"
        )
    prefix = TYPE_TO_PREFIX[type_name]
    max_num = 0

    if type_name == "doc":
        for path in iter_doc_files(project_root):
            fm = read_doc_frontmatter(path)
            item_id = fm.get("id", "") or path.stem
            parsed = parse_id(item_id)
            if parsed and parsed[0] == prefix and parsed[1] > max_num:
                max_num = parsed[1]
        return f"{prefix}-{max_num + 1:03d}"

    for path in iter_work_item_files(project_root):
        # Prefer reading the item to get an authoritative ID; fall back to filename.
        try:
            item = read_item(path)
            item_id = item.get("id", "")
        except (OSError, ValueError):
            item_id = ""
        if not item_id:
            # try filename or parent folder
            for candidate in (path.stem, path.parent.name):
                if candidate.startswith(prefix + "-"):
                    item_id = candidate
                    break
        parsed = parse_id(item_id)
        if parsed and parsed[0] == prefix:
            if parsed[1] > max_num:
                max_num = parsed[1]
    return f"{prefix}-{max_num + 1:03d}"


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    project_root = Path(argv[1])
    type_name = argv[2].strip().lower()
    print(next_id(project_root, type_name))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
