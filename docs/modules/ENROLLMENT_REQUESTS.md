# ENROLLMENT REQUESTS — Web Admin

The manager's approval queue: passengers who redeemed a **private** driver's enrollment key wait
here for a decision before they're enrolled. **Manager-scoped only** — a manager sees only requests
against their own drivers; super-admins have no drivers of their own and this page/count is
disabled for them.

**Status:** `SHIPPED`

---

## 1. Purpose

Redeeming a public driver's enrollment key enrols a passenger immediately. Redeeming a **private**
driver's key raises a request instead (`status: 'PENDING'`) — this page is where the manager
approves or declines it. A pending count badges the "Enrollments" nav link app-wide (`AppShell`), not
just on this page, so a manager notices without opening it.

Since [multi-rider profiles](../../../backend/docs/modules/PROFILES.md) shipped, a request's
passenger can be a **managed profile** (a child, an employee) with no email/phone of its own — see
§4/§6 for how this page surfaces the owning account instead.

The page is also the **enrolled roster**, not only the queue. Approving a request used to make the
rider disappear from the portal entirely, and a rider who redeemed a *public* driver's key was never
visible in the first place, because they are written straight to `ACTIVE` and never queued. The
manager therefore had no way to answer "who rides with this driver". The **Enrolled** tab is that
answer, `?driver=` narrows it to one driver, and **Remove** is the manager-side counterpart to a
rider leaving. The Drivers page reaches it through a Riders count per driver
(`ManagerAccountsPage`), which comes from `riders: { active, pending }` on
`GET /api/manager/drivers`.

## 2. Key files (one job each)

| File | Responsibility |
|---|---|
| `src/pages/ManagerRequestsPage.jsx` | The page, tabbed **Pending / Enrolled / Declined**. `DataTable` of the rows for the selected status; Passenger/Account/Organization/Driver/Driver ID columns, then Requested (Pending) or Enrolled/Declined from `decidedAt` (the rest). Pending rows offer Approve/Decline, Enrolled rows offer Remove; all three open the same shared `ConfirmDialog`. `passengerLabel()` disambiguates a managed profile in the dialog title. Tab and driver filter both live in the URL (`?status=`, `?driver=`). |
| `src/hooks/use-enrollment-requests.js` | `useEnrollmentRequests(status, driverId)`, `useEnrollmentRequestCount()` (nav badge, disabled for super-admins), `useApproveEnrollmentRequest`/`useRejectEnrollmentRequest`/`useRemoveEnrollment` — a decision invalidates both the list and the count together, and a removal also invalidates `qk.drivers` so the Riders count on the Drivers page follows it down. |
| `src/api.js` | `getEnrollmentRequests(status, driverId)`, `getEnrollmentRequestCount`, `approveEnrollmentRequest`, `rejectEnrollmentRequest`, `removeEnrollment` — all through the one `adminApi` HTTP layer. |
| `src/lib/queryKeys.js` | `qk.enrollmentRequests.{list(status, driverId), count(), all()}` — keyed by driver too, so one driver's roster and the full list cache separately. |
| `src/layout/AppShell.jsx` | Reads `useEnrollmentRequestCount()` to badge the "Enrollments" nav link on every manager screen. The badge still counts PENDING only. |

## 3. Data flow

```mermaid
flowchart TD
  A[ManagerRequestsPage] --> B["useEnrollmentRequests('PENDING')"] --> C["GET /api/manager/enrollment-requests?status=PENDING"]
  D[AppShell nav] --> E[useEnrollmentRequestCount] --> F["GET /api/manager/enrollment-requests/count"]
  A -->|Approve/Decline| G[ConfirmDialog] --> H[useApprove/RejectEnrollmentRequest]
  H --> I["POST /api/manager/enrollment-requests/:id/{approve,reject}"]
  I --> J["invalidate qk.enrollmentRequests.all() → list + count both refetch"]
```

## 4. Contracts (API / socket / storage)

Verified against the backend 2026-08-12.

| Kind | Endpoint | Client fn | Shape / notes |
|---|---|---|---|
| REST | `GET /api/manager/enrollment-requests?status=PENDING` | `getEnrollmentRequests` | `{data: Request[]}`. `Request.passenger = {name, email?, isManagedProfile, relation?, account?: {name, email, phoneNumber}}` — see backend `managerEnrollmentsController.js#requestSummary`. |
| REST | `GET /api/manager/enrollment-requests/count` | `getEnrollmentRequestCount` | `{data: {count}}` — pending count for the nav badge, disabled (`enabled: false`) for super-admins to avoid a guaranteed 403. |
| REST | `POST /api/manager/enrollment-requests/:id/approve` | `approveEnrollmentRequest` | Enrols the passenger with the driver; moves the request out of the pending list. |
| REST | `POST /api/manager/enrollment-requests/:id/reject` | `rejectEnrollmentRequest` | Leaves the passenger unenrolled; they may redeem the key again later. |

> Backend contract: [`backend/docs/modules/ADMIN.md`](../../../backend/docs/modules/ADMIN.md) §managerEnrollmentsController,
> and [`backend/docs/modules/PROFILES.md`](../../../backend/docs/modules/PROFILES.md) §6 for the
> `passenger.account` shape on a managed profile.

## 5. Not visible in the frontend

- **Approval is server-side.** This page renders what the backend says is pending for *this
  manager's* drivers — there is no client-side scoping to bypass or misconfigure.
- **A managed profile has no email/phone of its own.** `passenger.email` is only ever present for a
  primary (self-registered) rider; a managed profile's `passenger.account.{email,phoneNumber}` is
  the owning account holder's, resolved backend-side via the profile's shared `identityId`. The
  Account column and the confirm-dialog title both fall back to it — see `passengerLabel()` and the
  `account` column's `cell()` in `ManagerRequestsPage.jsx`.
- **The nav badge count is fetched on every manager screen**, not just this page — a manager sees
  it's non-zero before ever opening Requests.

## 6. Known gotchas / regressions

- Don't read `passenger.email` alone to decide whether a passenger "has no contact info" — check
  `passenger.account?.email`/`phoneNumber` too, or a managed profile shows a false "None".
- `passengerLabel()` only appends the account email when `isManagedProfile && account.email` are
  both present — a managed profile whose account genuinely has no email yet (a pre-migration edge
  case) still reads by name alone, no broken parenthetical.
- One `ConfirmDialog` serves both Approve and Decline — `pendingDecision.approved` picks the
  copy/label/`destructive` styling. Don't split it into two dialogs; the shared state (`target`,
  `isDeciding`) would have to be duplicated.

## 7. Tests covering this module

| Layer | File | What it locks |
|---|---|---|
| Unit | `src/pages/__tests__/ManagerRequestsPage.test.jsx` | table renders requests, Approve/Decline → `ConfirmDialog` → mutation call, managed-profile tag + Account column fallback (email/phone), `passengerLabel()` in the dialog title, empty/loading/error states |
| Unit | `src/layout/__tests__/AppShell.test.jsx` | nav badge reads the pending count |

See [`../guides/ADDING_A_TEST.md`](../guides/ADDING_A_TEST.md) and the traceability row in
[`../TESTING_GUIDE.md`](../TESTING_GUIDE.md).

## 8. Change protocol

Any change to this module must:
1. Run this module's tests green as a baseline (`ManagerRequestsPage.test.jsx`, `AppShell.test.jsx`).
2. Implement **page → hook → `api.js`** (never call `fetch`/`axios` directly).
3. Add/adjust tests for every changed behaviour.
4. Re-run green (`npm test`; `npm run lint`).
5. Update **this doc** + the [`TESTING_GUIDE.md`](../TESTING_GUIDE.md) row, and append a
   [`CHANGES.md`](../CHANGES.md) entry before pushing. A passenger-shape change here is also a
   backend contract change — update `backend/docs/modules/ADMIN.md`/`PROFILES.md` in the same PR.
