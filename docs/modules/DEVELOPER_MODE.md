# DEVELOPER_MODE — TrackMe Admin Portal

**Status:** `SHIPPED` — Phase 1. Dev-only sandbox toggle + auto-generated test catalog + local
test runner, gated behind `import.meta.env.DEV`. See
[`../../../DEVELOPER_MODE_PLAN.md`](../../../DEVELOPER_MODE_PLAN.md) for the full design and its
"Locked decisions" table.

**Serves:** super-admin only (nav entry lives in `SUPER_ADMIN_NAV`).

---

## 1. Purpose

Two things this app had no safe way to do: exercise CRUD against disposable data, and see what
the ~1,200 tests across the four repos actually cover. This module is a dev-only `/developer`
page that does both — a toggle that repoints every `adminApi` call at a second backend (`:5001`,
its own database), and a browser view of the local test catalog with a run button. None of it
ships in a production build: the page, its nav entry, and the sandbox branch of `getApiBaseUrl()`
are all compiled out when `import.meta.env.DEV` is false.

## 2. Key files (one job each)

| File | Responsibility |
|---|---|
| `src/lib/apiMode.js` | `getApiMode`/`setApiMode`/`getApiBaseUrl`/`subscribeApiMode`. The mode lives in `localStorage`; `setApiMode` also clears `queryClient` and fires a `trackme:apimode` event. |
| `src/api.js` | `request()` and `refreshStoredAuth()` call `getApiBaseUrl()` per-call instead of a module-level constant — the only change to existing API code. |
| `src/lib/devkit.js` | Client for `tools/devkit/runner` (127.0.0.1:5099) — `fetchCatalog`, `runTest`, `resetSandbox`. Deliberately bypasses `api.js`'s `request()`; see §4. |
| `src/pages/DeveloperPage.jsx` | The page itself: sandbox toggle + live `/health` readout + Reset button, catalog tree (repo → module → file → test), run buttons, SSE output panel, gap report tab. |
| `src/layout/SandboxBanner.jsx` | Persistent banner shown inside `AppShell` whenever sandbox mode is active. |
| `src/layout/AppShell.jsx` | `SUPER_ADMIN_NAV` gains the Developer entry, spread in only when `import.meta.env.DEV`. |
| `src/App.jsx` | `/developer` route, same `import.meta.env.DEV` guard pattern as `/styleguide`. |
| `tools/devkit/` (umbrella root) | Not part of this repo, but is what this page talks to — see the plan's architecture diagram. |

## 3. Data flow

```
DeveloperPage
  ├── SandboxToggleCard → apiMode.js (toggle) + fetch GET {getApiBaseUrl()}/health (diagnostic only)
  ├── CatalogPanel → devkit.js: GET 127.0.0.1:5099/api/catalog, POST .../api/run (SSE)
  └── GapReportPanel → devkit.js: GET 127.0.0.1:5099/api/catalog (catalog.gapReport)
```

Every other page's data still flows `Page → Hook (TanStack Query) → adminApi (src/api.js) →
TrackMe backend`, unchanged — `getApiBaseUrl()` is the only thing that varies per mode, and it is
called fresh on every request rather than cached.

## 4. Contracts (API / socket / storage)

| Kind | Name | Shape / notes |
|---|---|---|
| REST | `GET {backend}/health` | `{ status, mode, dbName, ... }` — the sandbox badge trusts this over the client toggle. |
| REST | `GET 127.0.0.1:5099/api/catalog` | `{ counts, entries[], files[], gapReport[] }` — see `tools/devkit/catalog/build-catalog.mjs`. |
| REST | `POST 127.0.0.1:5099/api/run` | `{ testId }` → SSE (`event: start\|stdout\|stderr\|exit\|error`). `testId` only, never a path/command. |
| REST | `POST 127.0.0.1:5099/api/reset-sandbox` | No body. Re-runs `backend`'s `seed-sandbox.js`, streamed the same way. |
| Storage | `localStorage['webadmin-api-mode']` | `'primary' \| 'sandbox'`. Read by `getApiMode()`; ignored entirely outside `DEV`. |

> `src/lib/devkit.js` (and `DeveloperPage.jsx`, which is its only caller) is the **one deliberate
> exception** to "all HTTP goes through `src/api.js`". The devkit runner isn't the TrackMe API —
> it has no auth, no refresh flow, and must never be reachable from a production build, so routing
> it through `adminApi`'s auth-aware `request()` would be the wrong abstraction, not the right one.

## 5. Not visible in the frontend

- `getApiBaseUrl()`'s first line is `if (!import.meta.env.DEV) return PRIMARY_URL;` — in a
  production build the sandbox branch is unreachable and tree-shaken. Verified by `npm run build`
  + grepping the output bundle for `Developer`/sandbox strings (see repo `CHANGES.md`).
  Nav entry and route follow the same guard independently, so all three would have to be removed
  together to actually turn this off — a config flag was deliberately not used (see the plan's
  "dev-only by construction, not by configuration").
- `setApiMode` calls `queryClient.clear()` on every flip. Without it, TanStack Query would keep
  serving cached primary-backend data while the badge already says sandbox.
- The devkit runner enforces its own safety rails independently of this page (loopback bind,
  `NODE_ENV=production` refusal, catalog-id-only `spawn`) — see `tools/devkit/README.md`. This
  page has no way to make an unsafe request even if compromised; the allowlist lives server-side.

## 6. Known gotchas / regressions

- The catalog and runner are a **separate local process** (`npm run devkit` from the repo root).
  If it isn't running, `CatalogPanel`/`GapReportPanel` show "Could not reach the devkit runner" —
  this is expected, not a bug, and the page still renders everything else.
- The sandbox backend (`backend`'s `npm run dev:sandbox`) is started by hand — this page never
  spawns it. If the toggle says sandbox but `/health` reports `primary` (or is unreachable), the
  page shows an inline warning rather than silently trusting the toggle.

## 7. Tests covering this module

| Layer | File | What it locks |
|---|---|---|
| Unit | `src/lib/__tests__/apiMode.test.js` | mode defaults to primary, toggling switches the base URL, persists to `localStorage`, clears `queryClient`, notifies subscribers, and is a no-op outside `DEV` even with sandbox already stored. |
| Unit | `src/__tests__/api.auth.test.js` | two added cases: a request goes to `:5001` once sandbox is toggled on; a request stays on `:5000` outside `DEV` even with sandbox toggled on. |
| RTL | `src/pages/__tests__/DeveloperPage.test.jsx` | toggle flips the mode and shows a mismatch warning when the server disagrees; `/health` badge reflects the server's own report; catalog renders grouped by module; a run streams SSE output and reports the exit code; reset-sandbox streams output; runner-unreachable shows an error state instead of crashing; gap report tab shows missing categories, not fabricated failures. |

See [`ADDING_A_TEST.md`](../guides/ADDING_A_TEST.md) and the
[`TESTING_GUIDE.md`](../TESTING_GUIDE.md) row.

## 8. Change protocol

Any change to this module must:
1. Run this module's tests green as a baseline (`npx vitest run src/lib/__tests__/apiMode.test.js
   src/__tests__/api.auth.test.js src/pages/__tests__/DeveloperPage.test.jsx`).
2. Keep the dev-only gating on all three surfaces (nav entry, route, `getApiBaseUrl()`) — never
   collapse them into one shared flag without re-verifying the production-build grep.
3. Add/adjust tests for every changed behaviour.
4. Re-run green (`npm test`) and `npm run build` + grep for leaked strings if the gating changed.
5. Update **this doc** + the [`TESTING_GUIDE.md`](../TESTING_GUIDE.md) row, and append a
   [`CHANGES.md`](../CHANGES.md) entry before pushing.
6. If the catalog shape changed, update `tools/devkit/catalog/build-catalog.mjs` and regenerate
   (`npm run devkit:catalog` from the repo root) in the same change.
