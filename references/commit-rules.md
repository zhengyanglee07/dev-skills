# Commit rules

This project follows Conventional-Commits-style prefixes with a few project-specific tweaks.

## Format

```
<prefix>(<optional-scope>): <subject>

<optional body explaining the why>

Refs: <WORK-ITEM-ID>
```

## Prefixes

Pick exactly one. If multiple apply, pick the one that best describes the *primary* intent of the change.

| Prefix      | Use when                                                                  |
|-------------|----------------------------------------------------------------------------|
| `feat:`     | New user-visible functionality.                                            |
| `fix:`      | Bug fix.                                                                   |
| `chore:`    | Tooling, dependencies, config, housekeeping with no behavior change.       |
| `docs:`     | Documentation-only change.                                                 |
| `refactor:` | Internal restructure, no behavior change.                                  |
| `test:`     | Add/update tests only.                                                     |
| `style:`    | Formatting, whitespace, lint fixes.                                        |
| `perf:`     | Performance improvement.                                                   |
| `build:`    | Build system, package scripts.                                             |
| `ci:`       | CI configuration.                                                          |

## Subject line

- Imperative mood: "add", "fix", "remove" — not "added", "fixes", "removing".
- Under 70 characters.
- No trailing period.
- Lowercase first word after the prefix (unless it's a proper noun).

Good:

```
fix: disable sales-date field and default to today on create
feat(reports): add CSV export button with locale-aware dates
chore: bump react-query to 5.x
refactor(auth): extract token refresh into hook
```

Bad:

```
Fix Sales Date.                              ← title-case, trailing period, vague
Added a new CSV export button to the reports page so users can download data. ← past tense, too long
update stuff                                  ← no prefix, vague
```

## Body

Optional but encouraged when the why isn't obvious from the subject. Wrap at ~72 chars. Explain *why* — the *what* is in the diff.

```
fix: disable sales-date field and default to today on create

The sales-date input was editable, which let users backdate sales and
broke daily aggregates in the reporting pipeline. Disable the input
and default to today so the value can't drift.

Refs: BUG-014-fix-sales-date
```

## Work-item reference

Every commit related to a Spaces work item ends with a `Refs:` line:

```
Refs: TASK-001-disable-sales-date
```

If a single commit advances multiple work items, list them comma-separated:

```
Refs: TASK-001-disable-sales-date, BUG-014-fix-csv-export-encoding
```

If the work item has sub-tasks and this commit closes one, reference both:

```
Refs: TASK-002-add-logout, SUB-001-form-component
```

## What NOT to include

- **No `Co-Authored-By: Claude` line.** This project explicitly opts out. Claude Code's default would add one — strip it.
- **No "Generated with Claude Code" footer.** Same rule.
- **No emojis** in commit messages.
- **No raw status updates** in the message ("moved to Code Review") — that information lives in the Spaces JSON, not in git history.

## Branch

Commits land on **whatever branch is currently checked out** — there are no per-work-item branches or worktrees. The `branch` field on each `commits` entry in the work-item JSON records the result of `git rev-parse --abbrev-ref HEAD` at commit time, so the chronology stays traceable even if the user later switches branches.

Pushing, merging, and switching branches are shared-state actions — leave them to the user.

Sub-tasks commit on the same branch as their parent Task, with the sub-task ID in the `Refs:` line.

## Staging policy

Stage:
- The code files for the actual change.

Do **not** stage anything under `Spaces/` — it's gitignored (work-item JSON, `index.json`, the parent Epic's JSON, everything). Spaces is local-only tracking and never appears in a commit.

Do **not** include unrelated files (other work-in-progress, local dev artifacts like `.local_dev_*`, lock files unless the change actually touched dependencies).

When in doubt, run `git status` and `git diff --cached` to confirm what's staged before proposing the commit.

## Multi-step deployments

For work that walks the Bug/Task pipeline (Coding → Code Review → Staging → Ready For Deploy → Production → Closed), there is typically only **one commit** for the implementation — the one made when tests pass at step 7a of the dev loop. The later status transitions (Approve PR, Staging OK, Deployed, Stable) are recorded only in the Spaces JSON (gitignored) and never need their own commits unless they touch code (e.g., a hotfix from staging rejection).
