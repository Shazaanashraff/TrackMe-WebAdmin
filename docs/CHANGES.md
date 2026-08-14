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

## 2026-08-14 — Show location state in the drivers directory, and link it to the map
- **Branch:** main
- **Modules touched:** tracking — [`docs/modules/TRACKING.md`](modules/TRACKING.md) (new §5a, key
  files and tests rows)
- **What changed:**
  - New **Location** column on `/manager/accounts`: live / stale / offline per driver, from the
    fleet snapshot keyed back to the driver each record names. Live and stale rows are a button
    into `/manager/tracking?vehicle=<vehicleId>`; offline rows and drivers with no vehicle state
    that and link nowhere.
  - Added `useManagerFleetLive()` — the fleet query with no socket, sharing
    `qk.vehicles.managerLive()` with the tracking page so either page warms the other.
  - `ManagerTrackingPage` now reads `?vehicle=`, keeps a deep-linked vehicle through the first
    render (where the fleet snapshot has not arrived), and keeps the URL in step with the vehicle
    actually being followed.
  - **Fixed a crash on the tracking page** (found by following the new link in the browser):
    `FleetMarkers` read `Marker` and `SymbolPath`, and `MapViewport` read `LatLngBounds`, off
    `useMapsLibrary('maps')`. `Marker` is in the marker library and `SymbolPath`/`LatLngBounds` are
    in core, so every plotted vehicle threw `Cannot read properties of undefined (reading
    'CIRCLE')` and the app-level ErrorBoundary replaced the whole page. The unit test could not
    catch it: its `useMapsLibrary` mock returned one object for every library name. The mock is
    now split by library, and a marker's `icon.path` is asserted.
- **Why:** a manager reading the drivers directory could see that an account was Active but not
  whether that driver was broadcasting, and had to go to the tracking page and re-find the vehicle
  by hand.
- **Contract impact:** none — consumes the existing `GET /api/manager/vehicles/live`.
- **Tests:** updated `src/pages/__tests__/ManagerAccountsPage.test.jsx` (five location-column
  cases) and `src/pages/__tests__/ManagerTrackingPage.test.jsx` (router wrapper, deep link,
  per-library maps mock, marker icon path). Verified in the browser against the running dev
  server, not only in RTL.
- **Docs updated:** `docs/modules/TRACKING.md`, two `docs/TESTING_GUIDE.md` rows.
- **Follow-ups / known issues:** the column ages on the 30-second poll, so a driver going offline
  can read live for up to that long. `ManagerRequestsPage.test.jsx` has one failure predating this
  session ("Managed profile · Daughter").

## 2026-08-14 — Rebuild manager live tracking on the vehicle-scoped contract
- **Branch:** main
- **Modules touched:** tracking — [`docs/modules/TRACKING.md`](modules/TRACKING.md) (rewritten)
- **What changed:**
  - Restored `/manager/tracking` and its manager-nav entry with an Atlas Google Maps fleet map,
    current-state markers, selected-vehicle telemetry, stale/first-fix/offline states, and honest
    loading/empty/error surfaces.
  - Added `adminApi.getManagerFleetLive()` + `qk.vehicles.managerLive()`. The fleet snapshot polls
    every 30 seconds as a fallback; no breadcrumb history is fabricated because the backend stores
    one current-location document per vehicle.
  - Added `tracking-socket.js` and `useManagerFleetTracking`: one selected vehicle at a time joins
    `vehicle:subscribe`, consumes `vehicle:update` / `vehicle:status`, unsubscribes on selection or
    cleanup, and resolves the socket-vs-REST result by timestamp. The socket uses `getApiBaseUrl()`
    so Developer Mode's sandbox toggle applies to realtime too.
- **Why:** backend live location and the rider consumer were shipped on 2026-08-14, but the manager
  page named as a consumer in backend `REALTIME.md` had been deleted in `fee5555` and was never
  rebuilt. Its archived implementation depended on deleted bus rooms and history endpoints.
- **Contract impact:** consumes the additive backend `GET /api/manager/vehicles/live` and
  `vehicle:subscribe` / `vehicle:unsubscribe` / `vehicle:update` / `vehicle:status` contract from
  `TrackMe-backend/docs/modules/REALTIME.md`; no backend shape changed in this session.
- **Tests:** added `src/lib/__tests__/tracking-socket.test.js`,
  `src/hooks/__tests__/use-tracking.test.jsx`, and
  `src/pages/__tests__/ManagerTrackingPage.test.jsx`; extended API, route, and nav suites.
- **Docs updated:** `docs/modules/TRACKING.md`, `docs/TESTING_GUIDE.md`, unit/integration/E2E
  plans, tracking strategy/refactor docs, redesign page/checklist/progress docs, `docs/README.md`,
  `CLAUDE.md`, this log.
- **Follow-ups / known issues:** Google Maps requires `VITE_GOOGLE_MAPS_KEY`, a browser-restricted
  Maps JavaScript API key, and network access. Repository-wide
  `npm test` had one unrelated pre-existing failure before this work in
  `ManagerRequestsPage.test.jsx` (missing “Managed profile · Daughter”); repository-wide lint also
  remains red on pre-existing auth/developer test errors.

## 2026-08-13 — Create-vehicle flow reflects the new bootstrap-then-approval rule
- **Branch:** main
- **Modules touched:** vehicles/fleet (`ManagerVehiclesPage.jsx`) — no dedicated module doc yet
- **What changed:**
  - `handleSubmit` in `ManagerVehiclesPage.jsx` now branches on the create-vehicle
    response: `data.vehicle` present → today's "Vehicle created" toast; otherwise
    (a pending request came back) → "Vehicle creation request submitted for
    super admin approval".
  - The create wizard's review step and final submit button now read the
    manager's current vehicle count (`useManagerVehicles`, already loaded on
    this page) to say which will happen — "Create Vehicle" / "This is your
    first vehicle, so it will be created right away" for an empty fleet, or
    "Submit Request" / "…submitted for super admin approval" once they have one.
- **Why:** the backend (`POST /api/manager/vehicle-accounts`) now creates a
  manager's first vehicle outright but queues every one after that for
  super-admin approval, mirroring how vehicle deletion already works. The UI
  previously assumed every submission created a vehicle immediately.
- **Contract impact:** backend contract change — see backend `docs/CHANGES.md`,
  2026-08-13 entry. No new backend doc yet (`ADMIN.md` is still a stub).
- **Tests:** extended `src/pages/__tests__/ManagerVehiclesPage.test.jsx` — two
  new cases (immediate creation with an empty fleet vs. a submitted request
  once the manager already has a vehicle) plus three existing wizard-submit
  assertions loosened to accept either button label, since the shared test
  fixture manager already has one vehicle.
- **Docs updated:** n/a (no dedicated module doc for this page yet).
- **Follow-ups / known issues:** none.

## 2026-08-12 — Show the owning account for a managed-profile passenger; document the requests page
- **Branch:** feat/multi-rider-profiles
- **Modules touched:** [docs/modules/ENROLLMENT_REQUESTS.md](modules/ENROLLMENT_REQUESTS.md) (new)
- **What changed:**
  - `ManagerRequestsPage.jsx`: the Passenger column shows a "Managed profile · relation" tag under
    the name when `passenger.isManagedProfile`; the Email column is renamed **Account** and falls
    back to `passenger.account.email`/`phoneNumber` (two lines) when the profile itself has none;
    the Approve/Decline confirm-dialog title includes the owning account's email for a managed
    profile via a new `passengerLabel()` helper.
  - Wrote `docs/modules/ENROLLMENT_REQUESTS.md` from scratch — this page (the manager's private-
    driver enrollment approval queue) had no module doc at all before this session, a pre-existing
    gap against the "no undocumented module" rule. Linked from `docs/README.md` and `CLAUDE.md`'s
    routing table.
- **Why:** a managed rider profile (a child, an employee — see
  [backend PROFILES.md](../../backend/docs/modules/PROFILES.md)) has no email/phone of its own, so
  the manager needs the account holder's contact info to identify who they're approving, not a
  blank "None".
- **Contract impact:** `backend/src/controllers/managerEnrollmentsController.js#requestSummary` now
  sends `passenger.isManagedProfile`, `passenger.relation`, `passenger.account`
  `{name, email, phoneNumber}` — additive, no existing field removed. See
  [backend PROFILES.md](../../backend/docs/modules/PROFILES.md) §6 and backend
  `tests/integration/manager-enrollments-managed-profile.test.js`.
- **Tests:** `src/pages/__tests__/ManagerRequestsPage.test.jsx` — 3 new cases (managed-profile tag,
  Account column fallback, dialog title), 8/8 passing.
- **Docs updated:** this entry, new `modules/ENROLLMENT_REQUESTS.md`, `docs/README.md`, `CLAUDE.md`,
  `TESTING_GUIDE.md` new "Enrollment Requests" section.
- **Follow-ups / known issues:** `ACCOUNTS.md` remains a stub (manager/super-admin account
  management, a different surface from this page) — unrelated to this change, not addressed here.

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
