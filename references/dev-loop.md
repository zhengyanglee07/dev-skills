# The development loop (Task / Bug / Improvement)

This is the canonical loop. Adapt for other types using `workflows.md`. SKILL.md gives you the headline; this file is the full procedure.

## 1. Plan first if appropriate

If the work is large, strategic, or affects multiple parts of the codebase, check for a Plan. Rules:

- If a relevant Plan exists and is **`Approved`**, proceed and set `plan_id` on the work item.
- If a relevant Plan exists but is **not `Approved`**, warn the user once: "Plan PLAN-XXX is in `<status>`, not Approved. Proceeding anyway?" Then proceed if they confirm.
- If no relevant Plan exists and the work is small (bug fix, isolated improvement, one-off action), skip planning entirely.
- Plans only start moving past `New Request` after CTO approval (transition `Accept`). Don't put yourself in the CTO's shoes — surface it to the user.

## 2. Create the work-item file

- Pick the right type. If unsure, ask once. Default for "implement X" → Task; "fix X" → Bug; "research/review X" → Action; "improve X" → Improvement.
- Allocate the next ID: `python ~/.claude/skills/project-spaces/scripts/next_id.py <project-root> <type>`.
- Place the file in the correct folder. If it's a child of an Epic/Task, set `parent_id` and nest it under the parent's folder.
- Fill in: `id`, `type`, `title`, `status` (initial state per workflow), `created_at` (ISO-8601 UTC), `description`, `verification_criteria`.
- Initialize `affected_files: []` and `solution_summary: ""` — they get populated during step 5.
- Initialize `status_history` with one entry: `{"from": null, "to": "<initial>", "at": "<now>", "transition": "create"}`.
- **`expected_outcomes`** — scan the user's request for any concrete expected values, amounts, or results ("should return 42 items", "total should be $500", "must run in under 200 ms"). Record each as an entry. Leave `actual`, `met`, and `verified_at` null at creation. If the user states none, initialize as `[]`. See `schema.md` → "Expected outcomes".
- **`setup`** — scan the user's request for prerequisites needed to run, build, or test this work (env vars / secrets like `SECRET_KEY`, migrations, services to start, packages to install, feature flags). Record each as an entry with `done: false`. If the user states none, initialize as `[]`. See `schema.md` → "Setup entries".

See `schema.md` for full field reference and `templates/<type>.json` for ready-to-copy starting points.

## 3. Transition status as you start work

For Task/Bug/Improvement: move `To Do` → `Coding` via the `Start Coding` transition. **Always validate transitions** using `scripts/validate_transition.py` before changing `status`. Append every transition to `status_history`. Set `started_at` on the first transition out of the initial state.

## 4. Implement

Edit code in the current checkout — everything happens on whatever branch is checked out. Keep a running list of every file you touch — you'll record it in the next step.

Also open a **fix-attempt entry** as soon as you start a discrete attempt at solving the problem (this matters most for Bugs, but applies to Task/Improvement iteration too). Append to `fix_attempts` with `attempt: <next>`, `started_at: <now>`, your `hypothesis` and intended `approach`. Leave `ended_at`, `outcome`, and `failure_reason` blank until step 7. See `schema.md` → "Fix attempts" for the full shape.

Record consequential choices in **`decisions`** as they happen — picking a library, choosing a data shape, deferring an edge case, deciding to abandon an approach. Each entry needs `topic`, `decision`, `rationale`, `alternatives`, and `made_by`. Don't wait until the end; rationale degrades fast. See `schema.md` → "Decisions entries".

## 5. Update the work-item file

Before handing off to the user for testing, fill in:

- `affected_files` — every file you edited, added, or removed (production code AND test files).
- `solution_summary` — a few sentences describing what changed and why.
- Confirm each entry in `verification_criteria` is now satisfiable.
- **`automated_tests`** — write or update at least one automated test per `verification_criteria` entry, then run them. Each test entry must have `status: "passing"` and `last_result: "pass"` with a fresh `last_run_at` from this iteration. Use the project's existing test framework; if none exists, stop and raise it with the user. Skipped entries (`status: "skipped"`) are only allowed for criteria that are fundamentally not automatable, with a `notes` justification. See `schema.md` → "Automated tests".
- **`expected_outcomes`** — for every entry the user stated at creation, fill in `actual` (the observed value), set `met: true/false`, and record `verified_at`. If an outcome cannot yet be measured (depends on live data), leave `met: null` and explain in `notes`.

If any required test is missing, failing, or stale, do NOT hand off — finish or fix it first.

## 6. Hand off to the user for testing

Before handing off, confirm every `setup` entry with `required: true` has `done: true`. If any required setup is still pending, surface the blocker to the user first — don't ask them to test against an environment that can't run the code.

Tell the user exactly what to test, mapping their actions to the verification criteria. Make it as low-friction as possible (URL to open, command to run, button to click). Also surface the automated test command(s) from `automated_tests` so the user can re-run the proof themselves.

## 7. Branch on the test outcome

### 7a. Tests pass

1. Close out the current `fix_attempts` entry: set `ended_at: <now>`, `outcome: "fixed"`, leave `failure_reason` empty, optionally add a `lesson`.
2. Set `completed_at` on the work item.
3. Transition status to the next stage per the workflow. For Bug/Task/Improvement, success typically chains: `Coding → Code Review → Staging → Ready For Deploy → Production → Closed`. Move one step per real-world event — don't fast-forward through stages that haven't actually happened. For Action/Epic, success goes directly: `In Progress → Closed`.
4. Update the Spaces JSON with all changes (status, `solution_summary`, `affected_files`, `completed_at`, etc.) but leave `commits: []` — the SHA isn't known yet.
5. Stage only the code files with `git add` — `Spaces/` is gitignored and never staged.
6. Propose a commit message following `commit-rules.md`. **Do NOT commit until the user confirms the message.** Once they approve, run `git commit` yourself.
7. Immediately after the commit lands, run:
   ```bash
   git log -1 --format="%H"
   git log -1 --format="%h"
   git log -1 --format="%cI"
   git log -1 --format="%B"
   git rev-parse --abbrev-ref HEAD
   ```
   Append the `commits` entry to the work-item JSON directly — no `git add`/amend needed since `Spaces/` isn't tracked. The `branch` field on the commit entry records whatever branch was checked out at commit time.
8. Run `scripts/update_index.py` to refresh `Spaces/index.json`.
9. Don't push, merge, or switch branches on the agent's own initiative — those are shared-state actions, leave them to the user.

### 7b. Tests fail

1. Stay in the current status. Don't transition.
2. Update the relevant `automated_tests` entries: set `status: "failing"`, `last_result: "fail"`, refresh `last_run_at`. If a failure surfaced a missing criterion, add the criterion AND a new test for it.
3. Update any `expected_outcomes` entries whose `actual` value now conflicts with `expected`: set `met: false`, record `actual`, and refresh `verified_at`.
4. Close out the current `fix_attempts` entry: set `ended_at: <now>`, `outcome: "failed"` (or `"partial"` if some criteria now pass), and write a concrete `failure_reason` from the user's feedback. Optionally add a `lesson` so attempt N+1 doesn't repeat the same mistake.
5. Open a **new** `fix_attempts` entry for the next attempt (per step 4) with a fresh `hypothesis` and `approach`. Do not edit the previous attempt's record after closing it — it's the audit trail of what was tried.
6. Iterate. Update `solution_summary` and `affected_files` cumulatively as you go.
7. Re-test (both automated tests and manual handoff). Loop until tests pass, then proceed with 7a.
8. **3-strike checkpoint:** if you're about to open attempt #4 (i.e., three consecutive `failed` attempts are already in `fix_attempts`), STOP. Summarize all prior attempts to the user and ask how to proceed (keep iterating, change approach, re-scope, escalate, or cancel). Record the outcome as a `decisions` entry (`topic: "3-strike checkpoint"`, alternatives = the options you offered, `rationale` = what tipped the user's call) before continuing. Capture any user feedback that doesn't fit the decision frame as a `notes` entry alongside it.
9. If the user explicitly abandons the work, transition to `Cancelled` (which is legal from any state), set `cancelled_at`, close the open `fix_attempts` entry with `outcome: "failed"` and a `failure_reason` referencing the cancellation, and propose a commit explaining the cancellation in the body.

## Writing good `verification_criteria`

Criteria should let a third person verify pass/fail without asking you. Plain bullets work best; one observable behavior per bullet. **Each criterion will be backed by at least one entry in `automated_tests` (see schema), so phrase it in a way a test can actually assert against.**

Good:
```json
"verification_criteria": [
  "Sales date input is disabled on the Create form",
  "On opening the Create form, Sales date is pre-filled with today's date in YYYY-MM-DD format",
  "Submitting the form persists today's date even if the user never touched the field"
]
```

Bad: `"works correctly"`, `"looks good"`, `"no regressions"`.

Why this matters: vague criteria let bugs slip through testing because nobody knows what "works" means. Concrete criteria make it obvious when something isn't done.
