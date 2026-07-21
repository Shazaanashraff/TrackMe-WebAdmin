# web-admin — TrackMe Admin Portal

React 18 + Vite portal for **managers** and **super-admins**: fleet, drivers, routes, private-route
keys, route approvals, live tracking, and operations.

**This file is a router, not a manual.** It gives you the shape of the app and points you at the
one doc you need. Deep detail lives in [`docs/`](docs/README.md) — do not duplicate it here.

---

## Session start

1. Check claude-mem for prior context (`/mem-search <topic>`) before re-reading files.
2. Open [`docs/README.md`](docs/README.md) — the documentation map.
3. Doing feature / test / release work? Go straight to the matching guide:
   - **Adding a feature** → [`docs/guides/ADDING_A_FEATURE.md`](docs/guides/ADDING_A_FEATURE.md)
   - **Adding a test** → [`docs/guides/ADDING_A_TEST.md`](docs/guides/ADDING_A_TEST.md)
   - **Cutting a release** → [`docs/guides/RELEASING.md`](docs/guides/RELEASING.md)
4. Before you push, append an entry to [`docs/CHANGES.md`](docs/CHANGES.md).

**One-time setup per clone:**
```bash
git config core.hooksPath .githooks
```

> **Two roles, one app.** Nearly every page is either manager-scoped or super-admin-scoped. A
> manager must only ever see their **own** resources — the backend enforces this, and the UI must
> not imply otherwise. When in doubt read
> [`backend/docs/modules/PRIVATE_ROUTES.md`](../backend/docs/modules/PRIVATE_ROUTES.md) §6.

---

## Where to look (the map)

| I need to… | Read |
|---|---|
| Login / forgot-password / session + role gate | [`docs/modules/AUTH.md`](docs/modules/AUTH.md) |
| Dashboards (super-admin + manager) | [`docs/modules/DASHBOARD.md`](docs/modules/DASHBOARD.md) |
| Manage manager accounts / super-admin ops | [`docs/modules/ACCOUNTS.md`](docs/modules/ACCOUNTS.md) |
| Buses & drivers | [`docs/modules/BUSES.md`](docs/modules/BUSES.md) |
| Routes catalogue | [`docs/modules/ROUTES.md`](docs/modules/ROUTES.md) |
| **Private routes**: room keys, hide, join approvals | [`docs/modules/PRIVATE_ROUTES.md`](docs/modules/PRIVATE_ROUTES.md) |
| Driver-submitted custom route approvals | [`docs/modules/ROUTE_APPROVALS.md`](docs/modules/ROUTE_APPROVALS.md) |
| Live tracking map | [`docs/modules/TRACKING.md`](docs/modules/TRACKING.md) |
| Operations page | [`docs/modules/OPERATIONS.md`](docs/modules/OPERATIONS.md) |
| Settings | [`docs/modules/SETTINGS.md`](docs/modules/SETTINGS.md) |
| Design tokens / styleguide / the "Atlas" redesign | [`docs/DESIGN_TOKENS.md`](docs/DESIGN_TOKENS.md) · [`docs/redesign/`](docs/redesign/README.md) |
| Test strategy | [`docs/testing/README.md`](docs/testing/README.md) · [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md) |

---

## Architecture at a glance

```
src/
  api.js            The single HTTP layer (adminApi). Every request goes through it.
  pages/            One file per route: Dashboard, ManagerDashboard, Managers,
                    ManagerAccounts, ManagerBuses, ManagerPrivateRoutes,
                    ManagerRouteApprovals, ManagerTracking, ManagerSettings,
                    Routes, Operations, Settings, StyleGuide, Login, ForgotPassword*
  hooks/            TanStack Query hooks: use-buses, use-dashboard, use-managers,
                    use-operations, use-private-routes, use-route-approvals,
                    use-system-routes, use-tracking, use-online-status, use-refresh
  components/       ui/ (Radix + Tailwind primitives), auth/, shared/
  layout/           AppShell + nav
  lib/              authSession, queryClient, polyline, map-tokens, formatCurrency
  theme/            design tokens
```

**Stack:** Vite · React 18 · React Router · TanStack Query (+ Table) · **Radix + Tailwind**
(shadcn-style) alongside **MUI** — both are present; new UI follows the Radix/Tailwind "Atlas"
direction in [`docs/redesign/`](docs/redesign/README.md). Realtime via `socket.io-client`.
Tests: **Vitest** (unit) + **Playwright** (E2E).

---

## The non-negotiables

- **All HTTP goes through `src/api.js`.** Never call `fetch`/`axios` from a page or hook directly —
  it bypasses auth refresh and redirect handling.
- **Keep auth refresh + redirect behaviour consistent** (`lib/authSession.js`).
- **Manager scoping is not cosmetic.** Never render another manager's resources, and never rely on
  hiding a control as the access rule — the backend is the gate.
- **No untested code.** Behaviour changes ship with Vitest coverage and a
  [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md) row.
- **No undocumented module.** Update the [`docs/modules/`](docs/modules/) doc, from
  [`docs/guides/_MODULE_TEMPLATE.md`](docs/guides/_MODULE_TEMPLATE.md).
- **Log the session.** Append to [`docs/CHANGES.md`](docs/CHANGES.md) before every push.

---

## Running

```bash
npm run dev        # vite
npm run build
npm test           # vitest run
npm run test:e2e   # playwright
npm run lint
```
