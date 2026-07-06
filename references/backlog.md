# Backlog items

A Backlog item is a parking spot for work that has been identified but can't be typed or scoped yet. It holds the raw intent and open questions until enough is known to create a real work item.

## When to create a Backlog item instead of a real work item

- The user describes something that needs doing but you can't determine the right type (Task? Bug? Improvement?) without more information.
- You need to ask the user one or more clarification questions before work can begin.
- The user uses tentative language: "we should probably…", "at some point we need to…", "not sure how but…", "need to figure out…"
- Scope is unknown — it could be a tiny fix or a full epic depending on the answer.

**Don't** create a real work item and then immediately ask clarifying questions — create a Backlog item first. The questions and answers are recorded there, and the real item is born from the conversion.

## Creating a Backlog item

1. Allocate the next ID: `python ~/.claude/skills/project-spaces/scripts/next_id.py <project-root> backlog` → e.g. `BLG-002`.
2. Create `Spaces/Backlog/BLG-NNN-slug.json` from `templates/backlog.json`.
3. Fill in:
   - `title` — the rough intent, even if vague.
   - `description` — everything known so far.
   - `what_is_unclear` — a sentence summarising what the blocker is.
   - `clarification_questions` — one entry per question you need answered. Leave `answer` and `answered_at` null.
   - `intended_type` — best guess (`task`, `bug`, `improvement`, `action`, `epic`) or null if totally unknown.
4. Ask the user the questions in `clarification_questions`. Record answers as they come in: fill `answer` and `answered_at` on each entry.

## Progressing a Backlog item

### All questions answered

When `clarification_questions` has no null `answer`:

1. Transition `Needs Clarification → Ready` via `Clarified`. Validate first with `validate_transition.py`.
2. Confirm `intended_type` — update it if the answers changed your assessment.

### New questions arise after marking Ready

Transition `Ready → Needs Clarification` via `Back to Clarification`. Add the new question to `clarification_questions`.

## Converting a Backlog item

Once in `Ready` status and all questions answered:

1. Create the real work item using the appropriate template. Carry over:
   - `title`, `description`, `tags`, `priority`
   - `expected_outcomes` (if the user named concrete values during clarification)
   - Synthesise `verification_criteria` from the clarification answers.
2. Set `converted_to` on the Backlog item to the new item's ID (e.g. `"BUG-004-fix-timezone-display"`).
3. Set `converted_at` to now (ISO-8601 UTC).
4. Transition `Ready → Converted` via `Convert`. Validate first.
5. Commit both the Backlog JSON and the new work-item JSON together in the same commit.
6. Run `scripts/update_index.py`.

The Backlog item remains in `Spaces/Backlog/` permanently — it's the provenance record for the real item.

## Things to avoid for Backlog items

- Don't leave `clarification_questions` with unanswered entries and transition to `Ready` anyway — the schema validator forbids it.
- Don't create a Backlog item if you already have enough information to type the work correctly. Use the right type directly.
- Don't use Backlog as a "someday/maybe" list — if the user says it's definitely not happening, `Cancel` it.
