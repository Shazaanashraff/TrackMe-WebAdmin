# CHANGES — web-admin session log

Append-only running log of what each work session changed. **Newest entry on top.**
The pre-push check ([`scripts/check-docs.mjs`](../scripts/check-docs.mjs)) expects a new entry
when source under `src/` changed. One entry per session/PR is enough.

**Before you push, add an entry using this template:**

```md
## YYYY-MM-DD — <short title>
- **Branch:** <branch>
- **Modules touched:** <link docs/modules/*>
- **What changed:** <1–4 bullets, plain English>
- **Why:** <the reason / ticket / todo id>
- **Contract impact:** <none | which backend endpoint/socket payload, + which backend doc updated>
- **Tests:** <added/updated files, or "none — docs only">
- **Docs updated:** <docs/modules/*.md, TESTING_GUIDE row — or "n/a">
- **Follow-ups / known issues:** <or "none">
```

Feeds [`CHANGELOG.md`](../CHANGELOG.md) at release time — see [`guides/RELEASING.md`](guides/RELEASING.md).

---

## 2026-08-11 — Developer Mode Phase 1: sandbox toggle, test catalog, local runner
- **Branch:** feat/developer-mode-sandbox
- **Modules touched:** developer-mode (new) — [docs/modules/DEVELOPER_MODE.md](modules/DEVELOPER_MODE.md)
- **What changed:**
  - `src/lib/apiMode.js` (new): `getApiMode`/`setApiMode`/`getApiBaseUrl`/`subscribeApiMode`.
    `getApiBaseUrl()` returns the primary URL unconditionally outside `import.meta.env.DEV`.
  - `src/api.js`: `request()` and `refreshStoredAuth()` now call `getApiBaseUrl()` per-call
    instead of a module-level `API_BASE_URL` constant — the only change to existing API code.
  - `src/lib/devkit.js` (new): client for `tools/devkit/runner` (127.0.0.1:5099) — catalog fetch
    + SSE run/reset streaming. Deliberately bypasses `api.js`'s auth-aware `request()`.
  - `src/pages/DeveloperPage.jsx` (new): sandbox toggle, live `/health` readout, Reset-sandbox
    button, catalog tree grouped by repo → module → file → test with run buttons, SSE output
    panel, gap report tab.
  - `src/layout/SandboxBanner.jsx` (new) + `AppShell.jsx`: persistent banner while sandbox is
    active, rendered inside the authenticated shell.
  - `AppShell.jsx`'s `SUPER_ADMIN_NAV` and `App.jsx`'s `/developer` route both gated behind
    `import.meta.env.DEV`, same pattern as the existing `/styleguide` route.
- **Why:** ~1,200 tests across four repos with no single view of coverage, and no safe database
  to exercise CRUD against outside real dev data. See `DEVELOPER_MODE_PLAN.md` at the repo root.
- **Contract impact:** none — no backend contract changed; `backend`'s `/health` gained two
  additive fields (see backend `CHANGES.md`).
- **Tests:** `src/lib/__tests__/apiMode.test.js` (new), `src/__tests__/api.auth.test.js` (2 cases
  added), `src/pages/__tests__/DeveloperPage.test.jsx` (new). Full suite green: 571 passed.
- **Docs updated:** docs/modules/DEVELOPER_MODE.md (new), docs/README.md,
  docs/QA_UPDATE_TRIGGERS.md, docs/TESTING_GUIDE.md (Developer Mode section), CLAUDE.md
  ("Running" + non-negotiables).
- **Follow-ups / known issues:** the live browser round-trip (login → toggle → sandbox record
  absent after flipping back) was not run interactively this session; the underlying pieces
  (both `/health` endpoints, the seed script, the catalog, and the runner) were each verified
  individually against the real sandbox database and a running sandbox backend.

---

## 2026-07-22 — Documentation system rolled out
- **Branch:** main
- **Modules touched:** docs only (no `src/` change)
- **What changed:** `CLAUDE.md` rewritten as a router; added `docs/modules/` (stubs naming their
  source files), `docs/guides/` (`_MODULE_TEMPLATE`, `ADDING_A_FEATURE`, `ADDING_A_TEST`,
  `RELEASING`), this `CHANGES.md`, `CHANGELOG.md`, a rewritten `docs/README.md` index, and
  `scripts/check-docs.mjs` + `.githooks/pre-push`.
- **Why:** match the user-app/backend docs system so a session lands on the right file fast.
- **Contract impact:** none — docs only.
- **Tests:** none — docs only.
- **Docs updated:** this is the docs work.
- **Follow-ups / known issues:** run `git config core.hooksPath .githooks` once per clone;
  module docs are stubs and must be filled in by the next change touching each area.
