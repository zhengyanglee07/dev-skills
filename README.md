# Project Spaces

A Claude Code skill that turns ad-hoc development into a paper trail. Every meaningful unit of work — bugs, features, refactors, sub-tasks, plans, even non-coding actions — gets captured as a versioned JSON work-item under `Spaces/` at your project root, with a strict per-type state machine that drives the dev loop from **intent → file → implement → test → commit**.

The point: a future you (or a teammate, or a CTO) can open `Spaces/` and see exactly what was planned, what got done, what's in flight, and what was cancelled — without spelunking through git history.

The skill ships with a **shared browser preview UI** — one React SPA that reads any project's `Spaces/` and renders dashboards, item detail, Gantt, graph, calendar, tree, docs, and plans. One UI, every project, zero per-project setup.

---

## Quick start

```bash
# 1. Install the skill into your Claude Code skills folder
#    (clone this repo or copy the contents to ~/.claude/skills/project-spaces/)

# 2. Start a Claude Code session inside any project.
#    The skill activates automatically when you begin non-trivial dev work.

# 3. Use the /project-spaces slash command to invoke it explicitly.
```

The skill is meant to be activated **proactively** — but you can also drive it explicitly with the slash command:

```
/project-spaces Plan for the new auth refactor
/project-spaces Fix the date formatting bug in Sales exports
/project-spaces Implement dark mode
/project-spaces Refactor the invoice export pipeline
/project-spaces Investigate why staging is slow
/project-spaces Add a login screen
/project-spaces Review the open PR
```

You can also reference an existing work item by ID:

```
/project-spaces What's the status of TASK-007?
/project-spaces Mark BUG-003 as in progress
/project-spaces Walk me through EPIC-002
```

---

## Sample prompts

These are the kinds of requests the skill activates on. Use them as a `/project-spaces` slash command or just say them naturally — the skill recognises the cues.

| Say this… | The skill creates… |
|---|---|
| `/project-spaces Plan for the Q3 reporting rewrite` | A `Plan` (gated by CTO approval) |
| `/project-spaces Fix the off-by-one in pagination` | A `Bug` |
| `/project-spaces Add SSO via Google` | A `Task` |
| `/project-spaces Refactor the caching layer` | An `Improvement` |
| `/project-spaces Investigate why deploys are slow` | A `Backlog` (scope unclear → clarify first) |
| `/project-spaces Review PR #42` | An `Action` (no code produced) |
| `/project-spaces Add a sub-task: write the form component` | A `Sub-task` under an existing `Task` |
| `/project-spaces Document how invoice numbering works` | A `Doc` (`Spaces/Docs/*.md`) |
| `/project-spaces What's blocking TASK-005?` | (Reads existing item, no creation) |

Backlog cues — tentative scope, fuzzy type — create a `Backlog` first, ask clarification questions, then convert to a real work item once the picture is clear.

---

## Folder layout

```
Spaces/                                  # gitignored — never committed
  index.json                             # auto-maintained manifest
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

- Items with no children → single `.json` file.
- Items with children → folder containing `<type>.json` + a `subtasks/` (or `tasks/`) folder.
- Epics always live in their own folder.
- Items in **any** state — including `Closed` and `Cancelled` — stay in place. No archive folder. History stays visible inline.
- `Spaces/` is gitignored. Commit SHAs are recorded in each item's `commits` array after the commit lands.

---

## Work types at a glance

| Type        | When to use                                                       | Initial status        | Final status        |
|-------------|-------------------------------------------------------------------|-----------------------|---------------------|
| Backlog     | Unclear scope/type — clarify first                                | Needs Clarification   | Converted/Cancelled |
| Action      | Non-coding work (review, research, ops)                           | To Do                 | Closed              |
| Bug         | Defect fix                                                        | To Do                 | Closed              |
| Doc         | System knowledge / clarifications / business rules                | n/a (markdown)        | n/a                 |
| Epic        | Phase-level container; holds tasks/actions                        | To Do                 | Closed              |
| Improvement | Enhancement to an existing feature                                | To Do                 | Closed              |
| Plan        | Strategic plan; gates downstream development                      | New Request           | Closed              |
| Task        | New coding work delivering a feature/change                       | To Do                 | Closed              |
| Sub-task    | Child of a Task; lighter-weight flow                              | To Do                 | Subtask Done        |

Full state machines live in `workflows.json` and `references/workflows.md`. Always run `validate_transition.py` before moving status — illegal transitions usually mean you've misread the state machine.

---

## The dev loop (Task / Bug / Improvement)

Seven steps: **plan → create → start → implement → update → handoff → branch on outcome**.

Full procedure with every sub-step, validation rule, and edge case lives in **`references/dev-loop.md`**. Read it before driving a real work item through the loop.

Adapt for other types:
- **Backlog** — `references/backlog.md`. Create → clarify (Q&A) → convert.
- **Action / Epic** — same skeleton, no `Coding` / `Code Review` / `Staging` stages.
- **Plan** — gated by CTO approval (`Accept`, `Approve Plan`).
- **Doc** — markdown only, no workflow. See `references/docs.md`.
- **Sub-task** — lightweight (`To Do → Subtask In Progress → Subtask Done`).

---

## Preview UI (browser)

The preview UI is **shared across every project** — a React 18 + TypeScript SPA built with Vite, shipped prebuilt at `~/.claude/skills/project-spaces/preview/`. `scripts/preview.py` starts a local HTTP server that overlays the SPA with live reads from your project's `Spaces/`.

**You run the script yourself** — never auto-launch a server. From your project root:

```bash
python ~/.claude/skills/project-spaces/scripts/preview.py Spaces
```

That prints a URL like `http://127.0.0.1:8765/preview/` — click it to open the UI in your browser. The script is read-only by design (`POST` / `PUT` / `PATCH` / `DELETE` all return `405`), and rejects path traversal in `/api/file?path=...`.

For clarity, the canonical form uses the absolute path to `Spaces`:

```bash
python ~/.claude/skills/project-spaces/scripts/preview.py /path/to/project/Spaces
```

Other useful flags:

```bash
# Bind to a stable port (otherwise the OS picks a free one)
python ~/.claude/skills/project-spaces/scripts/preview.py Spaces --port 8765

# Localhost only (default binds 0.0.0.0 — reachable from your LAN)
python ~/.claude/skills/project-spaces/scripts/preview.py Spaces --host 127.0.0.1

# Print an `open` / `xdg-open` one-liner for the URL
python ~/.claude/skills/project-spaces/scripts/preview.py Spaces --open
```

### What you get

Nine views:

- **Dashboard** — KPIs, status donut, type/priority/activity/velocity charts, 26-week activity heatmap, recently-closed + recently-created lists
- **Items** — list (grouped by type) and sortable table, filter chips, item detail with description, relationships, children, tags, backlog Q&A, intended type, verification criteria, expected outcomes, automated tests, fix attempts, affected files, solution summary, commits, status history, decisions, notes, plan body, approval
- **Gantt** — timeline with week/month/quarter zoom, today line, parent grouping, undated items at the bottom
- **Graph** — force-directed layout (`parent_id` + `plan_id` edges) with type filter chips
- **Calendar** — month grid showing items by `started_at` / `completed_at`
- **Tree** — Plan → Epic → Task → Sub-task hierarchy with progress bars
- **Docs** — folder tree + markdown + right-rail TOC
- **Plans** — business plan tree + markdown
- **Warnings** — validation warnings with kind filter chips

Plus a global **command palette** (`Cmd/Ctrl+K`) that searches items, docs, and plans; keyboard nav (↑↓, Enter, Esc); recent searches persisted in `localStorage`. Theme toggle cycles auto → light → dark.

If `Spaces/index.json` is missing or stale, run `scripts/update_index.py` first — the UI is read-only.

---

## Helper scripts

All scripts live in this skill's `scripts/` folder. Invoke with the project root as the first argument.

```bash
# next ID for a type (prints e.g. "TASK-008")
python ~/.claude/skills/project-spaces/scripts/next_id.py <project-root> <type>

# validate a status transition (exit 0 = legal, non-zero with message = illegal)
python ~/.claude/skills/project-spaces/scripts/validate_transition.py <project-root> <type> "<from>" "<to>"

# validate a single work-item JSON file (or all of them if no path given)
python ~/.claude/skills/project-spaces/scripts/validate_item.py <project-root> [path-to-item.json]

# rewrite Spaces/index.json by walking the tree (also collects warnings inline)
python ~/.claude/skills/project-spaces/scripts/update_index.py <project-root>

# serve the shared browser preview UI (see "Preview UI" above)
python ~/.claude/skills/project-spaces/scripts/preview.py [spaces-path]
```

---

## Commit rules (short version)

Full convention: **`references/commit-rules.md`**.

- Prefix exactly one of: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `perf:`, `build:`, `ci:`.
- Subject under 70 chars, imperative mood, no trailing period.
- Body references the work item: `Refs: TASK-001`.
- **No `Co-Authored-By: Claude` line.** This repo explicitly opts out.
- Always stage + propose the message. After the user confirms, run `git commit` yourself.
- `Spaces/` is gitignored — never stage it. After commit, record the SHA in `commits` in the work-item JSON directly (no amend needed).

---

## Things to avoid

- Don't create entries for trivial work (typo fix, single-line tweak, exploratory questions).
- Don't create a real work item when scope/type isn't clear yet — create a `Backlog` first.
- Don't transition a `Backlog` item to `Ready` while any `clarification_questions` entry still has `answer: null`.
- Don't skip writing a `Doc` when the user explains the system — that knowledge disappears from context otherwise.
- Don't combine multiple topics in one `Doc` file. One doc = one piece of knowledge.
- Don't skip `status_history` — it's the audit log.
- Don't transition status without running the validator.
- Don't commit without explicit confirmation.
- Don't stage or commit anything under `Spaces/` — it's gitignored.
- Don't add `Co-Authored-By` lines.
- Don't move closed/cancelled items to an archive folder — they stay in place.
- Don't invent new statuses. Surface it and edit `workflows.json` deliberately.
- Don't fast-forward through workflow stages (`Coding → Closed` for a Task is wrong — it must walk through Code Review, Staging, etc.).
- Don't create per-item branches or git worktrees. All work happens on the current branch.

---

## Repo layout

```
.
├── SKILL.md                 # the skill definition (what Claude Code reads)
├── workflows.json           # state machines per work-item type
├── README.md                # you are here
├── templates/               # JSON templates per type (task, bug, plan, …)
├── references/              # deep-dive docs
│   ├── backlog.md
│   ├── commit-rules.md
│   ├── dev-loop.md
│   ├── docs.md
│   ├── schema.md
│   └── workflows.md
├── scripts/                 # Python helpers (validator, ID generator, preview server, …)
│   ├── _common.py
│   ├── next_id.py
│   ├── preview.py
│   ├── update_index.py
│   ├── validate_item.py
│   └── validate_transition.py
├── preview/                 # built React SPA (the runtime preview UI)
└── web/                     # source for the React SPA (the maintainer iterates here)
```

---

## License

MIT (or your preferred license — adjust as needed).