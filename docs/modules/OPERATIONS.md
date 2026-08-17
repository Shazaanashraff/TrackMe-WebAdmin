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
