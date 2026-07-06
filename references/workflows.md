# Workflows reference

Each work type has its own state machine. The machine-readable form lives in `workflows.json` and is consumed by `scripts/validate_transition.py`. Edit `workflows.json` to change a workflow — the changes take effect immediately.

The diagrams below describe what each transition means in plain English. When in doubt, the JSON is the source of truth.

## Conventions

- `*` (in the `from` field of a transition) means **any non-terminal state**. The validator expands it dynamically.
- A transition's `label` is what you store in `status_history[*].transition` and what `validate_transition.py` accepts.
- "Final" statuses are listed in each workflow's `final_statuses`. Items in a final status are done — they can still receive a `Reopen` / `Reset` / `Cancel` transition if defined, but no normal forward progress.

---

## Backlog

Use to capture items that need clarification before they can become a real work item (Task, Bug, Improvement, Action, Epic, etc.). A Backlog item is a parking spot — it holds the intent and open questions until the team has the answers needed to define the work properly.

```
   Needs Clarification ──Clarified──▶ Ready ──Convert──▶ Converted
          ▲                  ▲          │
          │                  │          │ Back to Clarification
          │   Reopen         └──────────┘
          │
   Cancelled  ◀── Cancel (from any non-final state)
```

**Transitions:**

| Label                   | From                  | To                    | When to use                                                          |
|-------------------------|-----------------------|-----------------------|----------------------------------------------------------------------|
| `Clarified`             | Needs Clarification   | Ready                 | All open questions have been answered; enough info to convert.       |
| `Back to Clarification` | Ready                 | Needs Clarification   | New questions surfaced after marking ready.                          |
| `Convert`               | Ready                 | Converted             | After creating the real work item. Set `converted_to` first.         |
| `Cancel`                | any non-final         | Cancelled             | The item is no longer worth pursuing.                                |
| `Reopen`                | Cancelled             | Needs Clarification   | Changed mind; item is back in scope.                                 |

**Conversion protocol** (when transitioning `Ready → Converted`):

1. Decide the right target type (Task / Bug / Improvement / Action / Epic).
2. Create the new work item using the appropriate template and workflow.
3. Copy `description`, `tags`, `priority`, and any relevant `clarification_questions` answers into the new item.
4. Set `converted_to` on the Backlog item to the new item's ID.
5. Set `converted_at` to now.
6. Transition the Backlog item to `Converted` via `validate_transition.py`.
7. Backlog items in `Converted` state stay in place — they're the audit trail of how the real item was born.

---

## Action

Use for non-coding work: code review of someone else's PR, research, ops tasks, syncs, meetings, anything that doesn't produce committed code.

```
   ┌─────────────┐  In Progress   ┌────────────────┐   Done   ┌──────────┐
   │   To Do     │ ─────────────▶ │  In Progress   │ ────────▶│  Closed  │
   └─────────────┘                └────────────────┘          └──────────┘
          ▲                              │
          │ Reopen                       │ Cancel
          │                              ▼
          │                       ┌────────────────┐
          └────────────────────── │   Cancelled    │
                                  └────────────────┘
```

Cancel is legal from any non-final state. Reopen lifts a Cancelled item back to `To Do`.

---

## Bug

Use for defect fixes. Walks through PR review, staging, and production before being declared stable.

```
  To Do ──Start Coding──▶ Coding ──Submit PR──▶ Code Review
                            ▲                       │
                            │  Request Changes      │  Approve PR
                            └───────────────────────┘  │
                            ▲                          ▼
                            │  Reject              Staging
                            └──────────────────────────┘
                                                       │ Staging OK
                                                       ▼
                                               Ready For Deploy
                                                       │ Deployed
                                                       ▼
                                                  Production
                                                       │ Stable
                                                       ▼
                                                    Closed
```

Cancel is legal from any non-final state and lands the bug in `Cancelled`. Bug does not have a `Reopen` transition — if a Cancelled bug needs to come back, create a new Bug and reference the old one in `description`.

**Don't fast-forward.** Moving Coding → Closed in one step is wrong. Each transition should reflect a real-world event (PR opened, PR approved, deploy actually happened). If you find yourself skipping stages, you're either dropping audit information or the work item is the wrong granularity.

---

## Epic

Use as a container for a phase of work. Epics hold multiple tasks/actions/improvements. Naming convention: `Phase X: <description>` (folder name: `EPIC-NNN-phase-X-...`).

```
   To Do ──In Progress──▶ In Progress ──Done──▶ Closed
                                │
                                │ Cancel (from any)
                                ▼
                            Cancelled  ──Reopen──▶ To Do
```

**Close an Epic only when every child item is `Closed` or `Cancelled`.** The validator doesn't enforce this — it's up to the skill to check `Spaces/index.json` before closing.

---

## Improvement

Enhancement to an existing feature. Same state machine as Task, with two extras: `Any → Closed` (fast-track close when the enhancement was already delivered another way) and `Cancelled → To Do` (Reopen).

```
   Same shape as Task — see below.
```

---

## Plan

Strategic plan that gates downstream development. Plans require CTO approval to move past `New Request`.

```
   New Request ──Initial Review──▶ Under Review ──Accept──▶ Accepted
                                                                │
                                                                │ Start Planning
                                                                ▼
                                                             Planning
                                                                │ Submit Plan
                                                                ▼
                                                           Plan Review
                                                                │
                                  ┌─── Plan Reject ────────────┘
                                  ▼
                              Planning                        Approve Plan
                                                                │
                                                                ▼
                                                            Approved
                                                                │ Stable
                                                                ▼
                                                             Closed

   Cancel is legal from any non-final state → Cancelled.
```

**Two gates:**

1. `Under Review → Accepted` requires CTO acceptance. Don't take this transition without explicit user confirmation.
2. `Plan Review → Approved` requires CTO approval. Same rule.

A Plan in `Approved` is what unblocks downstream Tasks/Bugs/Improvements that reference it via `plan_id`. If a Task references a Plan that isn't `Approved`, warn the user and let them choose to proceed.

---

## Task

New coding work delivering a feature or change. Same flow as Bug but with two extra terminal transitions for flexibility.

```
   To Do ──Start Coding──▶ Coding ──Submit PR──▶ Code Review
                            ▲                       │
                            │  Request Changes      │  Approve PR
                            └───────────────────────┘  │
                            ▲                          ▼
                            │  Reject              Staging
                            └──────────────────────────┘
                                                       │ Staging OK
                                                       ▼
                                               Ready For Deploy
                                                       │ Deployed
                                                       ▼
                                                  Production
                                                       │ Stable
                                                       ▼
                                                    Closed

   Fast-track Close: any non-final → Closed (use when work was delivered elsewhere)
   Cancel: any non-final → Cancelled
   Reopen: Cancelled → To Do
```

Same "don't fast-forward" rule as Bug applies. `Fast-track Close` exists for the rare case where a Task is obsolete because the work shipped some other way — not as a shortcut for skipping review.

---

## Sub-task

Child of a Task. Lightweight workflow — no PR/Staging/Production stages; the parent Task handles those for the bundled change.

```
   To Do ──Start Coding──▶ Subtask In Progress ──Completed──▶ Subtask Done
     ▲                              ▲                              │
     │                              │                              │
     │                              └─────────── Reopen ───────────┘
     │
     └──── Reset (from any) ────────────────────────────────────────
```

Sub-tasks don't have their own `Cancelled` state — if a sub-task is no longer needed, either close it via `Completed` with a note in `solution_summary`, or delete the file outright. The parent Task captures the cancellation context.

---

## Quick reference table

| Type        | First status          | Final statuses                | Cancel? | Reopen? |
|-------------|-----------------------|-------------------------------|---------|---------|
| Backlog     | Needs Clarification   | Converted, Cancelled          | yes     | yes     |
| Action      | To Do                 | Closed, Cancelled             | yes     | yes     |
| Bug         | To Do                 | Closed, Cancelled             | yes     | no      |
| Epic        | To Do                 | Closed, Cancelled             | yes     | yes     |
| Improvement | To Do                 | Closed, Cancelled             | yes     | yes     |
| Plan        | New Request           | Closed, Cancelled             | yes     | no      |
| Task        | To Do                 | Closed, Cancelled             | yes     | yes     |
| Sub-task    | To Do                 | Subtask Done                  | no      | yes     |

## Editing workflows

To change a workflow:

1. Edit `workflows.json` — add/remove statuses or transitions.
2. Update this file to reflect the new shape so humans stay in sync.
3. Existing work items in old statuses are not auto-migrated. The validator will reject transitions out of removed statuses. Either migrate by hand or add a temporary "Migrate" transition.

Don't bake workflow logic into the skill itself or into helper scripts — the point of keeping it in JSON is that it can change without code changes.
