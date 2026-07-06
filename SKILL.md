---
name: project-spaces
description: Tracks software-development work as versioned JSON work-items (Backlog, Plan, Epic, Task, Bug, Improvement, Action, Sub-task) under Spaces/ at the project root, with strict per-type status workflows. Drives the dev loop — plan → file → implement → test → commit. Use Backlog when scope or type is unclear — capture clarification questions first, then convert. Also captures system knowledge as markdown Learn Docs in Spaces/Docs/, and ships a shared browser preview UI (scripts/preview.py serves a local URL to browse items + docs with markdown). Activate PROACTIVELY at the start of any non-trivial dev work — bug fix, feature, phase plan, refactor, sub-task, code review, or anything deserving a paper trail. Also when the user references work items by ID, asks about status, mentions phase/epic/task/bug/backlog, or asks to mark something done/in-progress. Skip ONLY for trivial typo fixes, pure read-only questions, and exploratory chitchat. When in doubt, propose a Spaces entry and let the user decline.
---

# Project Spaces

Structured work-item tracking for this project. Every meaningful unit of development is captured as a JSON file under `Spaces/` at the project root. The skill drives the development loop from **intent → file → implement → test → commit**, enforced by a per-type state machine.

The point: a future you (or a teammate, or a CTO) can open `Spaces/` and see exactly what was planned, what got done, what's in flight, and what was cancelled — without spelunking through git history.

## When to activate this skill

Activate proactively at the start of any development unit of work. Strong cues:

- User says "fix", "implement", "add", "build", "create", "refactor", "investigate", "plan", "design", "review"
- User describes a bug, feature, improvement, or upcoming phase of work
- User references an existing work item (e.g., "TASK-007", "the auth refactor", "that bug from yesterday")
- User asks "what's the status", "what's next", "what did we ship", "what's blocked"
- **Backlog cues** — the scope/type is unclear; you need to ask clarification questions first; user uses tentative language ("we should probably…", "at some point…", "not sure how but…")
- **Learn doc cues** — user answers a clarification question, explains how something works, or corrects a wrong assumption you made

**Skip the skill** only for: a single-line typo correction the user explicitly flags as trivial, a pure read-only question about existing code, or open-ended exploration. If you skip, mention briefly that you're skipping a Spaces entry and why.

## Folder layout

```
Spaces/
  index.json                          # auto-maintained manifest (run scripts/update_index.py)
  Backlog/
    BLG-001-rethink-invoice-export.json
  Plan/
    PLAN-001-new-reporting.json
  Epic/
    EPIC-001-phase-1-auth/
      epic.json
      tasks/
        TASK-001-add-login.json
        TASK-002-add-logout/
          task.json
          subtasks/
            SUB-001-form-component.json
  Bug/
    BUG-001-fix-sales-date.json
  Action/
    ACT-001-do-code-review.json
  Improvement/
    IMP-001-refactor-x.json
  Docs/
    DOC-001-how-auth-refresh-works.md
    DOC-002-invoice-numbering-rules.md
```

Rules:

- Top-level item with no sub-tasks: a single `.json` file (e.g. `BUG-001-fix-sales-date.json`).
- Item with sub-tasks: a folder containing `<type>.json` + a `subtasks/` folder.
- Epics always live in their own folder (they always contain children).
- Items at any state — **including `Closed` and `Cancelled`** — stay in place. There is no archive folder. That choice keeps history visible inline.
- If `Spaces/` does not yet exist in the project, create it as part of step 2 of the dev loop — don't ask permission for the folder, it's the prerequisite for everything below.
- `Spaces/` is **gitignored** — work-item JSON and `index.json` are local-only tracking, never staged or committed. If the project's `.gitignore` doesn't already exclude `Spaces/`, add it the first time `Spaces/` is created.

## Work types

| Type        | When to use                                                       | Initial status        | Final status        | Procedure          |
|-------------|-------------------------------------------------------------------|-----------------------|---------------------|--------------------|
| Backlog     | Unclear scope/type — needs clarification before becoming real work | Needs Clarification   | Converted/Cancelled | `references/backlog.md` |
| Action      | Non-coding work (code review, research, ops, sync)                | To Do                 | Closed              | `references/dev-loop.md` (adapt) |
| Bug         | Defect fix                                                        | To Do                 | Closed              | `references/dev-loop.md` |
| Doc         | System knowledge, clarifications, business rules                  | n/a (markdown)        | n/a                 | `references/docs.md` |
| Epic        | Phase-level container; holds multiple tasks/actions               | To Do                 | Closed              | `references/dev-loop.md` (adapt) |
| Improvement | Enhancement to an existing feature (same flow as Task)            | To Do                 | Closed              | `references/dev-loop.md` |
| Plan        | Strategic plan; gates downstream development                      | New Request           | Closed              | `references/workflows.md` |
| Task        | New coding work delivering a feature/change                       | To Do                 | Closed              | `references/dev-loop.md` |
| Sub-task    | Child of a Task; lighter-weight flow                              | To Do                 | Subtask Done        | `references/dev-loop.md` |

**Epic naming convention:** `Phase X: <description>`. Folder name: `EPIC-002-phase-2-reporting-v2/`.

**Action vs Task:** Action is for things that don't produce code (a code review of someone else's PR, research, an ops task). Task is for things that do.

Before transitioning ANY status, consult `references/workflows.md` and call `scripts/validate_transition.py` to confirm the move is legal. Illegal transitions are a sign you've misread the state machine — investigate, don't bypass.

## Branching model

All work happens on the **current branch** — no per-item worktrees, no per-item branches. Code-producing items (`task`, `bug`, `improvement`, `sub-task`) edit files in place in the main checkout and commit on whatever branch is checked out. The `branch` field captured in each `commits` entry records the branch at commit time so the chronology stays traceable.

This trades parallel-agent isolation for simplicity: only one work item is being implemented at a time, and the work-item JSON lives next to the code that changed.

## The canonical dev loop (Task / Bug / Improvement)

The seven steps in one breath: **plan → create → start → implement → update → handoff → branch on outcome**. Full procedure with every sub-step, validation rule, and edge case lives in **`references/dev-loop.md`** — read it before driving a real work item through the loop.

Adapt for other types:
- **Backlog** — see `references/backlog.md`. Different shape: create → clarify (Q&A) → convert to real item.
- **Action / Epic** — same skeleton but no `Coding`/`Code Review`/`Staging` stages; success path is `In Progress → Closed`.
- **Plan** — gated by CTO approval (`Accept`, `Approve Plan`). Never advance those transitions without explicit user confirmation.
- **Doc** — markdown, no workflow. See `references/docs.md`.
- **Sub-task** — lightweight workflow (`To Do → Subtask In Progress → Subtask Done`), no PR/Staging/Production stages.

## JSON schema

Full schema and field semantics in **`references/schema.md`**. Templates in `templates/<type>.json`. Required fields on every work item:

- `schema_version` (always `1` for now)
- `id`, `type`, `title`, `status`, `created_at`
- `verification_criteria` (array), `affected_files` (array), `solution_summary` (string)
- `status_history` (array)

Code-producing types (`bug`, `task`, `improvement`, `sub-task`) also require:

- `fix_attempts` (array; one entry per iteration)
- `automated_tests` (array; every `verification_criteria` entry backed by ≥1 passing test before handoff)

Recommended on code-producing types: `setup` (array of env/config/dependency prerequisites — e.g. "Add SECRET_KEY to .env", "Apply migration 0042"; see `references/schema.md` → "Setup entries").

Recommended on all types: `description`, `parent_id`, `plan_id`, `priority`, `tags`, `expected_outcomes`, `commits`, `decisions`, `started_at`, `completed_at`, `completed_by`, `cancelled_at`, `blocks`, `blocked_by`, `related_to`, `notes`.

`decisions` is a structured array (one entry per consequential choice — library, data shape, scoping call, cancellation). Each entry carries `topic`, `decision`, `rationale`, `alternatives`, `made_by`, and supersession links. Append as decisions happen, don't backfill. See `references/schema.md` → "Decisions entries".

`completed_by` is the model name that closed the item (e.g. `"Claude Opus 4.7"`, `"Claude Sonnet 4.6"`, `"DeepSeek"`, `"Minimax"`). Set it alongside `completed_at` when transitioning to a final non-cancelled status. Leave `null` for cancelled items.

## Commit rules

Full convention: **`references/commit-rules.md`**. Short version:

- Prefix exactly one of: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `perf:`, `build:`, `ci:`.
- Subject under 70 chars, imperative mood, no trailing period.
- Body references the work item: `Refs: TASK-001`.
- **No `Co-Authored-By: Claude` line.** This repo explicitly opts out. Overrides the Claude Code default.
- Always stage + propose the message. After the user confirms, run `git commit` yourself.
- `Spaces/` is gitignored — never stage it. After commit, just record the SHA in `commits` in the work-item JSON directly (no amend needed).

## Helper scripts

All scripts live under this skill's `scripts/` folder, installed at `~/.claude/skills/project-spaces/`. Invoke them with the project root as the first argument.

```bash
# next ID for a type (prints e.g. "TASK-008")
python ~/.claude/skills/project-spaces/scripts/next_id.py <project-root> <type>

# validate a status transition (exit 0 = legal, non-zero with message = illegal)
python ~/.claude/skills/project-spaces/scripts/validate_transition.py <project-root> <type> "<from>" "<to>"

# validate a single work-item JSON file (or all of them if no path given)
python ~/.claude/skills/project-spaces/scripts/validate_item.py <project-root> [path-to-item.json]

# rewrite Spaces/index.json by walking the tree (also collects warnings inline)
python ~/.claude/skills/project-spaces/scripts/update_index.py <project-root>

# serve the shared browser preview UI for a project (see "Preview UI" below)
python ~/.claude/skills/project-spaces/scripts/preview.py [spaces-path]
```

If a script doesn't exist at the expected path, you may be running an older copy of the skill — bail and ask the user to update.

## Preview UI

The preview UI is **shared across every project**. It's a React 18 + TypeScript SPA (built with Vite), shipped prebuilt at `~/.claude/skills/project-spaces/preview/`. The maintainer iterates on the source in `~/.claude/skills/project-spaces/web/`; the runtime UI is the static `preview/` directory. `scripts/preview.py` starts a local HTTP server that overlays:

- `/preview/*` → the skill's `preview/` folder (the SPA + assets)
- `/api/index`, `/api/status`, `/api/file?path=...` → live data from the project's `Spaces/`

The Python server also serves `preview/index.html` for any unmatched `/preview/*` path, so deep links like `/preview/items/TASK-007` survive a hard refresh (React Router takes over client-side).

One UI, any project, zero per-project setup.

**The user runs the script themselves** — never auto-launch a server. The canonical form is: run by full path from anywhere, pass the project's Spaces folder as an explicit argument.

```bash
python ~/.claude/skills/project-spaces/scripts/preview.py /path/to/project/Spaces
```

The script prints `http://127.0.0.1:8765/preview/`. The user clicks the link.

Convenience: if the argument is omitted, the script uses `./Spaces` from the cwd if it exists, else the cwd itself — but for clarity prefer the explicit form above.

The UI has 9 views:

- **Dashboard** — KPI cards, donut chart of statuses, type/priority/activity/velocity charts, 26-week activity heatmap, recently-closed + recently-created lists
- **Items** — list (grouped by type) and sortable table, filter chips (type/status/priority/tag), item detail with description, relationships, child items, tags, backlog Q&A, intended type, verification criteria, expected outcomes, automated tests, fix attempts, affected files, solution summary, commits, status history, decisions, notes, plan body, approval
- **Gantt** — timeline with week/month/quarter zoom, today line, parent grouping, items without dates listed at the bottom
- **Graph** — force-directed layout (parent_id + plan_id edges) with type filter chips
- **Calendar** — month grid showing items by `started_at` / `completed_at`
- **Tree** — Plan → Epic → Task → Sub-task hierarchy with progress bars (closed-children %)
- **Docs** — folder tree + markdown + right-rail TOC
- **Plans** — business plan tree + markdown
- **Warnings** — kind filter chips + list of validation warnings

Plus a global **command palette** (Cmd/Ctrl+K) that searches across items, docs, and plans; keyboard nav (↑↓, Enter, Esc); recent searches persisted in localStorage. Theme toggle cycles auto → light → dark.

The Python API is read-only by design — `POST`, `PUT`, `PATCH`, `DELETE` all return `405 Method Not Allowed`. Path traversal in `/api/file?path=...` is rejected (only paths under the spaces dir are accepted, and `Spaces/` prefix is stripped since index paths are project-root-relative).

The UI is read-only — it never writes back. If `index.json` is missing or stale, prompt the user to run `update_index.py` first.

## Things to avoid

- Don't create entries for trivial work (typo fix, single-line tweak, exploratory questions).
- Don't create a real work item (Task/Bug/etc.) when the scope or type isn't clear yet — create a Backlog item first.
- Don't transition a Backlog item to `Ready` while any `clarification_questions` entry still has `answer: null`.
- Don't skip writing a Doc when the user answers a clarification question or explains the system — that knowledge disappears from context otherwise.
- Don't combine multiple topics in one Doc file. One doc = one piece of knowledge.
- Don't skip `status_history` — it's the audit log.
- Don't transition status without running the validator. Illegal transitions usually mean you've misunderstood the current state.
- Don't commit without explicit confirmation. Propose the message first; run `git commit` only after the user approves.
- Don't stage or commit anything under `Spaces/` — it's gitignored. Just edit the JSON locally and record the SHA in `commits` after the user's commit lands.
- Don't add `Co-Authored-By` lines.
- Don't move closed/cancelled items to an archive folder — they stay in place.
- Don't invent new statuses. If the state machine doesn't fit, surface it to the user and edit `workflows.json` deliberately rather than hacking around it.
- Don't fast-forward through workflow stages (`Coding → Closed` for a Task is wrong — it must walk through Code Review, Staging, etc., as those events actually happen).
- Don't create per-item branches or git worktrees. All work happens on the current branch; if the user wants a separate branch they'll create it themselves.
