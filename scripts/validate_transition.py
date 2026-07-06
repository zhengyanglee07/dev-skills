#!/usr/bin/env python3
"""Validate a status transition against workflows.json.

Usage:
    python validate_transition.py <project-root> <type> "<from-status>" "<to-status>"

Exits 0 if the transition is legal (and prints the matching transition label).
Exits 1 with a human-readable error if illegal.

The <project-root> argument is currently unused but reserved for future
per-project workflow overrides.
"""
from __future__ import annotations

import sys

from _common import TYPE_TO_PREFIX, load_workflows


def find_transition(workflow: dict, from_status: str, to_status: str) -> dict | None:
    statuses = set(workflow["statuses"])
    finals = set(workflow.get("final_statuses", []))
    non_final = statuses - finals
    for t in workflow["transitions"]:
        if t["to"] != to_status:
            continue
        if t["from"] == from_status:
            return t
        if t["from"] == "*" and from_status in non_final:
            return t
    return None


def main(argv: list[str]) -> int:
    if len(argv) != 5:
        print(__doc__, file=sys.stderr)
        return 2
    _, _project_root, type_name, from_status, to_status = argv
    type_name = type_name.strip().lower()
    if type_name not in TYPE_TO_PREFIX:
        print(f"unknown type {type_name!r}", file=sys.stderr)
        return 1

    workflows = load_workflows()["workflows"]
    if type_name not in workflows:
        print(f"no workflow defined for type {type_name!r}", file=sys.stderr)
        return 1
    wf = workflows[type_name]

    if from_status not in wf["statuses"]:
        print(
            f"illegal: {from_status!r} is not a valid status for {type_name!r}. "
            f"valid: {wf['statuses']}",
            file=sys.stderr,
        )
        return 1
    if to_status not in wf["statuses"]:
        print(
            f"illegal: {to_status!r} is not a valid status for {type_name!r}. "
            f"valid: {wf['statuses']}",
            file=sys.stderr,
        )
        return 1

    t = find_transition(wf, from_status, to_status)
    if not t:
        legal = sorted({tr["to"] for tr in wf["transitions"] if tr["from"] in (from_status, "*")})
        print(
            f"illegal transition {from_status!r} -> {to_status!r} for type {type_name!r}. "
            f"legal next statuses from {from_status!r}: {legal}",
            file=sys.stderr,
        )
        return 1

    print(t["label"])
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
