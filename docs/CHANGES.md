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

## 2026-08-17 — Enrollment-key reveal pending state is now tracked per row

- **Branch:** issue/68-per-row-reveal-key-pending-state
- **Modules touched:** Accounts (docs/modules/ACCOUNTS.md — filled in from the template as part
  of this change, since the doc was still a stub)
- **What changed:** `ManagerAccountsPage.jsx` used a single shared `useDriverEnrollmentKey()`
  mutation for the "Show key" action across every driver row, deriving each row's pending state
  from `revealKeyM.isPending && revealKeyM.variables?.driverId === driver._id`. TanStack Query's
  mutation `variables` reflects only the most recent call, so clicking "Show key" on one row then
  a different row before the first resolved could make the first row's spinner disappear while
  its request was still in flight. Added a local `revealingIds` state (`driverId -> boolean`), set
  before `mutateAsync` and cleared in a `finally`, so each row's pending state is now derived
  independently instead of off the shared mutation object.
- **Why:** Closes #68.
- **Contract impact:** none — client-only state-tracking fix, no request/response shape change.
- **Tests:** `src/pages/__tests__/ManagerAccountsPage.test.jsx` — new case simulating rapid
  clicks on two different rows' "Show key" buttons with independently-controlled deferred
  promises, asserting each row's loading/result state stays correct regardless of resolution
  order.
- **Docs updated:** docs/modules/ACCOUNTS.md (written from the template — was previously an
  unfilled stub), docs/TESTING_GUIDE.md (Accounts section).
- **Follow-ups / known issues:** `.githooks/pre-push` was not executable in this clone (so the
  docs-staleness check silently never ran on push despite `core.hooksPath` being configured) —
  fixed the file mode as part of this push since it's a one-line, zero-risk permission fix that
  the repo's own doc-check safety net depends on.

## 2026-08-17 — Rejection-reason textarea gets a length cap and inline character feedback

- **Branch:** issue/69-reject-reason-length-cap
- **Modules touched:** Operations (docs/modules/OPERATIONS.md)
- **What changed:** `ConfirmDialog`'s reason textarea had no character limit and no inline
  length feedback, so an excessively long rejection reason risked only a generic backend 400
  with no field-level indication of what was wrong. Added an optional `reasonMaxLength` prop to
  the shared `ConfirmDialog`: renders a live `n/max` character count, caps typing via the native
  `maxLength` attribute, and (for the non-typed-input edge case) disables Confirm with an inline
  "too long" message if the reason somehow exceeds the cap. `OperationsPage`'s reject-request
  dialog now passes `reasonMaxLength={500}`. `ManagerVehiclesPage`'s other `ConfirmDialog`
  consumer is unaffected — the prop is opt-in and defaults to uncapped.
- **Why:** Closes #69.
- **Contract impact:** none — client-only validation; the backend's `decisionNote` field has no
  matching schema-level cap, so this is a UI-side choice, not a mirrored contract.
- **Tests:** `src/components/shared/__tests__/confirm-dialog.test.jsx` — new cases for the
  character count, native cap, and over-limit block. `src/pages/__tests__/OperationsPage.test.jsx`
  — new case confirming the reject dialog wires `reasonMaxLength={500}` through.
- **Docs updated:** docs/modules/OPERATIONS.md §5, docs/TESTING_GUIDE.md (Operations section).
- **Follow-ups / known issues:** none.

## 2026-08-17 — Operations re-syncs the selected manager on repeated "View" clicks

- **Branch:** issue/65-operations-managerid-resync
- **Modules touched:** Operations (docs/modules/OPERATIONS.md)
- **What changed:** `OperationsPage` read `?managerId=` from the URL only as the initial
  `useState` value, so navigating "View" for a different manager from the Managers page while
  Operations stayed mounted never switched the detail panel. Added a `useEffect` watching
  `searchParams` that re-syncs `selectedManagerId` on every change, not just on first mount.
- **Why:** Closes #65.
- **Contract impact:** none — client-only navigation/state fix.
- **Tests:** `src/pages/__tests__/OperationsPage.test.jsx` — new case: renders Operations at
  `?managerId=m1`, clicks a link that navigates to `?managerId=m2` without remounting, asserts
  `useOperationManagerDetail` is called with `m2`.
- **Docs updated:** docs/modules/OPERATIONS.md §5, docs/TESTING_GUIDE.md (Operations section).
- **Follow-ups / known issues:** none.

---

## 2026-08-17 — Vehicle Requests filter keeps previous rows visible while it reloads

- **Branch:** issue/52-keep-previous-vehicle-requests
- **Modules touched:** Operations (docs/modules/OPERATIONS.md)
- **What changed:** `usePendingVehicleRequests` now sets `placeholderData: keepPreviousData`, so
  toggling the Vehicle Requests status filter (PENDING/APPROVED/REJECTED) keeps the previous
  filter's rows on screen while the next page loads instead of flashing back to a full loading
  skeleton on every toggle.
- **Why:** Closes #52.
- **Contract impact:** none — client-only query behavior change.
- **Tests:** added `src/hooks/__tests__/use-operations.test.jsx` (new file); asserts the query
  keeps showing prior data with `isPlaceholderData: true` mid-refetch, then swaps to the new data.
- **Docs updated:** docs/modules/OPERATIONS.md §5, docs/TESTING_GUIDE.md (Operations section).
- **Follow-ups / known issues:** none.

---

## 2026-08-16 — Resolve the Vehicle Requests table's Vehicle column to a friendly name
- **Branch:** issue/63-vehicle-requests-table-names
- **Modules touched:** docs/modules/OPERATIONS.md (still a stub, not filled in as part of this
  change — see Follow-ups)
- **What changed:**
  - `OperationsPage.jsx`'s `requestColumns` Vehicle column showed the bare `vehicleId` code with
    no lookup. The request's own `payload` already carries a human name — `payload.vehicle.vehicleName`
    for a `CREATE_VEHICLE_ACCOUNT` request, `payload.vehicleSnapshot.vehicleName` for a
    `DELETE_VEHICLE` one (see TrackMe-backend `managerController.createManagerVehicle` /
    `requestVehicleDelete`) — so the column now shows `"name (code)"` when either is present,
    falling back to the raw code otherwise.
  - The issue also flagged the Manager column as "only resolves a name if `managerId` happens to
    already be a populated object." Checked against the current backend
    (`superAdminController.getPendingVehicleRequests`): it always calls
    `.populate('managerId', 'name email')`, so that column's existing `i.getValue()?.name || 'None'`
    is already correct for every response this endpoint can return. No change made there — verifying
    and leaving it alone beats fixing a case that no longer occurs.
- **Why:** Closes #63 — a super-admin reviewing a request had to cross-reference the vehicle code
  against another page to know which vehicle a request was about.
- **Contract impact:** none — reads a field (`payload.vehicle.vehicleName` /
  `payload.vehicleSnapshot.vehicleName`) the backend already sends, no new request.
- **Tests:** `src/pages/__tests__/OperationsPage.test.jsx` — 1 new case (resolves to
  `"name (code)"` given a payload with a vehicle name); the existing raw-code assertion
  (`REQ_A`, no `payload`) still passes unchanged, covering the fallback. Full suite: `npm test` —
  618/619 green; the one pre-existing failure (`ManagerRequestsPage.test.jsx`) is unrelated (see
  the 2026-08-15 and 2026-08-16 #67 entries above). `npm run lint` — clean on both touched files
  (only the four pre-existing `OperationsPage.jsx` exhaustive-deps warnings, confirmed identical
  on `main` before this change).
- **Docs updated:** TESTING_GUIDE.md — new row.
- **Follow-ups / known issues:** `docs/modules/OPERATIONS.md` is still an unwritten stub (same
  pre-existing gap noted for BUSES.md in the #67 entry above) — out of scope for this one-column
  fix.

---

## 2026-08-16 — Resolve route id to a friendly name in the Vehicles table
- **Branch:** issue/67-vehicles-table-route-label
- **Modules touched:** docs/modules/BUSES.md (still a stub — source of truth is
  `ManagerVehiclesPage.jsx`; not filled in as part of this change, see Follow-ups)
- **What changed:**
  - `ManagerVehiclesPage.jsx`'s table Route column showed the raw `routeId` with no lookup,
    while the create wizard's route picker already showed `"name (code)"`. The column now looks
    the id up against the same `useManagerAssignableRoutes` list the picker uses and shows the
    same `"name (code)"` label, falling back to the raw id when the vehicle's route isn't in that
    list (an orphaned/unassignable route — same fallback the edit dropdown already uses).
- **Why:** Closes #67 — the raw code made the table harder to scan than necessary and was
  inconsistent with the rest of the page.
- **Contract impact:** none — display-only, no new API calls (reuses already-fetched route data).
- **Tests:** `src/pages/__tests__/ManagerVehiclesPage.test.jsx` — 2 new cases (resolves to
  `"name (code)"`; falls back to the raw id for an unlisted route). Full suite:
  `npm test` — 617/618 green; the one pre-existing failure
  (`ManagerRequestsPage.test.jsx` — "Managed profile · Daughter") reproduces identically on
  `main` before this change (see the 2026-08-15 entry above) and is unrelated. `npm run lint` —
  clean on both touched files (only the pre-existing `vehicles` exhaustive-deps warning on a line
  this change didn't touch).
- **Docs updated:** TESTING_GUIDE.md — new "Vehicles table route column (issue #67)" row.
- **Follow-ups / known issues:** `docs/modules/BUSES.md` is still an unwritten stub (per its own
  header) and its "source of truth" pointer names `ManagerBusesPage.jsx`/`use-buses.js`, which no
  longer exist under those names (now `ManagerVehiclesPage.jsx`/`use-vehicles.js`) — pre-existing
  drift, not introduced by this change, but flagging it since it makes the stub misleading rather
  than just incomplete. Writing the full module doc is out of scope for this one-column fix.

---

## 2026-08-15 — Fix pre-existing lint errors blocking CI on main
- **Branch:** claude/peaceful-archimedes-6ofp3h
- **Modules touched:** none (build/lint config + test files only)
- **What changed:**
  - `eslint.config.js` only declared `globals.browser`, so any `*.test.{js,jsx}` file using Node
    globals (`Buffer`, `global`) failed `no-undef`. Added a `**/*.test.{js,jsx}` /
    `**/__tests__/**` override that merges in `globals.node`.
  - `src/lib/__tests__/authSession.test.js`: dropped an unused `vi` import and two
    `eslint-disable-next-line no-global-assign` comments that were never actually suppressing
    anything (the rule only fires on reassigning `global` itself, not `global.window`).
  - `src/pages/DeveloperPage.jsx`: escaped two literal `"` characters in JSX text
    (`react/no-unescaped-entities`).
- **Why:** `main`'s "Lint & Build" CI check has been red for unrelated reasons since before this
  session, blocking three already-reviewed, ready-to-merge PRs (#101, #102, #103) from merging —
  `npm run lint` failed with 33 errors none of those PRs touched. Fixing the config here unblocks
  them without touching any product code.
- **Contract impact:** none.
- **Tests:** `npm run lint` — 0 errors (27 pre-existing warnings, all `react-hooks/exhaustive-deps`
  / `react-refresh/only-export-components`, unchanged). `npm run build` — green. `npm test` — 609/610
  green; the one pre-existing failure (`ManagerRequestsPage.test.jsx` — "Managed profile · Daughter"
  text not found) reproduces identically on `main` before this change and is unrelated (CI's
  "Lint & Build" job does not run `npm test` at all, so it wasn't blocking anything, but it's a
  real gap worth a follow-up issue).
- **Docs updated:** this entry only — no module behavior changed.
- **Migration:** none.
- **Follow-ups / known issues:** `ManagerRequestsPage.test.jsx`'s "Managed profile · Daughter"
  assertion fails on current `main` — pre-existing, not introduced here, worth filing as its own
  issue.

## 2026-08-14 — Create-vehicle wizard catches a duplicate Vehicle ID at step 0
- **Branch:** issue/49-duplicate-vehicleid-check
- **Modules touched:** vehicles/fleet (`ManagerVehiclesPage.jsx`) — no dedicated module doc yet
  (see `docs/modules/BUSES.md` stub)
- **What changed:**
  - `validateStep` now takes the already-loaded vehicles list and, at step 0,
    checks the entered `vehicleId` (case-insensitive, trimmed) against it,
    returning an error naming the field instead of letting the manager reach
    Review and get a generic server error three steps later.
- **Why:** issue #49 — duplicate Vehicle ID only surfaced after all 3 wizard steps.
- **Contract impact:** none — client-side only, using data already fetched by
  `useManagerVehicles`. The backend still rejects duplicates server-side too.
- **Tests:** `src/pages/__tests__/ManagerVehiclesPage.test.jsx` — added a case
  asserting a case-insensitive duplicate Vehicle ID is caught at step 0 and the
  wizard does not advance.
- **Docs updated:** n/a (BUSES.md remains the pre-existing stub; unrelated to
  this fix)
- **Follow-ups / known issues:** none

## 2026-08-14 — Disabling a driver now requires confirmation, like other destructive actions
- **Branch:** issue/50-confirm-disable-driver
- **Modules touched:** accounts (`ManagerAccountsPage.jsx`) — no dedicated module doc yet
  (see `docs/modules/ACCOUNTS.md` stub)
- **What changed:**
  - The "Disable driver" row-menu item now opens a `ConfirmDialog` (same
    pattern as "Replace enrollment key" / "Delete driver") stating that it
    immediately revokes the driver's ability to sign in and drive, before
    calling the existing `handleToggleActive`.
  - "Enable driver" (the reverse, low-stakes direction) still fires immediately
    with no dialog — unchanged.
- **Why:** issue #50 — disabling a driver fired immediately from the dropdown
  with no confirmation, unlike the lower-impact "Replace enrollment key" action.
- **Contract impact:** none — same `PUT` driver-update call as before, only the
  UI's confirmation step changed.
- **Tests:** `src/pages/__tests__/ManagerAccountsPage.test.jsx` — new "disable
  driver confirmation" describe block: warns before disabling, backs out on
  Cancel, disables once confirmed, and confirms enabling still has no dialog.
- **Docs updated:** n/a (ACCOUNTS.md remains the pre-existing stub; unrelated
  to this fix)
- **Follow-ups / known issues:** none
- **Follow-ups / known issues:** none

## 2026-08-14 — Vehicle edit enforces the same plate format as create
- **Branch:** issue/41-plate-validation-on-edit
- **Modules touched:** vehicles/fleet (`ManagerVehiclesPage.jsx`) — no dedicated module doc yet
  (see `docs/modules/BUSES.md` stub)
- **What changed:**
  - `handleSaveEdit` now calls `isValidPlate` before submitting and shows the same
    `PLATE_FORMAT_MESSAGE` inline error used on the create wizard, instead of
    sending an invalid plate straight to the server.
- **Why:** issue #41 — plate-format validation ran on create but not on edit.
- **Contract impact:** none — client-side only, the backend already rejects
  invalid plates.
- **Tests:** `src/pages/__tests__/ManagerVehiclesPage.test.jsx` — added a case
  asserting an invalid edit plate shows the inline error and does not call the
  update mutation.
- **Docs updated:** n/a (BUSES.md remains the pre-existing stub; unrelated to
  this fix)
- **Follow-ups / known issues:** none

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
