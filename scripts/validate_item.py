#!/usr/bin/env python3
"""Validate one or all Spaces work-item JSON files.

Usage:
    python validate_item.py <project-root> [path-to-item.json]

If a path is provided, validates just that file.
Otherwise walks Spaces/ and validates every work item.

Exits 0 if every file is clean. Exits 1 if any file has errors.
Errors go to stderr; a summary line goes to stdout.

Validation rules mirror references/schema.md:

Universal:
  - required-on-every-type fields present (schema_version, id, type, title, status, created_at, status_history)
  - type matches workflows.json
  - status is a legal status for the type
  - every status_history transition exists in workflows.json
  - created_at <= status_history[0].at
  - cancelled_at set iff status == "Cancelled"

Non-Backlog:
  - verification_criteria, affected_files, solution_summary present
  - completed_at set iff status is final and != "Cancelled"

Code-producing (bug, task, improvement, sub-task):
  - fix_attempts and automated_tests present as arrays
  - past Coding: every verification_criteria entry covered by a passing/skipped automated_tests entry

Backlog:
  - clarification_questions present as array
  - cannot be in Ready/Converted with any unanswered question
  - converted_to and converted_at both set iff status == "Converted"
"""
from __future__ import annotations

import sys
from pathlib import Path

from _common import (
    TYPE_TO_PREFIX,
    iter_work_item_files,
    load_workflows,
    parse_id,
    read_item,
)

CODE_PRODUCING = {"bug", "task", "improvement", "sub-task"}
PRE_CODING_STATUSES = {"To Do", "Backlog", "New Request", "Triaging", "Needs Clarification", "Ready"}

UNIVERSAL_REQUIRED = ["schema_version", "id", "type", "title", "status", "created_at", "status_history"]
NON_BACKLOG_REQUIRED = ["verification_criteria", "affected_files", "solution_summary"]
CODE_PRODUCING_REQUIRED = ["fix_attempts", "automated_tests"]
BACKLOG_REQUIRED = ["clarification_questions"]


def validate_item(item: dict, path: Path, workflows: dict) -> list[str]:
    """Return list of human-readable error strings; empty list = clean."""
    errors: list[str] = []
    rel = path.name

    # Universal required fields
    for field in UNIVERSAL_REQUIRED:
        if field not in item:
            errors.append(f"missing required field: {field}")

    if errors:
        # Can't check anything else without the basics.
        return errors

    item_type = (item.get("type") or "").lower()
    status = item.get("status") or ""

    # Type recognised
    if item_type not in TYPE_TO_PREFIX:
        errors.append(f"unknown type: {item_type!r}")
        return errors

    # Doc isn't a JSON workflow type
    if item_type == "doc":
        errors.append("doc items are markdown, not JSON — this file shouldn't exist")
        return errors

    wf = workflows.get(item_type)
    if not wf:
        errors.append(f"no workflow defined for type {item_type!r}")
        return errors

    # Status valid for type
    if status not in wf["statuses"]:
        errors.append(f"status {status!r} is not legal for type {item_type!r}; valid: {wf['statuses']}")

    # ID format
    parsed = parse_id(item.get("id", ""))
    if not parsed:
        errors.append(f"id {item.get('id')!r} does not match TYPE-NNN-slug pattern")
    elif parsed[0] != TYPE_TO_PREFIX[item_type]:
        errors.append(f"id prefix {parsed[0]!r} does not match type {item_type!r} (expected {TYPE_TO_PREFIX[item_type]})")

    # status_history checks
    sh = item.get("status_history")
    if not isinstance(sh, list) or not sh:
        errors.append("status_history must be a non-empty array")
    else:
        first = sh[0]
        if first.get("from") is not None:
            errors.append("status_history[0].from must be null (the create entry)")
        if first.get("transition") != "create":
            errors.append("status_history[0].transition must be 'create'")
        # created_at <= first.at
        created = item.get("created_at", "")
        first_at = first.get("at", "")
        if created and first_at and created > first_at:
            errors.append(f"created_at ({created}) must be <= status_history[0].at ({first_at})")
        # validate every non-create transition exists in workflows.json
        legal_labels = {t["label"] for t in wf["transitions"]} | {"create"}
        for i, entry in enumerate(sh):
            label = entry.get("transition")
            if label not in legal_labels:
                errors.append(f"status_history[{i}].transition {label!r} not in workflows.json")

    # cancelled_at set iff status == Cancelled
    cancelled = "cancelled_at" in item and item.get("cancelled_at")
    if status == "Cancelled" and not cancelled:
        errors.append("status is 'Cancelled' but cancelled_at is not set")
    if status != "Cancelled" and cancelled:
        errors.append(f"cancelled_at is set but status is {status!r}, not 'Cancelled'")

    # completed_by must be set whenever completed_at is set
    completed_at = item.get("completed_at")
    completed_by = item.get("completed_by")
    if completed_at and not completed_by:
        errors.append("completed_at is set but completed_by is null — record the model name that closed this item")

    # Type-specific checks
    if item_type == "backlog":
        for field in BACKLOG_REQUIRED:
            if field not in item:
                errors.append(f"missing required field for backlog: {field}")
        # cannot be Ready/Converted with unanswered questions
        questions = item.get("clarification_questions") or []
        unanswered = [q for q in questions if isinstance(q, dict) and q.get("answer") in (None, "")]
        if status in ("Ready", "Converted") and unanswered:
            ids = [q.get("id") for q in unanswered]
            errors.append(f"status is {status!r} but {len(unanswered)} clarification_questions still unanswered: {ids}")
        # converted_to and converted_at iff Converted
        converted_to = item.get("converted_to")
        converted_at = item.get("converted_at")
        if status == "Converted":
            if not converted_to:
                errors.append("status is 'Converted' but converted_to is not set")
            if not converted_at:
                errors.append("status is 'Converted' but converted_at is not set")
        else:
            if converted_to:
                errors.append(f"converted_to is set but status is {status!r}, not 'Converted'")
            if converted_at:
                errors.append(f"converted_at is set but status is {status!r}, not 'Converted'")
    else:
        # Non-backlog: verification_criteria, affected_files, solution_summary required
        for field in NON_BACKLOG_REQUIRED:
            if field not in item:
                errors.append(f"missing required field: {field}")
        # completed_at iff in final-but-not-cancelled status
        finals = set(wf.get("final_statuses", []))
        is_completed_final = status in finals and status != "Cancelled"
        completed_at = item.get("completed_at")
        if is_completed_final and not completed_at:
            errors.append(f"status is final ({status!r}) but completed_at is not set")
        if not is_completed_final and completed_at:
            errors.append(f"completed_at is set but status is {status!r} (not a non-cancelled final state)")

    # Code-producing: fix_attempts, automated_tests + coverage rule
    if item_type in CODE_PRODUCING:
        for field in CODE_PRODUCING_REQUIRED:
            if field not in item:
                errors.append(f"missing required field for code-producing type: {field}")
            elif not isinstance(item.get(field), list):
                errors.append(f"{field} must be an array")
        if status not in PRE_CODING_STATUSES and status != "Cancelled":
            criteria = item.get("verification_criteria") or []
            tests = item.get("automated_tests") or []
            covered = {
                t.get("criterion_index")
                for t in tests
                if isinstance(t, dict) and t.get("status") in {"passing", "skipped"}
            }
            uncovered = [i for i in range(len(criteria)) if i not in covered]
            if uncovered:
                errors.append(
                    f"verification_criteria indices {uncovered} not covered by any passing/skipped automated_tests entry"
                )

    return errors


def main(argv: list[str]) -> int:
    if len(argv) not in (2, 3):
        print(__doc__, file=sys.stderr)
        return 2
    project_root = Path(argv[1]).resolve()
    target = Path(argv[2]).resolve() if len(argv) == 3 else None

    workflows = load_workflows()["workflows"]

    if target:
        paths = [target]
    else:
        paths = sorted(iter_work_item_files(project_root))

    total_errors = 0
    files_with_errors = 0
    for path in paths:
        try:
            item = read_item(path)
        except (OSError, ValueError) as e:
            print(f"ERROR {path}: could not read ({e})", file=sys.stderr)
            total_errors += 1
            files_with_errors += 1
            continue
        errors = validate_item(item, path, workflows)
        if errors:
            files_with_errors += 1
            total_errors += len(errors)
            print(f"\n{path}:", file=sys.stderr)
            for err in errors:
                print(f"  - {err}", file=sys.stderr)

    if total_errors:
        print(f"\nvalidate_item: {total_errors} error(s) across {files_with_errors} file(s)")
        return 1
    print(f"validate_item: {len(paths)} file(s) clean")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
