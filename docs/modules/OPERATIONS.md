# OPERATIONS — Web Admin

Super-admin operational view: system overview, per-manager drill-down, pending bus requests, and
the audit log.

**Status:** `SHIPPED`

**Role:** **super-admin.** This is not a manager surface.

> ⚠️ The retired umbrella doc `docs/modules/web-admin/SHUTTLE_IMPLEMENTATION.md` (421 lines)
> described this page as an **MUI fleet table** with `serviceType` filtering, a "Edit Bus" dialog
> and `bookingEnabled` toggles. **That page no longer exists in that form** — Operations was
> rewritten for the Atlas redesign and is now super-admin oversight built on Radix/shadcn shared
> components. That doc was deliberately **not** mined into this one; carrying it forward would
> have documented a UI that isn't there. Its still-true data invariants were preserved in
> [`TRACKING.md`](TRACKING.md) §6 instead.

---

## 1. Purpose

Give a super-admin a system-wide picture: what's happening across all managers, which bus requests
are waiting, and an auditable record of privileged actions. Manager-scoped fleet work lives in
[`BUSES.md`](BUSES.md); this page sits above it.

## 2. Key files

| File | Responsibility |
|---|---|
| `src/pages/OperationsPage.jsx` | The page. Reads `useSearchParams`, so tab/filter state is URL-addressable. Composes `StatCard`, `DataTable`, `AsyncSection`, `StatusBadge`, `RelativeTime`, `Money`, `ConfirmDialog`, `FormDialog`. |
| `src/hooks/use-operations.js` | `useOperationsOverview()`, `useOperationManagerDetail(managerId)` (gated on `managerId`), `usePendingBusRequests(params)`, `useAuditLogs(params)`. |
| `src/components/shared/*` | The shared table/state/format primitives above — reuse them rather than hand-rolling. |

## 3. Data flow

```
OperationsPage ──> useOperationsOverview()      ──> adminApi.getOperationsOverview()
              ├──> useOperationManagerDetail(id) ──> adminApi.getOperationManagerDetail(id)
              ├──> usePendingBusRequests(params) ──> adminApi.getPendingBusRequests(params)
              └──> useAuditLogs(params)          ──> adminApi.getAuditLogs(params)
```

All four go through `src/api.js` (`adminApi`). Query keys come from `qk.operations.*` and
`qk.busRequests.pending`.

## 4. Contracts

| Kind | Name | Notes |
|---|---|---|
| REST | `getOperationsOverview()` | System-wide aggregates for the stat cards. |
| REST | `getOperationManagerDetail(managerId)` | Per-manager drill-down; query disabled until a manager is selected. |
| REST | `getPendingBusRequests(params)` | Manager bus requests awaiting a decision (`ManagerBusRequest` on the backend). |
| REST | `getAuditLogs(params)` | Privileged-action log (`ManagerAuditLog` on the backend). |

Backend side: [`ADMIN.md`](../../../backend/docs/modules/ADMIN.md).

## 5. Not visible in the frontend

- **Audit entries are written by the backend**, not this page — e.g. revoking a private-route
  membership calls `writeAuditLog` in `managerPrivateRoutesController`. This page is a reader; if
  an action isn't showing up, the gap is that the controller never wrote it.
- **Tab/filter state lives in the URL** (`useSearchParams`), so views are linkable and a reload
  keeps context. Don't move it into local state.
- The selected manager also **re-syncs on `?managerId=` changes after mount**, not just on
  initial load — a `useEffect` watches `searchParams` so a second "View" click from the Managers
  page while Operations is already mounted actually switches the detail panel (issue #65). Don't
  drop this back to a one-time `useState` read.
- `usePendingVehicleRequests` uses `placeholderData: keepPreviousData` so toggling the PENDING/
  APPROVED/REJECTED filter keeps showing the previous filter's rows while the next page loads,
  instead of flashing the table back to a full loading skeleton (issue #52).
- `useOperationManagerDetail` is `enabled: Boolean(managerId)` — it won't fire until a manager is
  picked, which is why the detail pane is empty rather than loading on first paint.
- The reject-request `ConfirmDialog` passes `reasonMaxLength={500}` — a client-side cap with a live
  character count, so an excessively long reason is caught before submit instead of surfacing only
  as a generic server-error toast (issue #69). The backend's `ManagerVehicleRequest.decisionNote`
  has no matching schema-level cap; 500 is a UI-side choice, not a mirrored contract.
- **This page's "Pending Requests" stat and `DashboardPage.jsx`'s `pendingCount` deliberately share
  one cache entry**, not two independently-fetched queries — both call
  `usePendingVehicleRequests({ status: 'PENDING' })` with identical params, which TanStack Query
  hashes to the same key (`qk.vehicleRequests.pending({status:'PENDING'})`), and
  `useReviewVehicleRequest`'s `onSuccess` invalidates `qk.vehicleRequests.all()`, a prefix of that
  key. Approving/rejecting a request on this page refreshes both surfaces with a single refetch,
  no manual cross-page invalidation needed (issue #61) — keep the params identical between the two
  call sites, or this silently splits back into two cache entries.
- **The audit log's "Load older activity" button raises the fetch `limit`, it does not offset-paginate.**
  `useAuditLogs({ limit, managerId })` starts at 60 entries; each click bumps `limit` by 60 (a
  genuine new request, not a client-side re-slice of already-fetched rows) up to 200 — the hard
  cap `superAdminController.js`'s `getAuditLogs` clamps to server-side
  (`TrackMe-backend/docs/modules/ADMIN.md`). Once `limit` is 200 and the server returns exactly
  200 rows, the button is replaced with a note that older history isn't reachable from this view.
  **This is a stopgap, not real pagination** (issue #12): the backend has no skip/cursor param, and
  its `startDate`/`endDate` filters are day-granularity (`endOfDay.setHours(23,59,59,999)`), too
  coarse to use as a same-day pagination cursor without risking dropped or duplicate rows. Reaching
  further back needs a backend change (e.g. a `before`/cursor param) — out of scope for this repo
  alone; flagging here rather than inventing a client-side "page 2" that can't actually reach older
  entries. Switching the manager filter resets `limit` back to 60.
- **A review decision has no undo or reopen path anywhere — not in this UI, not in the backend.**
  Neither `superAdminController.js` nor `superAdminRoutes.js` expose any endpoint to revert or
  re-review a `ManagerVehicleRequest` once its status leaves `PENDING`. Rather than inventing a
  client-side-only "undo" that can't actually reverse the server-side effects of an approval
  (e.g. `Vehicle.create()`), the approve/reject `ConfirmDialog`'s description states plainly that
  the decision is final and cannot be reversed from this portal, so a super-admin knows before
  confirming rather than discovering it after a misclick (issue #77). If a real reopen path is
  ever built, it needs a backend endpoint first — this is not a change to make unilaterally from
  the frontend alone.

## 6. Known gotchas

- **Super-admin only.** Don't reuse these hooks on a manager page — a manager must not see
  system-wide aggregates or other managers' data.
- The old `serviceType` / `bookingEnabled` fleet controls this page used to own now belong to bus
  management. Look in [`BUSES.md`](BUSES.md), not here.
- Aggregates come from the server; don't recompute them client-side from a partial list.

## 7. Tests covering this module

| Layer | File | What it locks |
|---|---|---|
| Unit | `src/hooks/__tests__/` | query keys, `enabled` gating on `managerId` |
| Unit | `src/pages/__tests__/` | overview render, empty/error states, URL param sync |
| E2E | Playwright | super-admin reaches Operations; a manager does not |

## 8. Change protocol

See [`_MODULE_TEMPLATE.md`](../guides/_MODULE_TEMPLATE.md). Role-scoped: any change needs a test
proving a manager cannot reach it.
