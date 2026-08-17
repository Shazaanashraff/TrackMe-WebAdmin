# BUSES — Web Admin

Manager-scoped vehicle (bus) fleet management: create/edit/delete-request, route assignment,
driver assignment, and vehicle-account password reset.

**Status:** `SHIPPED`

**Role:** **manager only** (`/manager/vehicles`). Super-admin's fleet-wide view of the same data is
[`OPERATIONS.md`](OPERATIONS.md) (system aggregates + the approval queue for the requests this
page creates) — that split is deliberate: this page is the write side for one manager's own fleet,
Operations is the super-admin read/approve side across every manager.

---

## 1. Purpose

Let a manager see, create, edit, and (via a super-admin-approved request) delete the vehicles in
their own fleet, assign each to a route and driver, and reset a vehicle account's password. A
manager's **first** vehicle is created immediately; every vehicle after that — and every deletion —
goes through `ManagerVehicleRequest` and needs super-admin approval (see
[`ADMIN.md`](../../../backend/docs/modules/ADMIN.md)).

## 2. Key files

| File | Responsibility |
|---|---|
| `src/pages/ManagerVehiclesPage.jsx` | The page: fleet table, create wizard (3 steps), edit dialog, delete-request `ConfirmDialog`. |
| `src/hooks/use-vehicles.js` | `useManagerVehicles`, `useManagerAssignableRoutes`, `useManagerRequests`, `useCreateManagerVehicle`, `useUpdateManagerVehicle`, `useRequestDeleteVehicle`, `useResetVehicleAccountPassword`. |
| `src/lib/serviceTypes.js` | Shared `SERVICE_TYPES` constant (also used by RoutesPage/OperationsPage — issue #19). |

## 3. Data flow

```
ManagerVehiclesPage ──> useManagerVehicles()          ──> adminApi.getManagerVehicles()
                    ├──> useManagerAssignableRoutes()  ──> adminApi.getManagerAssignableRoutes()
                    ├──> useManagerRequests()          ──> adminApi.getManagerRequests()
                    ├──> useCreateManagerVehicle()      ──> adminApi.createManagerVehicle()
                    ├──> useUpdateManagerVehicle()      ──> adminApi.updateManagerVehicle()
                    └──> useRequestDeleteVehicle()      ──> adminApi.requestDeleteVehicle()
```

All requests go through `src/api.js` (`adminApi`). `useCreateManagerVehicle` and
`useRequestDeleteVehicle` both invalidate `qk.vehicles.all()` **and**
`qk.vehicles.managerRequests()` on success, so the fleet table and the requests list used for the
pending-deletion badge (§5) stay in sync without a manual refetch.

## 4. Contracts

| Kind | Name | Notes |
|---|---|---|
| REST | `GET /api/manager/vehicles` | The manager's own fleet. |
| REST | `GET /api/manager/vehicles/:vehicleId` | Single vehicle (used by `useManagerVehicle`, not this page directly). |
| REST | `PUT /api/manager/vehicles/:vehicleId` | Update (edit dialog). |
| REST | `POST /api/manager/vehicle-accounts` | Create. First vehicle for the manager creates outright (`data.vehicle` in the response); every subsequent one creates a pending `ManagerVehicleRequest` instead — same endpoint, response shape tells you which happened. |
| REST | `POST /api/manager/vehicles/:vehicleId/delete-request` | Always a request, never an immediate delete — 409s if a PENDING `DELETE_VEHICLE` request already exists for that vehicle. |
| REST | `GET /api/manager/requests` | Every `ManagerVehicleRequest` for this manager, any type/status — this page filters it client-side to `type === 'DELETE_VEHICLE' && status === 'PENDING'` for the pending-deletion badge. |
| REST | `GET /api/manager/routes` | Assignable routes for the create/edit route pickers. |
| REST | `PATCH /api/manager/vehicle-accounts/:vehicleId/reset-password` | Vehicle-account password reset. |

Backend side: [`BUSES.md`](../../../backend/docs/modules/BUSES.md) (vehicle CRUD),
[`ADMIN.md`](../../../backend/docs/modules/ADMIN.md) (`ManagerVehicleRequest` approval flow).

## 5. Not visible in the frontend

- **The delete button says "Delete Req" and the dialog says "Request Vehicle Deletion"** — this is
  not a euphemism, it genuinely only files a request; nothing is removed until a super-admin
  approves it on Operations. The Status column shows a second "Deletion pending" badge
  (`StatusBadge status="pending"`) whenever `useManagerRequests()` has a PENDING `DELETE_VEHICLE`
  request for that `vehicleId`, so the table doesn't go silent after a request is submitted
  (issue #66). The badge clears itself once the request leaves PENDING (approved/rejected) or a
  refetch drops it, purely from the existing query invalidation — no extra polling.
- **The Route field is the same validated dropdown on both create and edit** — `useManagerAssignableRoutes()` backs both; there is no free-text route entry anywhere on this page (issue #13/#40 — the edit dialog used to be free text, fixed in `887c9aa`).
- A failed delete-request keeps the `ConfirmDialog` open with the error shown inline via its
  `error` prop, and the typed reason is preserved for a retry (issue #48) — it does not silently
  revert to a toast-only failure.
- The Route table column resolves `routeId` to `"name (code)"` via the same assignable-routes list
  the pickers use, falling back to the raw id for an orphaned/unassignable route (issue #67).

## 6. Known gotchas

- **Manager-scoped, not global.** `getManagerVehicles`/`getManagerRequests` are always scoped
  server-side to the caller's own fleet — this page must never be given a `managerId` param to
  view another manager's vehicles; that's what Operations' super-admin drill-down is for.
- The "first vehicle is immediate, later ones are a request" rule lives in the backend
  (`managerController.createManagerVehicle`), not here — don't try to infer it from response status
  codes alone without checking `data.vehicle` vs. a pending-request payload.
- `pendingDeleteVehicleIds` (the badge's backing set) is derived purely from `useManagerRequests()`
  data already being fetched for other purposes — don't add a second endpoint call for it.

## 7. Tests covering this module

| Layer | File | What it locks |
|---|---|---|
| Unit | `src/pages/__tests__/ManagerVehiclesPage.test.jsx` | create wizard (route modes, driver step, plate/ID validation), edit dialog (validated route dropdown), delete-request flow incl. failure-preserves-reason (issue #48) and the pending-deletion badge (issue #66), route/vehicle table columns (issue #67). |

## 8. Change protocol

See [`_MODULE_TEMPLATE.md`](../guides/_MODULE_TEMPLATE.md). Role-scoped: any change needs a test
proving a super-admin route/session cannot reach this page's manager-scoped data.
