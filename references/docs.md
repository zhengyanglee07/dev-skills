# Learn docs

Learn docs live in `Spaces/Docs/` and are plain markdown files with YAML frontmatter. They capture knowledge about the system — answers to clarification questions, business rules, domain constraints, architectural decisions — so future sessions don't have to ask the same question twice.

## When to write a doc

Write a Doc **any time**:

- You ask the user a clarification question and they give you an answer.
- The user proactively explains how something works ("the way this works is…").
- The user corrects a wrong assumption you made about the system or domain.
- A question comes up that you're genuinely unsure about — ask, then document the answer.

If you're unsure whether something warrants a doc, write it and let the user discard it. The cost of an unnecessary doc is low; the cost of losing tribal knowledge is high.

**One doc = one piece of knowledge.** If multiple distinct topics come up in the same conversation, write a separate doc file for each. A doc with a single focused question and answer is far more useful than one file mixing unrelated topics — easier to find, easier to update when one part changes, won't mislead a reader who only needs part of it.

## How to write a doc

1. Allocate the next ID: `python ~/.claude/skills/project-spaces/scripts/next_id.py <project-root> doc` → e.g. `DOC-003`.
2. Create `Spaces/Docs/DOC-NNN-slug.md` using `templates/doc.md` as the starting point.
3. **Title scope test**: would a reader know exactly what this doc answers from the title alone, with nothing else? If the title needs "and" to describe its content, the doc covers two topics — split it.
4. Fill in the frontmatter:
   - `id` — e.g. `DOC-003`
   - `title` — short, specific (not "how auth works" → "how JWT refresh tokens are issued and rotated")
   - `created_at` — ISO-8601 UTC
   - `tags` — free-form, e.g. `[auth, tokens]`
   - `related_items` — IDs of work items this clarifies (e.g. `[TASK-005, BUG-002]`)
   - `source` — one of: `user-clarification` (user answered a question you asked), `user-explanation` (user proactively told you), `investigation` (you investigated and documented findings)
5. **Delete the `<!-- SCOPE CHECK -->` and inline `<!-- ... -->` placeholder comments from `templates/doc.md` before saving.** Those are template guidance, not content.
6. Write two sections:
   - **Context / Question** — exactly what was asked or what was unclear. One topic only.
   - **Answer** — the knowledge for that one topic. Be concrete. Use examples where helpful.
7. Commit the doc file alongside any related work-item JSON and code changes (same single commit per the commit rules).
8. Run `scripts/update_index.py` to register the doc in `index.json` under the `docs` array.

## Doc file format

```markdown
---
id: DOC-003
title: How JWT refresh tokens are issued and rotated
created_at: 2026-05-16T10:30:00Z
tags: [auth, tokens]
related_items: [TASK-005]
source: user-clarification
---

## Context / Question

Asked: does the refresh token rotate on every use, or only on expiry?

## Answer

Refresh tokens rotate on every use. Each call to /auth/refresh invalidates the
previous token and issues a new one. The old token is added to a blocklist for
its remaining TTL. This means parallel requests using the same refresh token
will race — only the first wins; the rest get 401 and must re-authenticate.
```

## Things to avoid for docs

- **Don't combine multiple topics in one file.** If a conversation produces two distinct pieces of knowledge, create two docs. Mixing topics makes each one harder to find and creates a maintenance problem when one answer changes but the other doesn't.
- Don't leave template placeholder comments (`<!-- SCOPE CHECK -->`, `<!-- The single question... -->`) in the saved file.
- Don't write docs for things already in code comments, README, or CLAUDE.md — link there instead.
- Don't use a broad title that forces multiple sub-topics into one file (e.g. "How the auth system works"). Narrow it to a single answerable question ("How JWT refresh tokens rotate on use").
- Don't pad with "this document explains…" headers. Start with the question, then the answer.
- Don't leave `related_items` empty if there's an obvious work item the doc clarifies.
- Docs are never deleted or archived — if the answer changes, update the doc in place and add a dated note under the Answer so the history is visible.
