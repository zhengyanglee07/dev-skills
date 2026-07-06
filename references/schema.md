# Work-item JSON schema

Every work item in `Spaces/` is a JSON file conforming to the schema below. Templates for each type live in `templates/<type>.json`.

## Top-level shape

```json
{
  "schema_version": 1,
  "id": "TASK-001-disable-sales-date",
  "type": "task",
  "title": "Disable sales-date field and default to today on create",
  "status": "To Do",
  "created_at": "2026-05-16T08:14:22Z",

  "description": "Markdown body describing the work in full.",
  "verification_criteria": [
    "Sales date input is disabled on the Create form",
    "On opening the Create form, Sales date is pre-filled with today's date"
  ],
  "affected_files": [],
  "solution_summary": "",

  "parent_id": null,
  "plan_id": null,
  "blocks": [],
  "blocked_by": [],

  "priority": "medium",
  "tags": ["frontend", "forms"],

  "started_at": null,
  "completed_at": null,
  "cancelled_at": null,

  "status_history": [
    {"from": null, "to": "To Do", "at": "2026-05-16T08:14:22Z", "transition": "create"}
  ],

  "fix_attempts": [],
  "automated_tests": [],

  "notes": []
}
```

## Fields

### Required on every type

| Field                   | Type      | Notes                                                                 |
|-------------------------|-----------|-----------------------------------------------------------------------|
| `schema_version`        | integer   | Always `1` for now. Bump only if the schema gains a breaking change.  |
| `id`                    | string    | `TYPE-NNN-slug`. See "ID format" below.                               |
| `type`                  | string    | One of: `action`, `backlog`, `bug`, `epic`, `improvement`, `plan`, `task`, `sub-task`. (`doc` is markdown, not JSON.) |
| `title`                 | string    | Short human-readable title.                                           |
| `status`                | string    | Must be a valid status for this type per `workflows.json`.            |
| `created_at`            | string    | ISO-8601 UTC timestamp (e.g. `2026-05-16T08:14:22Z`).                 |
| `status_history`        | array     | At least one entry (the `create` transition). Append on every change. |

### Required on most types (all except `backlog`)

| Field                   | Type      | Notes                                                                 |
|-------------------------|-----------|-----------------------------------------------------------------------|
| `verification_criteria` | array     | Array of strings. Concrete, observable. See `dev-loop.md`.           |
| `affected_files`        | array     | Array of repo-relative file paths. Empty at creation, filled later.   |
| `solution_summary`      | string    | Empty at creation. Filled during/after implementation.                |

Backlog items don't have these fields — verification work for a Backlog item is "all `clarification_questions` answered", not a list of observable criteria. See `backlog.md` for the Backlog flow.

### Required on code-producing types (`bug`, `task`, `improvement`, `sub-task`)

| Field             | Type           | Notes                                                                                              |
|-------------------|----------------|----------------------------------------------------------------------------------------------------|
| `fix_attempts`    | array          | Empty at creation. Append one entry per iteration. See "Fix attempts" below.                       |
| `automated_tests` | array          | Empty at creation. Every `verification_criteria` entry must be backed by ≥1 passing test before leaving `Coding`. See "Automated tests" below. |

Container/non-coding types (`action`, `epic`, `plan`, `backlog`) do not include these fields. They don't iterate on code, so the audit trail isn't meaningful.

### Recommended on code-producing types (`bug`, `task`, `improvement`, `sub-task`)

| Field   | Type  | Notes                                                                                                            |
|---------|-------|------------------------------------------------------------------------------------------------------------------|
| `setup` | array | Environment / config / dependency prerequisites needed before the work can be run or tested. Empty `[]` if none. See "Setup entries" below. |

### Recommended on most types

| Field               | Type            | Notes                                                                  |
|---------------------|-----------------|------------------------------------------------------------------------|
| `description`       | string (md)     | Long-form description; markdown OK.                                    |
| `parent_id`         | string \| null  | ID of parent Epic (for Task/Action/Improvement) or parent Task (for Sub-task). |
| `plan_id`           | string \| null  | ID of Plan this work item executes against, if any.                    |
| `priority`          | string          | `low` \| `medium` \| `high` \| `urgent`. Default `medium`.             |
| `tags`              | array           | Free-form tags for filtering.                                          |
| `expected_outcomes` | array           | User-supplied concrete expected values/amounts/results. See "Expected outcomes" below. Omitted on `backlog` items. |
| `started_at`        | string \| null  | ISO timestamp of first non-initial transition.                         |
| `completed_at`      | string \| null  | ISO timestamp set when entering a Closed-family final status. Backlog uses `converted_at` instead. |
| `completed_by`      | string \| null  | Model name that drove the item to its final (non-cancelled) status (e.g. `"Claude Opus 4.7"`, `"Claude Sonnet 4.6"`, `"DeepSeek"`, `"Minimax"`). Set alongside `completed_at`. Null at creation and for cancelled items. |
| `cancelled_at`      | string \| null  | ISO timestamp set when entering `Cancelled`.                           |
| `blocks`            | array           | IDs of items this blocks.                                              |
| `blocked_by`        | array           | IDs of items that must close before this can start.                    |
| `related_to`        | array           | IDs of related items (general "see also" — not blocks/blocked-by, not parent/child). Use for cross-references between work items that share context but neither blocks the other. |
| `commits`           | array           | Commit records linked to this work item. See "Commits" below. Append after every `git commit`. |
| `decisions`         | array           | Structured record of decisions made for this work item. See "Decisions" below. Append one entry per consequential choice. |
| `notes`             | array           | Free-form audit log of inline notes. See "Notes" below.                |

## ID format

`TYPE-NNN-slug` where:

- `TYPE` is one of: `ACT` (action), `BLG` (backlog), `BUG`, `DOC` (doc), `EPIC`, `IMP` (improvement), `PLAN`, `TASK`, `SUB` (sub-task).
- `NNN` is a zero-padded sequence number, globally unique within the type. The next ID is allocated by `scripts/next_id.py`.
- `slug` is a short kebab-case description of the work. Keep it under ~50 chars. The slug is not load-bearing for lookups — `index.json` uses the full ID.

Examples:
- `TASK-001-disable-sales-date`
- `BUG-014-fix-csv-export-encoding`
- `EPIC-002-phase-2-reporting-v2`
- `SUB-007-login-form-component`

## `status_history` entries

Every transition appends an entry:

```json
{
  "from": "Coding",
  "to": "Code Review",
  "at": "2026-05-16T11:42:08Z",
  "transition": "Submit PR",
  "note": "Optional context for why the transition happened."
}
```

The initial `create` entry has `from: null`. Use the exact `label` from `workflows.json` for `transition` — this is what `validate_transition.py` checks.

## `expected_outcomes` entries

Capture the user's exact expected values, amounts, or results up front — before implementation begins. This is distinct from `verification_criteria` (which describes *how to observe* a behavior) and from `automated_tests` (which mechanically prove correctness). `expected_outcomes` is about *what specific value the user told you to expect*, so that after implementation you can compare actual vs. expected and record whether each expectation was met.

Populate this array at creation time whenever the user states a concrete expected result. Leave it empty if the user gives no quantitative or specific expectations.

```json
{
  "id": "EO-1",
  "label": "total invoice count",
  "expected": "42",
  "actual": null,
  "met": null,
  "verified_at": null,
  "notes": ""
}
```

Field semantics:

| Field         | Type             | Notes                                                                                           |
|---------------|------------------|-------------------------------------------------------------------------------------------------|
| `id`          | string           | Stable local ID: `EO-1`, `EO-2`, … Unique within this work item.                               |
| `label`       | string           | Short description of what is being measured (e.g. `"total invoice count"`, `"response time"`). |
| `expected`    | string           | The value the user stated (free-form, e.g. `"42"`, `"< 2 seconds"`, `"$500.00"`).              |
| `actual`      | string \| null   | The observed value after implementation. Null until measured.                                   |
| `met`         | boolean \| null  | `true` when `actual` satisfies `expected`; `false` when it doesn't; `null` until verified.     |
| `verified_at` | string \| null   | ISO-8601 UTC timestamp when `actual` was captured and `met` was set.                            |
| `notes`       | string           | Optional context: how the value was measured, caveats, data source, etc.                        |

Rules:

- Add an entry any time the user says "I expect X", "the result should be Y", "it should return N items", "the amount should be Z", or any similar phrasing that names a specific expected value.
- Fill `actual` and `met` during step 5 of the dev loop (after implementation, before handoff). Don't leave `met: null` on handoff if the value is measurable.
- If an outcome turns out to be unmeasurable (e.g. depends on production data), record that in `notes` and leave `met: null` with an explanation.
- On test failure (step 7b), update any `expected_outcomes` entries whose `actual` now differs — this is part of the failure record.

Examples of things that warrant an `expected_outcomes` entry:

- "the total should be $500" → `label: "total amount"`, `expected: "$500"`
- "there should be 42 records" → `label: "record count"`, `expected: "42"`
- "the API should respond in under 200 ms" → `label: "API response time"`, `expected: "< 200 ms"`
- "error count must be 0" → `label: "error count"`, `expected: "0"`
- "the report should cover 3 months of data" → `label: "report date range"`, `expected: "3 months"`

## `setup` entries

Prerequisites required to actually run, build, or test the code for this work item. Capture things that aren't obvious from reading the code — secrets that must be added to `.env`, migrations that must be applied, services that must be running, packages that need installing, feature flags that need toggling. The point: a future you (or a teammate) can spin up the work without spelunking for missing config.

Populate this array at creation time when the prerequisite is already known, and append to it during implementation if new prerequisites surface. Mark each entry done as soon as it's confirmed in place.

```json
{
  "id": "SETUP-1",
  "instruction": "Add SECRET_KEY to .env",
  "category": "env",
  "required": true,
  "done": false,
  "done_at": null,
  "notes": ""
}
```

Field semantics:

| Field         | Type             | Notes                                                                                                  |
|---------------|------------------|--------------------------------------------------------------------------------------------------------|
| `id`          | string           | Stable local ID: `SETUP-1`, `SETUP-2`, … Unique within this work item.                                |
| `instruction` | string           | Concrete, actionable step (e.g. `"Add SECRET_KEY to .env"`, `"Run python manage.py migrate"`).        |
| `category`    | string           | One of: `env`, `secret`, `dependency`, `migration`, `service`, `feature_flag`, `data`, `other`.        |
| `required`    | boolean          | `true` if the work can't be tested/run without this; `false` for optional or nice-to-have steps.       |
| `done`        | boolean          | `true` once the step has been verifiably completed in the current environment.                        |
| `done_at`     | string \| null   | ISO-8601 UTC timestamp set alongside `done: true`. Null while pending.                                |
| `notes`       | string           | Optional context: where to find the secret, why it's needed, what command was run, etc.               |

Rules:

- Add an entry whenever the user mentions a prerequisite ("you'll need to add X to .env first", "this requires running the migration") or you discover one during implementation.
- Confirm with the user before marking `done: true` — don't assume the step ran successfully just because you proposed it.
- A `required: true` entry with `done: false` blocks handoff for testing (step 6 of the dev loop). Surface the blocker to the user first.
- Don't repeat instructions that are part of the project's standard onboarding (e.g. `npm install` in a Node project). Setup is for *this work item's* extras.
- Setup entries are advisory — they document what *must be in place*, not what *code is changing*. Code changes still go in `affected_files` and `solution_summary`.
- Never edit an entry's `instruction` after marking it `done: true` — at that point it's part of the audit trail. If the requirement changes, add a new entry.

## `commits` entries

Every `git commit` that contains work for this item gets recorded here. The point: anyone reading the work-item file can jump straight to the relevant commits without grepping git history.

Append an entry **after** the user has run `git commit` — retrieve the SHA with `git log -1 --format="%H"` (or `%h` for short SHA) and the timestamp with `git log -1 --format="%cI"`.

```json
{
  "sha": "a3f9c2e1b4d87650f1e2c3d4e5f6a7b8c9d0e1f2",
  "short_sha": "a3f9c2e",
  "message": "fix: disable sales-date field and default to today on create\n\nRefs: TASK-001",
  "committed_at": "2026-05-16T11:42:08Z",
  "branch": "main"
}
```

Field semantics:

| Field          | Type   | Notes                                                                              |
|----------------|--------|------------------------------------------------------------------------------------|
| `sha`          | string | Full 40-char commit SHA from `git log -1 --format="%H"`.                          |
| `short_sha`    | string | First 7 chars — for display. Derived from `sha`.                                  |
| `message`      | string | Full commit message (subject + body) from `git log -1 --format="%B"`. Trim trailing newlines. |
| `committed_at` | string | ISO-8601 UTC timestamp from `git log -1 --format="%cI"`.                          |
| `branch`       | string | Branch name at commit time from `git rev-parse --abbrev-ref HEAD`.                |

Rules:

- Append one entry per commit, in chronological order.
- Record commits that contain code files belonging to this work item. `Spaces/` itself is gitignored and never appears in a commit.
- If a work item spans multiple commits (e.g. intermediate commits during a long Coding phase, then a final commit after Code Review), each gets its own entry.
- Status-only transitions (e.g. "marked Deployed") only touch the Spaces JSON, which is gitignored — they produce no commit and get no `commits` entry.
- Never edit or delete a commit entry after writing it — it's a permanent pointer into git history.
- **Workflow**: commit the code (with `commits: []` still in the JSON), then read the SHA via `git log -1` and append the entry directly to the work-item JSON. No `git add`/amend needed since `Spaces/` isn't tracked.
- Run the `git log`/`git rev-parse` commands *after* the commit lands; do not pre-fill from the proposed message.

## `notes` entries

Free-form audit log for things that don't fit into status transitions: user feedback during test cycles, links to related discussions, transient blockers. Optional but useful.

```json
{
  "at": "2026-05-16T13:01:00Z",
  "kind": "user-feedback",
  "body": "User reported edge case: changing locale resets the date field. Need to handle."
}
```

Common `kind` values: `user-feedback`, `blocker`, `link`, `general`.

For consequential choices (which library to use, which approach to take, whether to ship a partial fix), use the dedicated `decisions` array below — it carries the rationale and alternatives, not just a sentence in a notes log.

## `decisions` entries

A structured record of every consequential decision made while planning, scoping, or implementing this work item. The point: when a teammate (or future you) asks *"why did we go with X instead of Y?"*, the answer lives in the work item itself — not in a Slack thread that's been archived, a PR comment that scrolled off, or "I think we talked about it once".

Append one entry **per decision**. A "decision" is a choice between concrete alternatives that locks in a direction — picking a library, picking a data shape, picking which edge case to support, picking whether to abandon an approach after N failed attempts, etc. Don't record self-evident micro-choices (variable names, file paths); reserve this for things a reviewer would reasonably second-guess.

```json
{
  "id": "DEC-1",
  "at": "2026-05-18T10:00:00Z",
  "topic": "Date library",
  "decision": "Use date-fns",
  "rationale": "moment.js is in maintenance mode; date-fns is tree-shakable and matches existing imports in src/utils/.",
  "alternatives": ["moment.js", "luxon", "dayjs"],
  "made_by": "user",
  "supersedes": null,
  "superseded_by": null
}
```

Field semantics:

| Field            | Type            | Notes                                                                                                  |
|------------------|-----------------|--------------------------------------------------------------------------------------------------------|
| `id`             | string          | Stable local ID: `DEC-1`, `DEC-2`, … Unique within this work item.                                    |
| `at`             | string          | ISO-8601 UTC timestamp when the decision was made.                                                     |
| `topic`          | string          | Short label of what is being decided (e.g. `"Date library"`, `"Migration order"`, `"Cancel work"`).   |
| `decision`       | string          | The choice that was made, in concrete terms.                                                           |
| `rationale`      | string          | Why this option won. Include the constraint, evidence, or trade-off that drove the call.              |
| `alternatives`   | array           | Other options that were considered and rejected. Empty `[]` if it was a forced/obvious choice.        |
| `made_by`        | string          | Who decided: `"user"`, `"agent"`, or a named stakeholder (e.g. `"CTO"`, `"@alice"`).                  |
| `supersedes`     | string \| null  | ID of a prior decision in this same work item that this one overrides. Null if this is the first take.|
| `superseded_by`  | string \| null  | ID of a later decision that overrides this one. Null while this decision still stands.                |

Rules:

- Record decisions **as they happen**, not retroactively. The rationale degrades fast.
- Append in chronological order. Don't edit a `decision` or `rationale` after it's been written — if the call changes, add a new entry, set its `supersedes` to the prior ID, and set `superseded_by` on the prior entry. This keeps the audit trail intact.
- `made_by` should reflect who actually made the call, not who proposed it. If the agent proposed X and the user agreed, `made_by` is `"user"`. If the user delegated ("you decide"), `made_by` is `"agent"`.
- A decision and its rationale belong together. An entry with empty `rationale` is almost never useful — if you can't articulate why, the decision probably isn't ready yet.
- Use `decisions` for choices; use `notes` for observations. "We decided to drop IE11 support — bundle size matters more than legacy reach" is a decision. "User reported the form flickers on slow networks" is a note.
- Decisions persist across status transitions. They are not cleared or archived when the work item closes — the closed item is the durable record.

Common situations that warrant a `decisions` entry:

- Choosing between libraries, frameworks, or services.
- Choosing a data shape, schema, or API contract when more than one was plausible.
- Choosing to defer an edge case ("out of scope for this task, file a follow-up").
- Choosing to abandon an approach after the 3-strike checkpoint in `dev-loop.md` (alongside the `notes` entry capturing the conversation, the *outcome* of that conversation goes here).
- Choosing to cancel or re-scope a work item.
- Choosing which of multiple failing tests to fix first when ordering matters.

## `fix_attempts` entries

A structured changelog of each iteration spent trying to fix/implement the work item. The point: when a bug takes more than one round-trip to nail, the JSON should tell the story of *which approaches were tried, why each failed, and which one finally worked* — so a future reader (or future you) doesn't repeat dead ends.

Append one entry **per attempt**, where an "attempt" = one cycle of (form a hypothesis → change code → hand off for testing → get a verdict).

```json
{
  "attempt": 1,
  "started_at": "2026-05-16T09:10:00Z",
  "ended_at": "2026-05-16T09:48:00Z",
  "hypothesis": "Date is being serialized as local time instead of UTC; fix by switching to toISOString().",
  "approach": "Replaced moment().format() with new Date().toISOString() in salesForm.js submit handler.",
  "changes": ["src/forms/salesForm.js"],
  "outcome": "failed",
  "failure_reason": "Date now stored correctly in DB but display layer still renders previous-day in PDT due to a separate render bug.",
  "lesson": "Persistence and display are two layers — fixing one without the other doesn't move the verification criteria."
}
```

Field semantics:

| Field             | Type            | Notes                                                                              |
|-------------------|-----------------|------------------------------------------------------------------------------------|
| `attempt`         | integer         | 1-indexed, monotonically increasing within this work item.                         |
| `started_at`      | string          | ISO-8601 UTC. When you began this attempt's investigation/coding.                  |
| `ended_at`        | string \| null  | ISO-8601 UTC. Set when the user reports a verdict (pass/fail).                     |
| `hypothesis`      | string          | What you believed was wrong / what you expected your change to do.                 |
| `approach`        | string          | Concrete summary of what you actually changed.                                     |
| `changes`         | array           | Files touched in *this attempt only* (subset of `affected_files`).                 |
| `outcome`         | string          | One of: `failed`, `partial`, `fixed`.                                              |
| `failure_reason`  | string          | When `outcome` is `failed` or `partial`: what went wrong, observed behavior, etc. Empty for `fixed`. |
| `lesson`          | string          | Optional. One-line takeaway so the next attempt doesn't repeat the same mistake.   |

Rules:

- The final attempt that actually fixes the issue must have `outcome: "fixed"` — that's the canonical record of "this is the approach that worked".
- An attempt is only `partial` when it provably moves *some* verification criteria from failing to passing while others still fail. Otherwise it's `failed`.
- If you bail and try a totally different angle without getting a user verdict, still close out the in-progress attempt with `outcome: "failed"` and a `failure_reason` explaining you abandoned it (e.g., "Realized mid-implementation this would break X; abandoned before user test."). Don't leave dangling open attempts.
- After **3 consecutive `failed` attempts**, stop and surface the situation to the user before opening attempt #4. Summarize what's been tried and ask whether to keep iterating, escalate, or re-scope. Record that conversation as a `notes` entry with `kind: "decision"`.

## `automated_tests` entries

Every code-producing work item (`bug`, `task`, `improvement`, `sub-task`) must ship with automated tests that mechanically prove the implementation matches the requirements. The point: `verification_criteria` answers *"how would a human know this works?"* — `automated_tests` answers *"how does CI know this still works six months from now?"* Each verification criterion must be backed by at least one automated test.

```json
{
  "id": "AT-1",
  "criterion_index": 0,
  "criterion": "Sales date input is disabled on the Create form",
  "test_file": "tests/forms/salesForm.test.tsx",
  "test_name": "disables sales date input on create form",
  "framework": "jest",
  "command": "npx jest tests/forms/salesForm.test.tsx -t 'disables sales date input on create form'",
  "status": "passing",
  "last_run_at": "2026-05-16T11:30:12Z",
  "last_result": "pass",
  "notes": ""
}
```

Field semantics:

| Field             | Type            | Notes                                                                                          |
|-------------------|-----------------|------------------------------------------------------------------------------------------------|
| `id`              | string          | Stable local ID, e.g. `AT-1`. Unique within this work item.                                    |
| `criterion_index` | integer         | Zero-based index into `verification_criteria` that this test covers.                           |
| `criterion`       | string          | Verbatim copy of the verification criterion text — kept inline so the test's intent is obvious.|
| `test_file`       | string          | Repo-relative path to the test file.                                                           |
| `test_name`       | string          | Exact `it(...)` / `test(...)` / function name in the test file.                                |
| `framework`       | string          | `jest`, `vitest`, `pytest`, `phpunit`, `playwright`, `cypress`, `go test`, etc.                |
| `command`         | string          | The exact shell command that runs *just this test* (or the smallest suite containing it).     |
| `status`          | string          | `not_written` \| `written` \| `passing` \| `failing` \| `skipped`.                             |
| `last_run_at`     | string \| null  | ISO-8601 UTC of the most recent run.                                                           |
| `last_result`     | string \| null  | `pass` \| `fail` \| `error` \| null (never run yet).                                           |
| `notes`           | string          | Optional. Why this test is skipped, framework quirks, flakiness caveats, etc.                  |

Rules:

- Coverage: every entry in `verification_criteria` must have at least one `automated_tests` entry pointing to it via `criterion_index`. A criterion with zero tests blocks the work item from leaving `Coding`.
- Use the project's existing test framework. Don't introduce a new one to satisfy this rule — if no framework exists, surface that to the user as a separate Improvement before continuing.
- A criterion that is *fundamentally not automatable* (e.g., "Designer signs off on the visual"), record one entry with `status: "skipped"` and a `notes` field explaining why automation isn't possible. This is the only legal escape hatch — use it sparingly.
- Status discipline: flip to `passing` only after you've actually executed `command` and observed it pass in this iteration. Re-run before each handoff to the user; stale `passing` is worse than honest `failing`.
- Test files belong in `affected_files` like any other touched file.

## Backlog-specific fields

A `backlog` item may additionally include:

```json
{
  "what_is_unclear": "Not sure if this is a frontend bug or a data issue — need to check the API response first.",
  "clarification_questions": [
    {
      "id": "CQ-1",
      "question": "Is the wrong value coming from the API, or is the UI transforming it incorrectly?",
      "asked_at": "2026-05-16T09:00:00Z",
      "answer": "The API returns the correct value; the UI is applying the wrong timezone offset.",
      "answered_at": "2026-05-16T09:15:00Z"
    }
  ],
  "intended_type": "bug",
  "converted_to": "BUG-004-fix-timezone-display",
  "converted_at": "2026-05-16T09:20:00Z"
}
```

Field semantics:

| Field                     | Type            | Notes                                                                                               |
|---------------------------|-----------------|-----------------------------------------------------------------------------------------------------|
| `what_is_unclear`         | string          | Free-form description of what's unknown and must be resolved before the work can be properly typed. |
| `clarification_questions` | array           | Ordered list of Q&A pairs. Append one entry per question. See shape below.                          |
| `intended_type`           | string \| null  | Best guess at the target type once clarified (`task`, `bug`, `improvement`, `action`, `epic`). Null if unknown. |
| `converted_to`            | string \| null  | ID of the work item created when this Backlog item was converted. Set before transitioning to `Converted`. |
| `converted_at`            | string \| null  | ISO-8601 UTC timestamp of conversion. Set alongside `converted_to`.                                 |

### `clarification_questions` entry shape

```json
{
  "id": "CQ-1",
  "question": "The question asked.",
  "asked_at": "2026-05-16T09:00:00Z",
  "answer": null,
  "answered_at": null
}
```

| Field         | Type            | Notes                                                          |
|---------------|-----------------|----------------------------------------------------------------|
| `id`          | string          | `CQ-1`, `CQ-2`, … Unique within this Backlog item.            |
| `question`    | string          | The exact question that needs answering.                       |
| `asked_at`    | string          | ISO-8601 UTC when the question was posed.                      |
| `answer`      | string \| null  | The answer received. Null until answered.                      |
| `answered_at` | string \| null  | ISO-8601 UTC when the answer was received. Null until answered.|

Rules:

- A Backlog item may not transition to `Ready` (via `Clarified`) while any `clarification_questions` entry still has `answer: null`. Resolve all questions first.
- `converted_to` must be set **before** calling `validate_transition.py` for the `Convert` transition.
- `converted_at` is set iff `status == "Converted"` (analogous to `completed_at` on other types).
- `fix_attempts` and `automated_tests` are present as empty arrays (schema uniformity) but are not used on Backlog items — they don't produce code.

## Plan-specific fields

A `plan` item may additionally include:

```json
{
  "plan_body": "Full plan document, markdown",
  "stakeholders": ["CTO", "Eng Lead"],
  "approved_by": null,
  "approved_at": null
}
```

`approved_by` / `approved_at` get filled when the Plan transitions to `Approved`.

## Validation

Universal (all types):

- Every field in "Required on every type" must be present.
- `type` must match the workflow type used for `status`.
- `status` must be a legal status for `type` per `workflows.json`.
- Every entry in `status_history` must reference a transition that exists in `workflows.json` for this type.
- `created_at <= status_history[0].at`.
- `cancelled_at` is set iff `status == "Cancelled"`.

For non-Backlog types:

- Every field in "Required on most types" must be present (`verification_criteria`, `affected_files`, `solution_summary`).
- `completed_at` is set iff `status ∈ final_statuses` and `status != "Cancelled"`.

For code-producing types (`bug`, `task`, `improvement`, `sub-task`):

- `fix_attempts` and `automated_tests` must be present as arrays (may be empty at creation).
- Once `status` has advanced past `Coding`, every entry in `verification_criteria` must be covered by at least one `automated_tests` entry whose `criterion_index` matches and whose `status` is `passing` or `skipped` (with a `notes` justification).
- `setup` is optional; if present it must be an array. Defaults to `[]` in templates.

For Backlog items:

- `clarification_questions` must be present as an array (may be empty).
- Transition to `Ready` (via `Clarified`) is blocked while any `clarification_questions` entry has `answer: null`.
- `converted_to` and `converted_at` must both be set iff `status == "Converted"`.

Run **`scripts/validate_item.py <project-root> [path]`** to check one file or all items. Run **`scripts/update_index.py`** to refresh the index and collect warnings inline under `warnings: [...]` in `index.json`.

## Versioning

`schema_version: 1` covers everything above. If the schema gains a breaking change, bump the version and write a migration note. Items at older versions remain valid — the validator should special-case them.
