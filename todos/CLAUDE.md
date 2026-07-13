# web-admin/todos — Routine Rules

Read with `ROUTINE.md`. Non-negotiable guardrails for any UI-overhaul todo run.

## Scope discipline
- One todo per run; implement only its *Step-by-step*. Extras → PR-body suggestion or `## Blocked`.
- This is a redesign track, but it is **not** a rewrite-everything track. Each todo has a bounded
  surface. Do not touch pages outside the todo's scope.

## The prime directive: no fabricated data, ever
- The overhaul exists because the UI invents data (fake charts, fake % deltas, fake tables). When a
  real number/series isn't available, render an **honest empty / "not enough data yet" / zero
  state** — never a decorative value. If a real value needs a backend endpoint that doesn't exist,
  that's a `## Blocked`, not an excuse to hardcode.

## Architecture guardrails (../CLAUDE.md)
- **All HTTP goes through `src/api.js`** (`adminApi.*`). Never add `fetch(` in a page/component.
- Preserve auth refresh + redirect behavior. Don't touch `lib/authSession.js` semantics.
- Keep the functional CRUD/detail flows working (Managers, Operations, Routes, Buses, Tracking,
  Route Approvals, Private Routes). Restyle freely; do not break their behavior or API calls.
- No cross-app imports.

## Design-system discipline
- After todo 001–002 land: use the central theme/tokens and the single chosen Button. Do not add
  new inline hex colors or a second button component. No new deprecated MUI Grid v1 (`<Grid item>`)
  — use v7 `size={{}}`.

## Testing policy (../CLAUDE.md "no untested code")
- New/changed component or helper ships with a Vitest unit test (`src/**/__tests__`).
- Behavior/flow-affecting change → update or add a Playwright e2e (`e2e/`) and a `TESTING_GUIDE`
  row where a backend contract is involved.
- Two bars: **feature tests** (`npm test` green) and the **completion test**
  (`todos/completion-tests/todo-NNN.sh`). Never weaken a feature test to pass the completion test.

## Quality gates (every PR)
- `npm run lint` + `npm test` green; no skipped/`.only`.
- No console errors on the touched pages; attach before/after screenshots.
- Conventional Commit; not self-merged.

## When unsure
- Genuine unknown (missing endpoint, unclear real data source, product decision on what a rebuilt
  screen should show) → `## Blocked`, no functional commit, no PR, report. Don't guess, don't fake.

## File map
- `ROUTINE.md` · `CLAUDE.md` · `todo-list.md` · `active/NNN-slug.md` · `complete/NNN-slug.md` ·
  `completion-tests/todo-NNN.sh`. Audit source: `../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md`.
