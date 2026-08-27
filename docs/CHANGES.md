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

## 2026-08-27 — Enrollment keys readable offline for the session (Offline & Caching Audit, chunk 2)

- **Branch:** feature/audit-remediation-enrollment-key-offline
- **Modules touched:** [`ACCOUNTS.md`](modules/ACCOUNTS.md)
- **What changed:**
  - `useDriverEnrollmentKey` goes from `useMutation` to `useQuery(qk.drivers.enrollmentKey(id),
    { enabled })` — `staleTime: Infinity`, `gcTime: 15min`, fired only on a row's "Show key" click.
    A key opened while online now survives a disconnect (served from the in-memory cache) and
    re-opens instantly after Hide. This GET is **not** audit-logged (only the password read is),
    which is what makes caching it safe — the old "must be a mutation because it's audit-logged"
    rationale in the code/docs was inaccurate for this key and is corrected.
  - New `isCredentialQueryKey` in `src/lib/queryClient.js` — `shouldDehydrateQuery` excludes any
    key segment `'enrollment-key'`, so the plaintext key is **never written to localStorage**. The
    `queryClient.test.js` safety-rail walk asserts it alongside the live-key exclusion.
  - The enrollment-key table column is now its own `<EnrollmentKeyCell>` with a private `shown`
    toggle over its own query instance — the shared reveal mutation and the `revealingIds` /
    `revealedKeys` page maps are gone (per-row independence, issue #68, is now structural). Rotate
    / revert stay mutations but `setQueryData` their result into the reveal cache.
  - Offline gate is now `!isOnline && !hasCachedKey` — an already-cached key opens offline; the
    tooltip for an uncached one reads "Reconnect to open a key you haven't viewed yet".
- **Why:** Offline & Caching Audit §7.10 / chunk 2 — a manager reading a key to a driver at the
  kerb shouldn't be blocked by a wifi blip. Persisting to disk (the audit's literal suggestion)
  was rejected: it would leave every driver's plaintext key in `localStorage` for 24h on a
  possibly-shared admin machine.
- **Contract impact:** none — no endpoint or payload change. `GET /api/manager/drivers/:id/
  enrollment-key` is consumed the same way, just cached client-side now.
- **Tests:** `src/hooks/__tests__/use-drivers.test.jsx` (new — query-not-mutation, cache reuse,
  per-driver isolation, rotate/revert cache write), `src/pages/__tests__/ManagerAccountsPage.test.jsx`
  (reveal tests reworked for the cell + query; new offline describe: disabled-when-uncached +
  tooltip, cached key opens offline, re-open after Hide), `src/lib/__tests__/queryClient.test.js`
  (`isCredentialQueryKey` + walk).
- **Docs updated:** `ACCOUNTS.md` §4/§5/§6/§7/§7a (corrected the "audit-logged" claim, documented
  the in-memory-not-disk cache), `TESTING_GUIDE.md` rows.
- **Follow-ups / known issues:** a key never opened this session still can't be revealed on a cold
  offline start — deliberate, a credential shouldn't be pre-fetched to disk. `getDriverEnrollmentKey`
  lazily creates a key on first read for a keyless driver (idempotent after); unchanged from before.

---

## 2026-08-27 — Offline & Caching Audit §7: the twenty pages, one at a time

- **Branch:** feature/audit-remediation-webadmin-pages
- **Modules touched:** [`DASHBOARD.md`](modules/DASHBOARD.md), [`ACCOUNTS.md`](modules/ACCOUNTS.md),
  [`BUSES.md`](modules/BUSES.md), [`ROUTES.md`](modules/ROUTES.md), [`OPERATIONS.md`](modules/OPERATIONS.md),
  [`ENROLLMENT_REQUESTS.md`](modules/ENROLLMENT_REQUESTS.md), [`AUTH.md`](modules/AUTH.md),
  [`TRACKING.md`](modules/TRACKING.md), [`SETTINGS.md`](modules/SETTINGS.md)
- **What changed:** the page-by-page offline walk the audit's §7 asks for, on top of the already-merged
  Phase 1/2/4 infra. Six shared treatments:
  - **`DataTable`** gained `AsyncSection`'s offline split — no cached rows + offline → calm `OfflineCard`
    instead of the red `ErrorState`; a refetch failure with rows present keeps the table under an amber
    "Offline — showing saved information" strip. One change, six pages (Managers, ManagerAccounts,
    ManagerVehicles, ManagerRequests, Operations ×3).
  - **New `StaleChip`** (`src/components/shared/stale-chip.jsx`), built on `RelativeTime`. Hidden when
    fresh + online, so normal pages look unchanged; appears amber when offline, past a threshold, or
    `loud`. Placed on the manager tables, both dashboards, RoutesPage, and — `loud` — the enrollment
    request queue.
  - **`StatCard`** gained a `stale` + `asOf` state: offline dashboards show the last-known number greyed
    with an "as of HH:MM" line instead of a red dash. DashboardPage also suppresses its page-level
    `ErrorState` when offline (the global `OfflineBanner` already says why, once).
  - **Auth pages** (Login, ForgotPassword ×3, Activate) disable submit while `navigator.onLine` is false
    with a caption; expiring-code pages add a "don't wait" note. Never queued.
  - **Every consequential row action / create button / dialog submit** across the manager pages gates on
    `!isOnline` with an "Unavailable offline" tooltip; `FormDialog`/`ConfirmDialog` gained optional
    `submitDisabled`/`confirmDisabled` props for this (default false — existing callers unaffected).
  - **ManagerTrackingPage**: an offline cold-load now shows the idle "Live tracking unavailable —
    you're offline" panel instead of the red `ErrorState`; the map, markers, and 90s `STALE_AFTER_MS`
    rule are untouched (they're the reference implementation).
  - **EnrollmentFormPage**: calm offline state for a failed schema fetch; Save disabled offline; a
    `useBlocker` + `beforeunload` unsaved-changes guard so a wifi blip can't drop form-builder work.
  - Reference-data `staleTime` overrides: system routes 15 min; organizations / assignable routes /
    enrollment schema 1 h.
- **Why:** TrackMe Offline & Caching Audit (17 Aug 2026) §7 — the web-admin equivalent of the mobile
  apps' completed §5/§6 screen walks. Mockup-first, approved before implementation.
- **Contract impact:** none. No endpoint or socket payload changed; `dataUpdatedAt` is read off the
  existing TanStack query results.
- **Tests:** new `src/components/shared/__tests__/stale-chip.test.jsx`,
  `src/pages/__tests__/EnrollmentFormPage.test.jsx`; offline cases added to `data-table.test.jsx`,
  `stat-card.test.jsx`, `form-dialog.test.jsx`, `confirm-dialog.test.jsx`,
  `DashboardPage.test.jsx`, `ManagerRequestsPage.test.jsx`. Full suite: 65 files / 758 tests pass
  (baseline was 56 / 619, all green). Lint: 0 errors, 28 warnings (unchanged, all pre-existing).
- **Docs updated:** this entry; `docs/TESTING_GUIDE.md` (new "Offline — page-by-page" section);
  the module docs above.
- **Follow-ups / known issues:**
  - ManagerAccounts enrollment keys are **not** readable offline — the audit assumed they were persisted
    with the directory, but `useDriverEnrollmentKey` is an on-demand, audit-logged mutation with no
    cache. "Show key" is disabled offline like the other actions; making keys readable offline needs
    that fetch converted to a persisted query (out of scope here).
  - The `staleTime` overrides are ad-hoc constants, not the audit's `APP_DATA/REFERENCE/LIVE` tier
    system (§9.4) — that remains a separate chunk.

## 2026-08-26 — Merge feature/enrollment-queue-contract-doc: labelled organization details, badge stays live

- **Branch:** feature/merge-enrollment-queue-contract-doc
- **Modules touched:** [`docs/modules/ENROLLMENT_REQUESTS.md`](modules/ENROLLMENT_REQUESTS.md)
- **What changed:**
  - `feature/enrollment-queue-contract-doc` (2026-08-20) predated the 2026-08-21 tabs/driver-filter/Remove
    rewrite below and was never merged. Brought forward the two pieces of it main still lacked instead of
    the whole branch, since most of it had already been superseded:
    - The "Organization details" column now renders the backend's labelled `organizationDetails`
      (`Grade: 4`), falling back to raw `organizationValues` — closing the gap the 2026-08-21 entry
      flagged as "left alone as out of scope".
    - `useEnrollmentRequests` again writes the loaded PENDING queue's length into the badge's count
      cache (guarded to skip while a `?driver=` filter is active, so a partial list can't undercount the
      badge), and `useEnrollmentRequestCount` polls every 30s and refetches on window focus. Main had
      lost this when the 2026-08-21 rewrite reimplemented the hook from an older base; without it the nav
      badge only updated after an approve/reject/remove action, not when a request arrived mid-session.
  - Not adopted: the branch's Contact-only column (drops the email) and its separate `organization.name`
    field — those are UX calls main never made, and are out of scope for a conflict resolution.
- **Why:** picking up genuine, still-unaddressed fixes from an otherwise-superseded branch before
  discarding the rest of it.
- **Contract impact:** none new — `passenger.organizationDetails` was already returned by the backend
  (`managerEnrollmentsController.js`), just unused on this page until now.
- **Tests:** `src/hooks/__tests__/use-enrollment-requests.test.jsx` (brought forward from the branch,
  covers the poll and the badge sync). `npm test` and `npm run lint` re-run clean.
- **Docs updated:** this entry; `docs/TESTING_GUIDE.md` (DataTable per-column cell class row restored).
- **Follow-ups / known issues:** none.

---

## 2026-08-23 — Add missing Playwright e2e specs: login, password-reset, cross-role onboarding (#28)

- **Branch:** issue/28-playwright-e2e-specs
- **Modules touched:** [`docs/modules/AUTH.md`](modules/AUTH.md), [`docs/modules/ACCOUNTS.md`](modules/ACCOUNTS.md), [`docs/modules/BUSES.md`](modules/BUSES.md)
- **What changed:**
  - Issue #28 was filed against an `e2e/` that had only `custom-routes.spec.ts`, but by the time
    this session picked it up `e2e/auth.spec.ts` already existed (added incidentally by later
    session work) and already covered acceptance criteria 1 and 2 almost verbatim — real
    click-through login for both roles, and the full 3-screen forgot-password journey — just under
    the wrong filenames and completely undocumented in `TESTING_GUIDE.md`/`docs/modules/AUTH.md`.
    Rather than duplicate that coverage, split `auth.spec.ts` into the two files the issue actually
    asks for: `e2e/login.spec.ts` (the "Login" and "Session expiry" cases) and
    `e2e/password-reset.spec.ts` (the "Forgot password — full journey" cases), content otherwise
    unchanged, and deleted `auth.spec.ts`.
  - Fixed one trivial pre-existing bug in the moved "Session expiry" test while touching it: it
    asserted `toHaveURL(/\/login$/)`, but `api.js`'s `handleUnauthorized` redirects to
    `/login?reason=session_expired` — a query string the regex's `$` anchor never allowed. This
    was the test's own wrong expectation (confirmed by re-running it against unmodified `main`:
    same failure), not app behavior; widened to `/\/login(\?|$)/`.
  - Added `e2e/cross-role-onboarding.spec.ts` (new): a super-admin fills the real Add Manager
    dialog, signs out, and the manager just created does a real click-through sign-in with those
    exact credentials (not `loginAsManager`) and creates their first vehicle via the create
    wizard's `routeMode: CUSTOM` path — the "set up a new customer" journey spanning both roles in
    one flow, against a mocked backend throughout.
  - `e2e/helpers.ts`: added `mockSuperAdminManagersBackend` (GET/POST `/api/super-admin/managers`
    with in-memory state, following the same pattern as `mockSuperAdminRoutesBackend`) and
    extended `mockManagerBackend` to also mock `GET /api/manager/vehicles` and
    `POST /api/manager/vehicle-accounts` (first vehicle created outright; every one after that
    would return a pending request, mirroring the backend's real branching) — endpoints it didn't
    cover before since no existing spec exercised vehicle creation through the current
    `ManagerVehiclesPage`/`/api/manager/vehicle-accounts` naming.
- **Why:** issue #28 — login and the password-reset journey had no e2e coverage of the real UI
  flow, and there was no test spanning both manager and super-admin roles in one journey.
- **Contract impact:** none — test-only, no source-code behavior changes.
- **Tests:** `npm run test:e2e` — 15/16 green (all 9 new/moved cases across the 3 target specs,
  plus the unaffected `routes.spec.ts` and `settings.spec.ts` suites). The one failure,
  `custom-routes.spec.ts`, is a **pre-existing, already-documented** failure unrelated to this
  change: it navigates to a dead `/manager/buses` route and looks for an "Add bus request" button
  that no longer exists (the page is `ManagerVehiclesPage` at `/manager/vehicles`, button "Add
  Vehicle") — confirmed reproducing identically on `main` before this branch, and already flagged
  in the 2026-08-19 and 2026-08-20 entries above as "not investigated further" by prior sessions.
  Left as-is per that same precedent; genuinely out of scope for #28. `npm test` — 707/707 green.
  `npm run lint` — 0 errors (pre-existing warnings only, none in touched files).
- **Docs updated:** `docs/TESTING_GUIDE.md` (Auth and Session: 2 new rows; Managers: 1 new row for
  the cross-role spec); `docs/modules/AUTH.md`, `docs/modules/ACCOUNTS.md`, `docs/modules/BUSES.md`
  (Tests-covering-this-module rows).
- **Follow-ups / known issues:** `custom-routes.spec.ts`'s dead-route/stale-selector failure (see
  above) still needs a maintainer decision — is `/manager/buses` supposed to redirect, or is the
  spec just stale? — same open question three prior sessions have punted on; still out of scope
  here. `mockManagerBackend`'s `/api/manager/buses` and `/api/manager/bus-accounts` mocks are
  similarly stale (the page and its create endpoint are `/manager/vehicles` /
  `/api/manager/vehicle-accounts` now) — left in place untouched since removing them isn't needed
  to close #28 and isn't this session's call to make.

---

## 2026-08-23 — Close issue backlog: realistic error-response coverage + a real double-redirect fix (#26)

- **Branch:** claude/tender-fermi-fqpwga
- **Modules touched:** [`docs/modules/AUTH.md`](modules/AUTH.md), [`docs/modules/DASHBOARD.md`](modules/DASHBOARD.md)
- **What changed:**
  - **Fixed a real bug found while writing this coverage:** `api.js`'s `handleUnauthorized` was
    called twice for a single request whose token refresh failed — once inside the retry's
    `catch`, then again via the unconditional `isAuthFailure` check right after it, since the
    `catch` had no `return`/`throw` to stop the fall-through. That queued two competing
    `window.location.assign('/login?...')` calls per session expiry. Fixed by letting the `catch`
    fall through to the single unified handler instead of calling it itself. Verified with a
    concurrent-requests test (several queries hitting a dead session at once, sharing one refresh
    call per issue #53, all now redirecting exactly once each to the same place).
  - Added the 409/429/5xx coverage issue #26 asked for: duplicate-conflict messages on
    ManagersPage, RoutesPage, and ManagerVehiclesPage's create forms; a 429 lockout and a 5xx
    server error each showing a distinct login message (App.test.jsx already covered
    wrong-password/deactivated from issue #70); a dedicated test confirming a 5xx never clears the
    session or redirects, as the counterpart to the existing 401/403 coverage.
  - Added partial-failure isolation tests to DashboardPage and OperationsPage: one of several
    parallel queries failing (`useOperationsOverview` / `usePendingVehicleRequests`) now has a
    regression test confirming the other data still renders normally and exactly one scoped
    `ErrorState` appears, not a page-wide banner duplicated onto sections that didn't fail.
  - No other source changes — everything else here was pure test-coverage debt.
- **Why:** working the GitHub issue backlog per `docs/guides/WORKING_AN_ISSUE.md`.
- **Contract impact:** none.
- **Tests:** updated `src/__tests__/App.test.jsx`, `src/__tests__/api.auth.test.js`,
  `src/pages/__tests__/ManagersPage.test.jsx`, `src/pages/__tests__/RoutesPage.test.jsx`,
  `src/pages/__tests__/ManagerVehiclesPage.test.jsx`, `src/pages/__tests__/DashboardPage.test.jsx`,
  `src/pages/__tests__/OperationsPage.test.jsx`. `npm test` (707 passed) and `npm run lint`
  (0 errors) both green.
- **Docs updated:** `docs/TESTING_GUIDE.md` (Auth and Session, Managers, Routes, Buses and
  Requests, Dashboard sections — 9 new rows); `docs/modules/DASHBOARD.md`,
  `docs/modules/ACCOUNTS.md`, `docs/modules/OPERATIONS.md` (Tests-covering-this-module rows).
- **Follow-ups / known issues:** `docs/modules/ROUTES.md` is still the pre-existing
  `PLANNED (doc)` stub — RoutesPage's new 409 test is recorded in `TESTING_GUIDE.md` instead.
  Writing that module doc from scratch is out of scope for this test-coverage issue.

---

## 2026-08-23 — Close issue backlog: ManagerVehiclesPage/DataTable/ErrorBoundary edge-case tests (#27)

- **Branch:** claude/tender-fermi-fqpwga
- **Modules touched:** [`docs/modules/BUSES.md`](modules/BUSES.md)
- **What changed:**
  - Added the regression tests issue #27 asked for: reopening the add-vehicle dialog no longer
    risks stale field data leaking into a fresh attempt; switching Existing → Custom → Existing
    route mode within one open dialog session doesn't silently carry over the earlier pick; a
    rapid double-click on Create/Submit Request only fires one mutation (needed a stateful
    `useCreateManagerVehicle` mock — the existing static mock can't flip `isPending`, so it could
    never have caught a real regression here); an edit against a vehicle deleted in the background
    now has a regression test confirming the server's specific "Vehicle not found" message
    surfaces, not a generic fallback.
  - `DataTable`: added tests confirming page navigation is always driven by the real `data` array,
    not a caller-reported `totalCount` that undercounts it, and that a `totalCount` in the
    thousands still renders correctly.
  - `ErrorBoundary`: added a test crashing with a realistic malformed-API-payload shape
    (`undefined.map()`) instead of only the synthetic `Bomb` thrower, and confirming real content
    actually comes back after Reload (simulated via unmount/remount) rather than only checking the
    mocked `reload()` was called.
  - No source/behavior changes — this issue was pure test-coverage debt.
  - Issue #18 (gate the assignable-routes fetch behind dialog-open) was investigated again and
    left open, same conclusion as three prior passes: implementing it as written would regress the
    vehicles table's route-name column, which now depends on the same query (issue #67, filed
    after #18). Needs a maintainer scope decision, not another routine pass — see the issue's
    comment thread.
- **Why:** working the GitHub issue backlog per `docs/guides/WORKING_AN_ISSUE.md`.
- **Contract impact:** none.
- **Tests:** updated `src/pages/__tests__/ManagerVehiclesPage.test.jsx`,
  `src/components/shared/__tests__/data-table.test.jsx`,
  `src/layout/__tests__/ErrorBoundary.test.jsx`. `npm test` (697 passed) and `npm run lint`
  (0 errors) both green.
- **Docs updated:** `docs/TESTING_GUIDE.md` (Buses and Requests section, 5 new rows).
- **Follow-ups / known issues:** issue #18 still open, needs a maintainer decision (see above).

---

## 2026-08-23 — Audit remediation: tracking count, responsive tables, cache lifetime, bundle split

- **Branch:** feature/audit-remediation
- **Modules touched:** [`docs/modules/TRACKING.md`](modules/TRACKING.md)
- **What changed:**
  - Live tracking no longer contradicts itself. The header count is now `plotted.length`, the
    same set the map draws, so "2 of 5 broadcasting" can never sit above an empty map. The idle
    panel distinguishes "Waiting for coordinates…" (vehicles live, no GPS fix yet) from
    "No vehicle is broadcasting". `selectedPoint` moved into a `useMemo` that keeps the original
    invariant: a vehicle with no marker is never centred on.
  - `DataTable`'s desktop container is `overflow-x-auto` instead of `overflow-hidden`, so a wide
    table scrolls sideways rather than being clipped.
  - Query cache `gcTime` raised to 24h with `networkMode: 'offlineFirst'`, killing the cold-start
    spinner when moving between tabs. Documented in `src/lib/queryClient.js`: nothing is
    persisted to disk, so this only governs in-memory retention.
  - Vite splits `react`, `query` and `maps` vendor chunks.
- **Why:** findings from the 2026-08-17 production-readiness and offline/caching audits, and the
  2026-08-22 security assessment. Tracked in `AUDITDONE.md`.
- **Contract impact:** none. No endpoint or socket payload changed.
- **Tests:** none added; full suite re-run unchanged at 59 files / 631 passing.
- **Docs updated:** this entry.
- **Follow-ups / known issues:** `hasLiveUnplotted` recomputes per render rather than in a
  `useMemo`; harmless at fleet sizes but inconsistent with its neighbours. Separately, the suite
  is timing-flaky under CPU contention: four consecutive runs of identical source gave 0, 9, 5
  and 0 failures, the failing ones while another repo's tests shared the machine. Worth pinning
  down before it is trusted in CI.

---

## 2026-08-21 — A manager can see, and remove, who is enrolled with each driver

- **Branch:** feature/manager-enrolled-riders
- **Modules touched:** [`docs/modules/ENROLLMENT_REQUESTS.md`](modules/ENROLLMENT_REQUESTS.md),
  [`docs/modules/BUSES.md`](modules/BUSES.md) (the Drivers directory)
- **What changed:**
  - `ManagerRequestsPage` is now tabbed **Pending / Enrolled / Declined**, with the tab and an
    optional driver filter both held in the URL (`?status=`, `?driver=`). Enrolled rows carry a
    destructive **Remove**; the date column becomes Enrolled/Declined from `decidedAt`.
  - The Drivers directory gains a **Riders** column: the active count links straight to that
    driver's roster, a pending count sits beside it, and zero renders as "None" with no link.
  - Nav and breadcrumb relabelled "Requests" to "Enrollments"; the path is unchanged. The badge
    still counts PENDING only.
  - `useRemoveEnrollment` invalidates `qk.drivers` as well as the enrollment queries, so the
    Riders count drops without a manual refresh.
- **Why:** approving a request made the rider vanish from the portal, and a rider who redeems a
  public driver's key is written straight to ACTIVE and was never visible at all, so a manager
  could not see who rides with their drivers.
- **Contract impact:** consumes the backend's new `driverId` query, `riders: { active, pending }`
  on `GET /api/manager/drivers`, and `DELETE /api/manager/enrollment-requests/:id`. Backend docs
  updated in its repo (`docs/modules/ADMIN.md`, CHANGES entry the same day).
- **Tests:** `ManagerRequestsPage.test.jsx` extended to 16 cases (tabs, URL contract, filter,
  removal, per-tab empty states); 5 cases added to `ManagerAccountsPage.test.jsx` for the Riders
  column; `AppShell.test.jsx` nav-label expectations updated. Suite is 631 passing, 0 failing,
  which also clears the one pre-existing failure (the "Managed profile · relation" tag the page
  had stopped rendering, restored while rewriting that column).
- **Docs updated:** ENROLLMENT_REQUESTS module doc (purpose, key files, hooks/api/query keys),
  two new TESTING_GUIDE rows.
- **Follow-ups / known issues:** the Organization details column still prints raw field keys
  (`grade:`) even though the backend also returns labelled `organizationDetails`. Left alone as
  out of scope.

---

## 2026-08-20 — Requests table drops the email and names the organization

- **Branch:** feature/enrollment-queue-contract-doc
- **Modules touched:** enrollment requests, [`docs/modules/ENROLLMENT_REQUESTS.md`](modules/ENROLLMENT_REQUESTS.md)
- **What changed:**
  - The Account column is now Contact: the passenger's phone (falling back to the owning
    account's), with the email dropped.
  - "Organization details" is now Organization: the organization's name, then its form answers
    labelled the way that organization asked for them (`Grade: 4`, not `grade: 4`), read from the
    new `organizationDetails` payload with the raw `organizationValues` map as a fallback.
- **Why:** the column showed `grade: 4` and never said which organization asked, and the email
  took a column's width for something a manager does not act on.
- **Contract impact:** consumes the new `organization` and `passenger.organizationDetails` fields
  on `GET /api/manager/enrollment-requests` (backend change in the same session).
- **Tests:** `src/pages/__tests__/ManagerRequestsPage.test.jsx` (contact, organization, and
  fallback cases; the stale "Managed profile · relation" expectation, which the page has not
  rendered for some time, was replaced with the rider-code identity it does render).
  - Both multi-line columns (and the rest of the data columns) now pass
    `meta: { cellClassName: 'align-top' }`, supported by a small addition to `DataTable`, so the
    row reads as one line instead of staggering where a cell has a second line.
- **Docs updated:** [`docs/modules/ENROLLMENT_REQUESTS.md`](modules/ENROLLMENT_REQUESTS.md),
  two TESTING_GUIDE rows.
- **Follow-ups / known issues:** none

---

## 2026-08-20 — Requests nav badge keeps up with requests that arrive mid-session

- **Branch:** feature/enrollment-queue-contract-doc
- **Modules touched:** enrollment requests, [`docs/modules/ENROLLMENT_REQUESTS.md`](modules/ENROLLMENT_REQUESTS.md)
- **What changed:**
  - `useEnrollmentRequestCount` polls every 30s (`ENROLLMENT_COUNT_POLL_MS`) and refetches on
    window focus, instead of holding the value it fetched when the shell first mounted.
  - `useEnrollmentRequests('PENDING')` writes the length of the queue it loaded into the count
    cache, so the Requests page and the nav badge always agree.
- **Why:** a pending request was listed on the Requests page while the "Requests" nav link showed
  no badge. The shell that renders the badge never unmounts, so the count only refreshed on a
  reload or after a decision invalidated it.
- **Contract impact:** none. Same `GET /api/manager/enrollment-requests/count` endpoint.
- **Tests:** `src/hooks/__tests__/use-enrollment-requests.test.jsx` (new).
- **Docs updated:** [`docs/modules/ENROLLMENT_REQUESTS.md`](modules/ENROLLMENT_REQUESTS.md),
  TESTING_GUIDE row.
- **Follow-ups / known issues:** `src/pages/__tests__/ManagerRequestsPage.test.jsx` has one
  pre-existing failure (it expects a "Managed profile · <relation>" tag the page no longer
  renders); untouched by this change.

---

## 2026-08-19 — Record that the enrollment queue's passenger payload is now populated

- **Branch:** main
- **Modules touched:** enrollment requests — [`docs/modules/ENROLLMENT_REQUESTS.md`](modules/ENROLLMENT_REQUESTS.md)
- **What changed:** Docs only. The backend was resolving a queued request's passenger from the
  enrollment's deprecated `userId`, which the rider-profile enrollment path writes as null, so
  every request the current passenger app makes arrived as `passenger: null` and the Passenger and
  Organization details columns sat empty. Fixed backend-side; this page already read `riderCode`
  and `organizationValues` and needed no change. The contract table now lists the real passenger
  shape, including that `passenger._id` is a rider profile id.
- **Why:** Keep the contract table honest about what this page actually receives.
- **Contract impact:** `GET /api/manager/enrollment-requests` — same shape, correctly populated,
  plus `riderCode`, `contactPhone` and `organizationValues`. Backend doc:
  `TrackMe-backend/docs/modules/ADMIN.md`.
- **Tests:** none — docs only.
- **Docs updated:** `docs/modules/ENROLLMENT_REQUESTS.md` (§4 contract, §5 note).
- **Follow-ups / known issues:** `ManagerRequestsPage.test.jsx` fixtures still omit `riderCode`
  and `organizationValues`, so neither column is locked by a test.

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
## 2026-08-22 — Audit log "Load older activity" beyond the initial 60 (issue #12)
- **Branch:** claude/tender-fermi-yvly35
- **Modules touched:** [`docs/modules/OPERATIONS.md`](modules/OPERATIONS.md)
- **What changed:**
  - `OperationsPage.jsx`'s audit log used to hard-cap at `limit: 60` with no way to reach older
    entries — the `DataTable`'s own pager only paginates within whatever was already fetched.
  - Added a "Load older activity" button below the table: each click raises the fetch `limit` by
    60 (a real re-query via `useAuditLogs`, not a client-side re-slice) up to the backend's
    existing hard cap of 200 (`superAdminController.js`'s `getAuditLogs` already clamps `limit` to
    `Math.min(200, ...)` — no backend change needed for this). Once a full 200-row page comes
    back, the button is replaced with a note that older history isn't reachable from this view.
    Switching the manager filter resets the limit back to 60.
  - Added `aria-label="Filter audit log by manager"` to the audit manager-filter `SelectTrigger` (it
    had no accessible name before — needed to test the filter-resets-the-limit behavior, and a
    real a11y gap regardless).
- **Why:** issue #12. This is a documented stopgap, not true pagination — the backend has no
  skip/cursor param, and its `startDate`/`endDate` filters are day-granularity
  (`endOfDay.setHours(23,59,59,999)`), too coarse to use as a same-day cursor without risking
  dropped/duplicate rows. A real fix needs a backend cursor param; out of scope for this repo
  alone, flagged in `docs/modules/OPERATIONS.md` §5 rather than attempted here.
- **Contract impact:** none — uses the `limit` param the backend already accepts and clamps.
- **Tests:** extended `src/pages/__tests__/OperationsPage.test.jsx` (button appears on a full
  page, doesn't on a short page, click re-queries with a higher limit, caps at 200 with a note,
  resets to 60 on manager-filter change). `npm test` (669/669) and `npm run lint` (0 errors, only
  pre-existing warnings) both green; `npm run test:e2e` run locally (13/15 — the 2 failures are
  pre-existing, unrelated to Operations/audit log).
- **Docs updated:** `docs/modules/OPERATIONS.md` §5, `docs/TESTING_GUIDE.md` new row.
- **Follow-ups / known issues:** backend cursor/skip param for the audit log is still needed for
  true unbounded pagination (tracked in `docs/modules/OPERATIONS.md` §5, not filed as a new issue
  here — the same issue #12 covers it).

---

## 2026-08-22 — Verified the Manager/Super-Admin role boundary holds (issue #25)
- **Branch:** claude/tender-fermi-yvly35
- **Modules touched:** none in this repo (verification only, no code change here)
- **What changed:** nothing in `web-admin` — this issue asked whether the Manager/Super-Admin
  role boundary actually holds, and a prior session (2026-08-20) already did the real verification
  and landed the regression test in the backend, since only the backend can prove server-side
  enforcement (web-admin's own e2e suite mocks every response, so it can't). See
  `shazaanashraff/trackme-backend#116` (merged): both `superAdminRoutes.js` and `managerRoutes.js`
  gate with `requireRoles(...)` via `router.use()` — a Manager gets 403 on every super-admin-only
  route tried and vice versa. **Boundary holds — no gap found.**
- **Why:** closing out issue #25 with that finding, since it was left open pending a maintainer's
  confirmation.
- **Contract impact:** none.
- **Tests:** none added here; see `trackme-backend#116`'s `authz-ownership.test.js`.
- **Docs updated:** none needed — no behavior changed.
- **Follow-ups / known issues:** none.

---

## 2026-08-21 — Shrink the dashboard analytics placeholders (issue #15)
- **Branch:** claude/tender-fermi-paswzw
- **Modules touched:** [`docs/modules/DASHBOARD.md`](modules/DASHBOARD.md) (new)
- **What changed:**
  - `DashboardPage.jsx`'s "Analytics" card and `ManagerDashboardPage.jsx`'s "Booking Trend" card
    both used to be a full-height (`py-10`/`py-12`) centered empty-state block with a large icon
    and 1-2 paragraphs of copy — a lot of visible dashboard space for a feature (time-series
    charts) that doesn't exist yet. Both are now a single compact row: a label plus "Not enough
    data yet", no icon-heavy empty state.
  - Kept the exact "Not enough data yet" text (existing tests already asserted it) — only the
    surrounding markup shrank.
- **Why:** issue #15. Its acceptance criteria explicitly allowed either building a real chart or
  shrinking/removing the placeholder; shrinking was chosen since a real chart needs time-series
  data the backend doesn't return yet (documented in `DASHBOARD.md` §5).
- **Contract impact:** none — pure frontend layout change.
- **Tests:** extended `src/pages/__tests__/DashboardPage.test.jsx` and
  `src/pages/__tests__/ManagerDashboardPage.test.jsx` with a case asserting the placeholder has no
  `py-10`/`py-12` full-height-card ancestor. `npm test` (664/664), `npm run lint` (0 errors).
- **Docs updated:** `docs/modules/DASHBOARD.md` filled in from the template (was a stub);
  `docs/TESTING_GUIDE.md` Dashboard section.
- **Follow-ups / known issues:** if either dashboard endpoint ever returns real time-series data,
  replace the placeholder with a real chart in the same change (see `DASHBOARD.md` §8).

---

## 2026-08-21 — Document the vehicles-table full-fleet-load tradeoff (issue #10)
- **Branch:** claude/tender-fermi-paswzw
- **Modules touched:** [`docs/modules/BUSES.md`](modules/BUSES.md)
- **What changed:** Added a §6 gotcha to `BUSES.md` and a short code comment in
  `ManagerVehiclesPage.jsx` documenting that the vehicles table loads a manager's full fleet
  client-side (`GET /api/manager/vehicles` has no `page`/`limit` support) as a deliberate,
  currently-fine tradeoff, not an oversight — `DataTable`'s own row rendering is already paginated,
  so this is a memory/initial-fetch cost scoped to one manager's fleet, not a DOM-bloat issue.
- **Why:** issue #10. Its own acceptance criteria explicitly allows "document the tradeoff and
  revisit when fleet sizes grow" as a valid resolution when current scale doesn't warrant real
  server-side pagination yet — true today. Real pagination would be a backend contract change
  (new query params + a `pagination` response field) that no manager's fleet size currently needs.
- **Contract impact:** none — docs/comment only, no behavior change.
- **Tests:** none added — no behavior changed. `npm test` (662/662) and `npm run lint` (0 errors)
  re-run as a baseline to confirm the comment-only edit introduced no regression.
- **Docs updated:** `docs/modules/BUSES.md` §6.
- **Follow-ups / known issues:** revisit with real server-side pagination if/when a manager's fleet
  size makes the full-fetch cost actually felt.

---

## 2026-08-21 — Real self-service settings for both roles (issue #6)
- **Branch:** issue/6-settings-placeholder
- **Modules touched:** [`docs/modules/SETTINGS.md`](modules/SETTINGS.md) (new)
- **What changed:**
  - `SettingsPage.jsx` (super-admin) and `ManagerSettingsPage.jsx` (manager) no longer render a
    static "under development" placeholder card grid. Both now render a shared
    `AccountSettingsPanel` (`src/components/shared/account-settings-panel.jsx`): edit + save your
    own name, a read-only email field, and a "Change password" button that reuses the existing
    forgot-password flow (there is no dedicated authenticated change-password endpoint).
  - New `adminApi.updateOwnProfile(name)` → `PUT /api/auth/profile` (pre-existing backend route,
    generic across every role — no backend change needed) and `src/hooks/use-profile.js`'s
    `useUpdateOwnProfile()`.
  - `AppShell.jsx` now passes `onUserUpdate` into `<Outlet context={{ user, onUserUpdate }} />`;
    `App.jsx` gained `updateStoredUser()` so a saved name change is reflected in the stored session
    (and thus the topbar) immediately, without a re-login.
  - Remaining not-yet-built items (notification thresholds, operations alerts, org preferences,
    email change) are now labeled "Coming soon" instead of the old `PLANNED_SECTIONS` cards, which
    read like real settings.
- **Why:** issue #6 — both Settings pages were dead ends with zero real functionality.
- **Contract impact:** none. `PUT /api/auth/profile` already existed and was already generic
  across roles; this is a new frontend consumer of an existing endpoint, not a backend change.
- **Tests:** added `src/components/shared/__tests__/account-settings-panel.test.jsx`,
  `e2e/settings.spec.ts`; rewrote `src/pages/__tests__/SettingsPage.test.jsx` and
  `src/pages/__tests__/ManagerSettingsPage.test.jsx` for the real UI. `npm test` (662/662),
  `npm run lint` (0 errors, pre-existing warnings only), `npm run test:e2e` (new spec green; the
  two unrelated pre-existing failures — `auth.spec.ts`'s session-expiry URL match and
  `custom-routes.spec.ts`'s timeout — reproduce identically on `main` before this change).
- **Docs updated:** `docs/modules/SETTINGS.md` filled in from the template (was a stub);
  `docs/TESTING_GUIDE.md` new "Settings" section.
- **Follow-ups / known issues:** email self-service and the role-specific preference sections are
  still not implemented — see `docs/modules/SETTINGS.md` §1/§5. Issue #75 (manager account-details
  nav) depends on this landing first.

---

## 2026-08-20 — Remove docs/code orphaned by the Route Approvals / Private Routes removal (issue #23)
- **Branch:** issue/23-remove-orphaned-tracking-docs
- **Modules touched:** docs/README.md
- **What changed:**
  - `CLAUDE.md`: dropped "private-route keys, route approvals" from the app description and
    removed the `PRIVATE_ROUTES.md`/`ROUTE_APPROVALS.md` rows from the "Where to look" table —
    both pages (and their hooks) were deleted by `fee5555` and never reinstated. Live Tracking
    *was* also removed by that commit but was rebuilt afterward (`7d28648`, `6c03ed4`), so its
    doc/nav references are accurate and were left as-is.
  - `docs/README.md`: dropped `PRIVATE_ROUTES`/`ROUTE_APPROVALS` from the module-doc stub list.
  - Deleted `docs/modules/PRIVATE_ROUTES.md` and `docs/modules/ROUTE_APPROVALS.md` (stubs for
    pages that no longer exist) and `scripts/check-docs.mjs`'s matching MODULES entries.
  - Deleted `src/components/RouteComparisonPanel.jsx` + its test — confirmed orphaned (only
    referenced by its own test file, no live page imports it).
  - `e2e/custom-routes.spec.ts`: removed the two `describe` blocks that navigated to
    `/manager/route-approvals`, a route that no longer exists in `App.jsx` — they were failing
    on a dead route, not skipped/pending. Kept the still-valid "creates a custom-route driver"
    case. Removed the now-unused `MockChangeRequest` import.
  - `docs/TESTING_GUIDE.md`: removed the two traceability rows pointing at the deleted
    `ManagerRouteApprovalsPage.test.jsx`.
- **Why:** issue #23 — docs and orphaned code still referenced the removed Route Approvals /
  Private Routes manager pages.
- **Contract impact:** none — docs/dead-code cleanup only, no runtime behavior change.
- **Tests:** `e2e/custom-routes.spec.ts` trimmed (see above); no new test files.
- **Docs updated:** `CLAUDE.md`, `docs/README.md`, `docs/TESTING_GUIDE.md`, deleted
  `docs/modules/PRIVATE_ROUTES.md` + `docs/modules/ROUTE_APPROVALS.md`.
- **Follow-ups / known issues:** the remaining "creates a custom-route driver" case in
  `custom-routes.spec.ts` times out waiting for the "Add bus request" button in this sandbox —
  confirmed pre-existing on `main` (unrelated to this change, not investigated further here).

## 2026-08-19 — Sri Lanka route map as a translucent mobile background on sign-in (issue #79)
- **Branch:** claude/tender-fermi-vfb7kh
- **Modules touched:** docs/modules/AUTH.md
- **What changed:**
  - `LoginPage.jsx`'s desktop layout shows `SriLankaRouteMap` as a full side panel
    (`display: { xs: 'none', md: 'block' }`); mobile got nothing, just the plain solid
    background, losing the page's visual identity at small widths.
  - Added a second `SriLankaRouteMap` instance, `xs`-only, absolutely positioned behind the
    form at `opacity: 0.12`, wrapped in an `aria-hidden="true"` + `pointerEvents: 'none'`
    container so it's excluded from the accessibility tree and never intercepts clicks meant
    for the form — matching the acceptance criteria's "decorative background, not a competing
    UI element" requirement. The form's own container got `position: relative` (`zIndex` via
    stacking order — the form box is a later sibling) so it sits above the map layer.
    No change to the existing desktop split-panel layout.
- **Why:** issue #79 (low priority, purely visual).
- **Contract impact:** none.
- **Tests:** `src/pages/__tests__/LoginPage.test.jsx` — 1 new case: two map SVGs are present in
  the DOM (jsdom doesn't evaluate the `xs`/`md` CSS breakpoints, so both responsive copies
  always render — same reason the pre-existing map assertion has always had to rely on
  `getByRole`, not counting elements), exactly one is reachable via `getByRole('img', ...)`,
  and the second sits inside an `aria-hidden`, `pointer-events: none` wrapper. Full suite green
  (`npm test`, 666 tests). `npm run lint` clean (0 errors). `npm run build` succeeds. No manual
  mobile-viewport check — no browser/display environment in this session (the issue explicitly
  marks that as "nice-to-have, not required").
- **Docs updated:** `docs/TESTING_GUIDE.md` (Auth and Session row), `docs/modules/AUTH.md`
  (Tests table).
- **Migration:** none.
- **Follow-ups / known issues:** none.

---

## 2026-08-19 — AsyncSection keeps stale data on a background-refetch failure (issue #21)
- **Branch:** claude/tender-fermi-vfb7kh
- **Modules touched:** none of `docs/modules/` — a shared component (`AsyncSection`), not any one page, no contract change
- **What changed:**
  - `AsyncSection` (`src/components/shared/async-section.jsx`) previously replaced its `children`
    with the full `ErrorState` on *any* error — including a background refetch failing after a
    successful initial load, which silently discarded data the page had already shown (e.g. the
    Dashboard's Active Routes table, or Operations' manager detail panel), forcing the user to
    lose visibility into data they already had for no reason.
  - Now: if `data` is already present (non-empty array, or a non-null object) when `error` is
    set, `AsyncSection` keeps rendering `children` behind a warning `Alert` — "Couldn't refresh —
    showing last known data." with a Retry link — instead of replacing them. An error with no
    prior data at all (first load fails) still shows the full `ErrorState`, unchanged.
  - `AsyncSection` is shared by `DashboardPage`, `RoutesPage`, `OperationsPage`, and
    `ManagerDashboardPage` — this one component fix applies the same pattern to all four
    consistently, which is what issue #21 actually asked for ("settle on one consistent
    pattern... applied consistently").
- **Why:** issue #21. Note: the issue's other example — `DashboardPage`'s KPI `StatCard`s showing
  "stale data and an error at the same time" — turned out to already be fixed by issue #51 (a
  StatCard already replaces its value with a "—" + "Failed to load" line on any error, never a
  stale number); left that half of DashboardPage untouched since there was nothing left to fix
  there, and scoped this change to the genuinely-still-present `AsyncSection` regression.
- **Contract impact:** none.
- **Tests:** `src/components/shared/__tests__/async-section.test.jsx` — 4 new cases (banner shown
  + children kept for array data, same for object data, full `ErrorState` still shown with no
  prior data, Retry link wired through). Full suite green (`npm test`, 665 tests, including the
  existing `DashboardPage`/`RoutesPage`/`OperationsPage`/`ManagerDashboardPage` suites with no
  regressions). `npm run lint` clean (0 errors). `npm run build` succeeds.
- **Docs updated:** `docs/TESTING_GUIDE.md` — new row under Dashboard.
- **Migration:** none.
- **Follow-ups / known issues:** none.

---

## 2026-08-19 — Required-field indicators on the Manager and Vehicle forms (issue #11)
- **Branch:** claude/tender-fermi-vfb7kh
- **Modules touched:** docs/modules/ACCOUNTS.md, docs/modules/BUSES.md (no behavior/contract change — UI-only)
- **What changed:**
  - `Label` (`src/components/ui/label.jsx`) gained an optional `required` prop that renders a
    visual `*` marker. The marker renders as a sibling of the `<label>` element rather than nested
    inside it, so `label.textContent` — what `getByLabelText` matches against — stays exactly the
    original field name; this kept every pre-existing anchored query (e.g. `/^password$/i`,
    `/^email$/i`) passing unchanged.
  - Added `aria-required="true"` directly on each actually-mandatory input, which is the real
    signal assistive tech uses — the `*` is `aria-hidden` and purely decorative.
  - Marked fields: `ManagersPage` — Name, Email always; Password/Confirm Password only in create
    mode (the edit dialog's reset fields are genuinely optional, so left unmarked).
    `ManagerVehiclesPage` — Vehicle ID and Number Plate in the create wizard's step 0, Number
    Plate in the edit dialog (the only fields `validateStep`/`handleSaveEdit` actually block
    submission on). Driver Name/Password are conditionally required (only together) and Vehicle
    Name is explicitly optional, so neither got a marker.
- **Why:** issue #11 — these forms only revealed a required field was missing after a failed
  submit attempt.
- **Contract impact:** none.
- **Tests:** `src/components/ui/__tests__/primitives.test.jsx` (2 new `Label` cases: no marker by
  default, marker renders as a sibling without changing the `<label>`'s own text);
  `src/pages/__tests__/ManagersPage.test.jsx` (2 new cases: required fields marked when creating,
  edit-dialog password-reset fields correctly left unmarked); `src/pages/__tests__/
  ManagerVehiclesPage.test.jsx` (2 new cases: create-dialog and edit-dialog marking). Full suite
  green (`npm test`, 661 tests), `npm run lint` clean (0 errors, pre-existing warnings only,
  none in the changed files' logic), `npm run build` succeeds.
- **Docs updated:** `docs/TESTING_GUIDE.md` — two new rows (Managers, Buses and Requests).
- **Migration:** none.
- **Follow-ups / known issues:** issue #75 (manager account self-service settings page) will need
  the same `required` prop once that placeholder is built — noted there.

---

## 2026-08-18 — Operations manager-detail stat cards adapt to tablet widths (issue #22)
- **Branch:** issue/22-operations-tablet-grid
- **Modules touched:** [`docs/modules/OPERATIONS.md`](modules/OPERATIONS.md)
- **What changed:** the manager-detail panel's 4-stat grid (`OperationsPage.jsx`, Total
  Vehicles/Active Vehicles/Bookings/Revenue) was a fixed `grid-cols-2` with no responsive
  breakpoints. Changed to `grid-cols-1 sm:grid-cols-2` so each stat gets its own row on narrow
  widths instead of two cramped columns.
- **Why:** the fixed 2-column layout stayed cramped at all viewport widths, including
  tablet/small-laptop windows, per the 2026-08-07 quality-flaw audit.
- **Contract impact:** none — purely a Tailwind class change, no data/logic touched.
- **Tests:** none added — this is a CSS-only breakpoint change with no new behavior to assert,
  consistent with how prior CSS-only issues in this repo were handled (e.g. issue #79's PR).
  Full suite re-run green: 648/648 (no existing test asserted the old fixed-2-column class).
  `npm run lint`: 0 errors.
- **Docs updated:** docs/TESTING_GUIDE.md.
- **Follow-ups / known issues:** none.

---

## 2026-08-18 — Operations status badges stop conflating deactivation with connectivity (issue #14)
- **Branch:** issue/14-operations-status-badge
- **Modules touched:** [`docs/modules/OPERATIONS.md`](modules/OPERATIONS.md)
- **What changed:**
  - `OperationsPage.jsx`'s manager-overview and vehicle-detail tables mapped `isActive` to a
    `StatusBadge status="online"/"offline"` — but the backend exposes no live-connection signal
    for either resource, only the deactivation flag. Changed both to `active`/`suspended`
    (managers, matching `ManagersPage`'s existing label for the same field) and
    `active`/`deactivated` (vehicles).
  - Added a `deactivated` entry to `status-badge.jsx`'s `STATUS_MAP` (secondary/neutral variant,
    distinct from the danger-red `offline`/`suspended` styling — deliberate deactivation isn't an
    alarm state).
- **Why:** a super-admin scanning either table couldn't tell "this vehicle needs troubleshooting"
  from "someone deliberately deactivated it" — both rendered as the same red "Offline" badge.
- **Contract impact:** none — no backend endpoint changed; this only relabels how the existing
  `isActive` field already returned by `getOperationsOverview`/`getManagerBusDetails` is displayed.
- **Tests:** `src/pages/__tests__/OperationsPage.test.jsx` (rewrote the manager-status assertion,
  added a vehicle-detail case with an active + a deactivated vehicle),
  `src/components/shared/__tests__/status-badge.test.jsx` (new `deactivated` case). Full suite
  green: 648/648. `npm run lint`: 0 errors (pre-existing warnings only, none in touched files).
- **Docs updated:** docs/TESTING_GUIDE.md.
- **Follow-ups / known issues:** if the backend ever adds a real live-connection signal (e.g. from
  the tracking socket), this would be worth revisiting — `online`/`offline` would become accurate
  again and could stack alongside `active`/`deactivated` rather than replace it.

---

## 2026-08-18 — RoutesPage gains Edit, Deactivate/Activate, and Delete (issue #39)
- **Branch:** issue/39-routes-page-edit-delete
- **Modules touched:** [`docs/modules/ROUTES.md`](modules/ROUTES.md) (still `PLANNED` — added a
  correction to its endpoint-path note, full write-up remains a separate task)
- **What changed:**
  - `RoutesPage.jsx` (super-admin only) had create + read-only browsing but no way to fix or
    remove a route once created, despite the backend fully supporting
    `PUT /:routeId`, `PATCH /:routeId/toggle`, and `DELETE /:routeId`. Added an actions column
    (Edit / Deactivate-Activate / Delete) to the province drill-down table, reusing the exact
    `FormDialog` / `ConfirmDialog` / row-scoped-toggle-error pattern already established by
    `ManagersPage.jsx` (including issue #43's persistent, dismissible per-row error on a failed
    toggle).
  - `src/api.js`: added `updateSystemRoute`, `toggleSystemRouteStatus`, `deleteSystemRoute`.
  - `src/hooks/use-system-routes.js`: added `useUpdateSystemRoute`, `useToggleSystemRouteStatus`,
    `useDeleteSystemRoute` (all invalidate `qk.systemRoutes.all()`; delete also invalidates
    `qk.vehicles.all()` since a deleted route unassigns any vehicle still pointed at it).
  - Edit is scoped to the scalar fields (name, source, destination, distance, fare, service type)
    — stops are left as originally created, matching the issue's acceptance criteria; stop-editing
    would be a separate, larger UI (reordering, add/remove) and wasn't asked for here.
- **Why:** a super-admin had no way to fix a typo'd fare or remove a bad route from this page —
  the only path was hitting the API directly.
- **Contract impact:** none — no backend change, this page now calls three endpoints it already
  had `requireManagerOrAbove` access to (super-admin always passes `isRouteOwner`).
- **Tests:** extended `src/pages/__tests__/RoutesPage.test.jsx` (7 new cases: edit dialog
  pre-fill, save payload, toggle call, Activate-label-when-inactive, persistent toggle-error,
  delete-confirm flow, cancel-doesn't-delete) and added `e2e/routes.spec.ts` (4 Playwright cases
  against a mocked backend — edit, toggle round-trip, toggle-failure error, delete) plus
  `loginAsSuperAdmin` / `mockSuperAdminRoutesBackend` helpers in `e2e/helpers.ts`. `npm test`
  (653/653) and the new/changed e2e specs green; `custom-routes.spec.ts` (3 tests) and one
  `auth.spec.ts` session-expiry test fail pre-existing on `main` — unrelated to this change,
  see PR description.
- **Docs updated:** docs/TESTING_GUIDE.md — new row; docs/modules/ROUTES.md — corrected a stale
  note claiming the catalogue lived under `/api/bus/` (it's `/api/routes/`, confirmed against
  `backend/src/routes/routeRoutes.js`).
- **Follow-ups / known issues:** docs/modules/ROUTES.md is still an unwritten `PLANNED` doc —
  out of scope for this issue, flagging for a dedicated pass.

---

## 2026-08-17 — Confirm before discarding the add-vehicle dialog (issue #8)
- **Branch:** claude/tender-fermi-sjt7qr
- **Modules touched:** [`docs/modules/BUSES.md`](modules/BUSES.md)
- **What changed:** The 3-step add-vehicle dialog in `ManagerVehiclesPage.jsx` reset the entire
  form (including several drivers' full details) to empty on any outside-click/Escape dismissal,
  with no confirmation — one misclick could lose several minutes of real work. Added a dirty-check
  (`isCreateFormDirty`) and a "Discard changes?" confirmation (reusing the existing
  `ConfirmDialog`) that intercepts the dialog's own dismiss path (`onOpenChange`) when the form
  has unsaved data; the underlying dialog and its data stay intact until confirmed or cancelled.
  The explicit Cancel button is left as an immediate discard (a deliberate action, not an
  accidental one). Also investigated whether the orphaned `components/shared/step-rail.jsx` was
  meant to solve this per the issue's second bullet — it isn't: it's a labelled overview for an
  ungated, always-visible-sections form layout, a different navigation pattern from this dialog's
  gated wizard, and wiring it in would mean redesigning the dialog rather than a drop-in fix. Left
  an explanatory comment in the source instead of wiring it in.
- **Why:** issue #8 — quality-flaw audit finding, confirmed present.
- **Contract impact:** none — client-only UI change.
- **Tests:** `src/pages/__tests__/ManagerVehiclesPage.test.jsx` — 4 new tests: untouched form
  closes immediately on Escape with no prompt; a dirty form prompts on Escape, keeping the dialog
  and typed data intact, Cancel dismisses just the prompt; confirming Discard closes the dialog
  and resets the form; the explicit Cancel button still discards immediately without a prompt.
  Full suite green (60 files / 646 tests), lint clean.
- **Docs updated:** `docs/TESTING_GUIDE.md` (new row).
- **Follow-ups / known issues:** the edit-vehicle dialog (`FormDialog`, same page) has the same
  no-confirmation-on-dismiss pattern via `setEditVehicle(null)`, but this issue's title/acceptance
  criteria scope to the *add*-vehicle dialog specifically — left as-is, worth a follow-up issue if
  wanted.

---

## 2026-08-17 — Clear production dependency vulnerabilities
- **Branch:** main
- **Modules touched:** none — dependency maintenance, not a feature
- **What changed:** `npm audit fix` (no `--force`) bumped `react-router-dom` 7.13.1 → 7.18.2
  (same major, patch-level) and its transitive chain, closing the deserialization/XSS/open-redirect
  advisories flagged against the pre-7.18 line.
- **Why:** pre-launch security audit.
- **Contract impact:** none.
- **Tests:** none new — full suite re-run (59/59 files, 619/619 tests) on the upgraded
  react-router-dom, no regressions.
- **Docs updated:** this entry only.
- **Follow-ups / known issues:** `npm audit --production` is clean (0 vulnerabilities). Dev-only
  vite/esbuild/vitest advisories remain (never ship in the built app) — the available fix is a
  major Vite bump, deliberately not forced to avoid risking the already-verified Vercel build.

---

## 2026-08-17 — Show the managed-profile tag on the requests table
- **Branch:** main
- **Modules touched:** `docs/modules/ENROLLMENT_REQUESTS.md` (not yet updated — see follow-ups)
- **What changed:** `ManagerRequestsPage`'s "Student / employee" column now renders "Managed
  profile" (plus " · <relation>" when `passenger.relation` is set, e.g. "Managed profile ·
  Daughter") under the name when `passenger.isManagedProfile` is true. The Account column and the
  confirm-dialog label already handled the managed-profile case correctly (falling back to
  `passenger.account.email`/`phoneNumber`); only the name cell was missing this.
- **Why:** `ManagerRequestsPage.test.jsx`'s managed-profile suite already asserted this text
  existed — the test was written ahead of the implementation and caught a real gap, spotted while
  verifying the suite after a large upstream sync.
- **Contract impact:** none — `passenger.isManagedProfile`/`passenger.relation` already existed on
  the enrollment request payload; this only changed how the existing fields are displayed.
- **Tests:** no new tests — the existing `ManagerRequestsPage.test.jsx` assertion (line 133) now
  passes; full file verified green (8/8).
- **Docs updated:** none yet — `docs/modules/ENROLLMENT_REQUESTS.md` should get a line noting the
  managed-profile tag if that doc describes the requests table's columns.
- **Follow-ups / known issues:** none.

## 2026-08-17 — Operations review dialog warns a decision is final before confirming

- **Branch:** issue/77-operations-review-finality-warning
- **Modules touched:** Operations (docs/modules/OPERATIONS.md)
- **What changed:** Once a super-admin confirmed an approve/reject decision on a vehicle request,
  there was no undo, no edit-after-submit, and no visible warning beforehand that the decision
  couldn't be reversed. Checked the backend first: neither `superAdminController.js` nor
  `superAdminRoutes.js` expose any endpoint to revert or re-review a `ManagerVehicleRequest` once
  its status leaves `PENDING` — so a real undo/reopen feature isn't something this frontend-only
  session can build (it would need a new backend endpoint first, a decision beyond a single-repo
  routine to make unilaterally). Took the issue's own "at minimum" fallback instead: the approve
  and reject `ConfirmDialog` descriptions now both state plainly that the decision is final and
  cannot be reversed from this portal, so a super-admin knows before confirming, not after a
  misclick.
- **Also:** restored 5 rows in `docs/TESTING_GUIDE.md` (issues #43, #69, #61, #68, #66) that an
  earlier PR in this session (#114) accidentally reverted — see that entry's note in this file and
  the dedicated commit on this branch for the full explanation.
- **Why:** Closes #77.
- **Contract impact:** none — copy-only change, no request/response shape touched.
- **Tests:** `src/pages/__tests__/OperationsPage.test.jsx` — 2 new cases: the finality warning
  text appears in both the approve and the reject `ConfirmDialog`.
- **Docs updated:** docs/modules/OPERATIONS.md §5, docs/TESTING_GUIDE.md (Operations section).
- **Follow-ups / known issues:** if a real reopen/undo path is ever built, it needs a backend
  endpoint first (`ManagerVehicleRequest` has no state transition out of APPROVED/REJECTED today)
  — update this warning's copy to match at that point, don't just delete it.

## 2026-08-17 — ErrorState distinguishes network failures from server rejections by status

- **Branch:** issue/76-network-vs-server-rejection-errors
- **Modules touched:** Auth (docs/modules/AUTH.md)
- **What changed:** Every failure through `api.js` collapsed into the same generic `Error`, and
  `error-state.jsx`'s `humanizeError` classified it purely by sniffing the message text for words
  like "network" — which a real fetch-level failure's message doesn't reliably contain (varies by
  browser/cause: "Failed to fetch", Safari's "Load failed", a timeout `AbortError`). Rewrote
  `humanizeError` to check `error.status` first (`api.js`'s `request()` only ever sets it for a
  response that DID come back): a status-bearing error gets the existing 401/403/404/5xx-specific
  copy (or its own message verbatim if the status doesn't match one of those, unchanged behavior
  for e.g. a 400 validation rejection); an error with **no** `status` at all — regardless of
  message wording — now renders a distinct, retry-oriented "Network error. Check your connection
  and try again." Every `AsyncSection`/`ErrorState` consumer (`DashboardPage`,
  `ManagerDashboardPage`, `ManagerTrackingPage`, `OperationsPage`, `RoutesPage`) gets this for
  free from the one shared component.
- **Why:** Closes #76.
- **Contract impact:** none — client-only error-classification change, no request/response shape
  touched.
- **Tests:** `src/components/shared/__tests__/error-state.test.jsx` — 4 new cases: a simulated
  network failure (no `.status`, an unrecognized message) gets the network message; `.status`
  wins over message wording when both are present; a status-bearing but otherwise-unmatched
  rejection still shows its own message verbatim (unchanged); an `ErrorState`-level render test
  for the network case with a retry button. Verified the new tests aren't vacuous by temporarily
  reverting `error-state.jsx` and confirming they fail. One existing fixture
  (`ManagerTrackingPage.test.jsx`) used a status-less `Error('Fleet failed')` to stand in for a
  generic fetch failure — gave it `.status = 400` so it represents what it always meant to (a real
  rejection with a custom message), since under the stricter new logic a truly status-less error
  is genuinely a network failure now.
- **Docs updated:** docs/modules/AUTH.md §5, docs/modules/TRACKING.md §5 (its REST-error fixture
  touched, cross-referenced to AUTH.md rather than duplicating the logic), docs/TESTING_GUIDE.md
  (Auth and Session section).
- **Follow-ups / known issues:** this fixes the shared `ErrorState` component (query-level load
  failures on the 5 pages that use it) but does not touch the ~38 individual
  `toast(\`Failed: ${err.message}\`)` call sites across mutation handlers app-wide — those still
  show the raw backend/network message with no network-vs-rejection distinction. Auditing and
  updating every one of those is a much larger, separate piece of work outside this issue's
  acceptance criteria (which named `error.status`'s existing role, already exercised by
  `ErrorState`, as the mechanism to use — it didn't ask for an app-wide toast-copy rewrite).

## 2026-08-17 — Regression test proving login shows a distinct deactivated-account message

- **Branch:** issue/70-distinct-login-failure-messages
- **Modules touched:** Auth (docs/modules/AUTH.md — filled in from the template as part of this
  change, since the doc was still a stub)
- **What changed:** Issue #70 flagged the login error as "a single generic string for both wrong
  password and account deactivated." Verified against current `main` before changing anything:
  the backend's `authController.login` already returns a distinct 401 `"Invalid email or
  password"` vs. 403 `"Account has been deactivated. Contact super admin."`, and
  `LoginShell.handleLogin`'s catch (`setError(err.message || 'Login failed')`) already renders
  whatever the backend sent with no normalization — `LoginPage` displays it as-is. No source
  change was needed. A test already existed for the wrong-password case but none for the
  deactivated case, which is exactly what the issue's own acceptance criteria calls for
  ("a test for each distinct login-failure message") — added the missing one.
- **Why:** Closes #70.
- **Contract impact:** none — test-only change, no source modified.
- **Tests:** `src/__tests__/App.test.jsx` — new case: a 403 deactivated-account rejection shows
  its own message and explicitly asserts the wrong-password message is absent, proving the two
  don't collapse into one string.
- **Docs updated:** docs/modules/AUTH.md (written from the template — was previously an unfilled
  stub), docs/TESTING_GUIDE.md (Auth and Session section).
- **Follow-ups / known issues:** none.

## 2026-08-17 — Regression test proving Dashboard/Operations pending counts stay in sync

- **Branch:** issue/61-shared-pending-requests-invalidation
- **Modules touched:** Operations (docs/modules/OPERATIONS.md)
- **What changed:** Issue #61 flagged `DashboardPage.jsx`'s `pendingCount` and `OperationsPage.jsx`'s
  pending-request count as "two independently-fetched queries with no shared cache key or
  invalidation trigger." Verified against current `main`: both already call
  `usePendingVehicleRequests({ status: 'PENDING' })` with identical params — the same hook, same
  key — so TanStack Query already treats them as one cache entry, and
  `useReviewVehicleRequest`'s `onSuccess` already invalidates `qk.vehicleRequests.all()`, a prefix
  of that key. No source change was needed; the premise no longer holds (or never did within a
  single browser tab/QueryClient — the issue's "different tab" scenario is genuinely a separate
  QueryClient instance and out of scope for client-side cache sharing). What was missing was a
  test actually proving it, which the issue's own acceptance criteria calls for regardless. Added
  one, and confirmed it's not vacuous by temporarily removing the invalidation call and watching
  it fail (single call site, `getPendingVehicleRequests` called once more than expected) before
  reverting.
- **Why:** Closes #61.
- **Contract impact:** none — test-only change, no source modified.
- **Tests:** `src/hooks/__tests__/use-operations.test.jsx` — new case: two independent
  `usePendingVehicleRequests({status:'PENDING'})` consumers share one network call; a
  `useReviewVehicleRequest` mutation refreshes both from a single invalidation (exactly 2 total
  fetch calls: initial + one shared refetch).
- **Docs updated:** docs/modules/OPERATIONS.md §5 (documents the deliberate shared cache key —
  don't let the two call sites' params drift apart), docs/TESTING_GUIDE.md (Operations section).
- **Follow-ups / known issues:** `docs/modules/DASHBOARD.md` is still an unwritten stub (per its
  own header); not filled in here since this change touches no `DashboardPage.jsx` code and the
  issue's named owning module is `OPERATIONS.md` — same reasoning as the #63/#67 entries above for
  deferring an unrelated stub.

## 2026-08-17 — Manager status-toggle and delete failures show a persistent, specific error

- **Branch:** issue/43-manager-row-error-state
- **Modules touched:** Accounts (docs/modules/ACCOUNTS.md)
- **What changed:** `ManagersPage.jsx`'s `handleToggleStatus`/`handleConfirmDelete` showed only a
  generic `toast(\`Failed: ${err?.message}\`)` on failure — no inline, row-level, or field-level
  error, and the row just silently reverted. Added a `toggleErrors` map (`managerId -> message`)
  so a failed Activate/Deactivate now leaves a persistent, dismissible error next to that row's
  action buttons (cleared automatically on a successful retry of the same row). The delete
  `ConfirmDialog` now follows the same `deleteError`-state pattern `ManagerVehiclesPage` already
  uses (issue #48): it stays open on failure with the error shown inline via the dialog's `error`
  prop instead of only a toast.
- **Why:** Closes #43.
- **Contract impact:** none — client-only error-surfacing change.
- **Tests:** `src/pages/__tests__/ManagersPage.test.jsx` — 4 new cases: persistent row error on a
  failed toggle; dismissing that error; the error clearing on a successful retry of the same row;
  the delete `ConfirmDialog` staying open with the error shown inline on a failed delete.
- **Docs updated:** docs/modules/ACCOUNTS.md §5/§7, docs/TESTING_GUIDE.md (Managers section).
- **Follow-ups / known issues:** none.

## 2026-08-17 — Vehicle table shows a pending-deletion indicator

- **Branch:** issue/66-vehicle-delete-request-pending-indicator
- **Modules touched:** Buses (docs/modules/BUSES.md — filled in from the template as part of this
  change, since the doc was still a stub)
- **What changed:** `ManagerVehiclesPage.jsx`'s delete action is actually a request needing
  super-admin approval ("Delete Req" / "Request Vehicle Deletion"), but the Status column only
  ever showed Active/Inactive — nothing in the table indicated a deletion request was in flight
  once the confirm dialog closed. The page now also reads `useManagerRequests()` (already fetched
  elsewhere on this page's mutations, no new endpoint call), derives the set of vehicle ids with a
  PENDING `DELETE_VEHICLE` request, and shows a second "Deletion pending" badge next to the
  Active/Inactive one for matching rows. The badge clears itself via the existing query
  invalidation once the request leaves PENDING — no new polling.
- **Why:** Closes #66.
- **Contract impact:** none — reads a field (`GET /api/manager/requests`) this page's own
  mutations were already invalidating; no new request added.
- **Tests:** `src/pages/__tests__/ManagerVehiclesPage.test.jsx` — 3 new cases: badge shows for a
  PENDING `DELETE_VEHICLE` request on the matching vehicle; no badge once the request is no longer
  PENDING; no badge for a request against a different vehicle or a different request type.
- **Docs updated:** docs/modules/BUSES.md (written from the template — was previously an unfilled
  stub), docs/TESTING_GUIDE.md (Routes/Vehicles section).
- **Follow-ups / known issues:** none.

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

## 2026-08-17 — Vercel deploy readiness: SPA rewrite
- **Branch:** main
- **Modules touched:** none of `docs/modules/` — deploy/infra config, not a feature
- **What changed:** added `vercel.json` with a catch-all rewrite to `/index.html`. The app uses
  `BrowserRouter` (`src/main.jsx`), so a static host with no rewrite rule 404s on any direct/deep
  link (e.g. refreshing on `/manager/tracking`) — Vercel doesn't fall back to `index.html` by
  default the way `vite preview`'s dev server does.
- **Why:** pre-deploy audit before putting web-admin on Vercel.
- **Contract impact:** none.
- **Tests:** none — static hosting config, not app behavior. Verified with a local
  `npm run build && npm run preview`: build succeeds, the app renders and redirects to `/login`
  correctly, and a direct request to an arbitrary deep path returns the SPA shell (200,
  `text/html`) rather than a 404 — matching what the Vercel rewrite will produce.
- **Docs updated:** this entry only.
- **Follow-ups / known issues:** `npm install` was needed to sync `node_modules` with
  `@vis.gl/react-google-maps` (already in `package.json`/lock from an earlier merged change,
  ManagerTrackingPage's map) — the build failed before that with an unresolved-import error,
  unrelated to this change itself.

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
