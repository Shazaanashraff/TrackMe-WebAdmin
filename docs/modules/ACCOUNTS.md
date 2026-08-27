# ACCOUNTS — Web Admin

Manager accounts (super-admin CRUD) and driver accounts (manager CRUD), including
enrollment-key/password reveal, rotation, and revert.

**Status:** `SHIPPED`

**Role:** split by page — `ManagersPage` is **super-admin only** (manages `Manager` accounts);
`ManagerAccountsPage` is **manager only** (manages that manager's own `Driver` accounts). Neither
page is reachable by the other role — see [`../../src/App.jsx`](../../src/App.jsx)'s two
role-branched `<Routes>` trees.

---

## 1. Purpose

Let a super-admin create/deactivate/reset manager accounts and assign them vehicles
(`ManagersPage.jsx`), and let a manager create/deactivate/reset driver accounts under their own
fleet, including revealing a driver's password, enrollment key, and rotating/reverting that key
(`ManagerAccountsPage.jsx`). The audit trail for privileged actions is read separately in
[`OPERATIONS.md`](OPERATIONS.md) — this doc is the write side only.

## 2. Key files

| File | Responsibility |
|---|---|
| `src/pages/ManagersPage.jsx` | Super-admin: manager directory, create/edit/deactivate, vehicle assignment, password reset. |
| `src/pages/ManagerAccountsPage.jsx` | Manager: driver directory, create/edit/delete/disable, password + enrollment-key reveal, key rotate/revert. |
| `src/hooks/use-managers.js` | `useManagers`, `useCreateManager`, `useUpdateManager`, `useUpdateManagerStatus`, `useDeleteManager`, `useResetManagerPassword`, `useAssignVehiclesToManager`. |
| `src/hooks/use-drivers.js` | `useManagerDrivers`, `useOrganizations`, `useCreateDriver`, `useUpdateDriver`, `useDeleteDriver`, `useResetDriverPassword`, `useDriverPassword`, `useDriverEnrollmentKey`, `useRotateDriverEnrollmentKey`, `useRevertDriverEnrollmentKey`. |
| `src/components/shared/confirm-dialog.jsx` | Shared confirm/reject-with-reason modal, reused for disable-driver and reject flows across the app. |

## 3. Data flow

```
ManagersPage        ──> useManagers()/useCreateManager()/…  ──> adminApi.*Manager*()   ──> /api/super-admin/managers…
ManagerAccountsPage ──> useManagerDrivers()/useCreateDriver()/… ──> adminApi.*Driver*() ──> /api/manager/drivers…
```

All requests go through `src/api.js` (`adminApi`), which is the one HTTP layer (`client.js`'s
`request()` helper attaches the bearer token and handles 401 refresh/redirect). Query keys come
from `qk.managers.*` / driver queries invalidate on the relevant mutation's `onSuccess`.

## 4. Contracts

| Kind | Name | Notes |
|---|---|---|
| REST | `GET /api/super-admin/managers` | Manager directory (paginated params passed through). |
| REST | `POST /api/super-admin/managers` | Create manager. |
| REST | `PUT /api/super-admin/managers/:id` | Update manager. |
| REST | `PATCH /api/super-admin/managers/:id/status` | Activate/deactivate manager. |
| REST | `DELETE /api/super-admin/managers/:id` | Delete manager (unassigns their vehicles — invalidates `qk.vehicles.all()` too). |
| REST | `PATCH /api/super-admin/managers/:id/reset-password` | Super-admin resets a manager's password. |
| REST | `PATCH /api/super-admin/managers/:id/assign-vehicles` | Bulk vehicle (re)assignment. |
| REST | `GET/POST/PUT/DELETE /api/manager/drivers[/:id]` | Driver CRUD, manager-scoped server-side. |
| REST | `GET /api/manager/drivers/:id/password` | Returns the driver's password in the clear — **audit-logged on every call server-side**; never prefetch or call outside a direct manager request. |
| REST | `GET /api/manager/drivers/:id/enrollment-key` | Reveal current enrollment key. |
| REST | `POST /api/manager/drivers/:id/enrollment-key/rotate` | Replace the key; old one stops working. Response includes `canRevert`. |
| REST | `POST /api/manager/drivers/:id/enrollment-key/revert` | Undo the last rotation, while still recoverable. |

Backend side: [`ADMIN.md`](../../../backend/docs/modules/ADMIN.md) (manager CRUD, audit log),
[`DRIVER.md`](../../../backend/docs/modules/DRIVER.md) (driver accounts), four-collection identity
model in [`AUTH.md`](../../../backend/docs/modules/AUTH.md).

## 5. Not visible in the frontend

- **Password and enrollment-key reveal are mutations, not queries**, even though they're reads —
  the server audit-logs every call, so React Query must never cache, retry, or background-refetch
  them. `useDriverPassword`/`useDriverEnrollmentKey` are deliberately `useMutation`, fired only on
  an explicit "Show" click.
- **Per-row pending state for the shared reveal mutation is tracked locally, not derived from the
  mutation object.** `useDriverEnrollmentKey()` returns one mutation instance shared by every row
  in the driver table; its own `isPending`/`variables` reflect only the most recent call. Clicking
  "Show key" on driver A, then driver B before A resolves, would make A's row silently drop its
  loading state if pending were read off the mutation directly. `ManagerAccountsPage` instead
  keeps a `revealingIds` map (`driverId -> boolean`), set before `mutateAsync` and cleared in a
  `finally`, so each row's pending state is independent of what any other row is doing (issue #68).
- **Disabling a driver asks first; enabling does not** — disabling revokes sign-in immediately, so
  it routes through `ConfirmDialog`; re-enabling is one click since it's reversible.
- Deleting a manager cascades to unassigning their vehicles client-side (query invalidation), but
  the actual vehicle-unassignment happens server-side — this page doesn't recompute it.
- **A failed status toggle or delete never just reverts silently.** `ManagersPage` tracks a
  `toggleErrors` map (`managerId -> message`) so a failed Activate/Deactivate leaves a persistent,
  dismissible error next to that row's action buttons instead of only a transient toast; it clears
  on a successful retry of that same row. The delete `ConfirmDialog` follows the same
  `deleteError`-state pattern already used by `ManagerVehiclesPage`'s delete-request dialog (issue
  #48): it stays open on failure with the error shown inline via the dialog's `error` prop, rather
  than closing and leaving only a toast (issue #43).

## 6. Known gotchas

- **Role scoping is not cosmetic.** `ManagersPage` hooks must never be reachable from a manager
  route and vice versa — the backend is the real gate, but a UI regression that let one role reach
  the other's page would still be a bug worth its own test.
- `ManagerAccountsPage`'s enrollment-key `ConfirmDialog` (rotate) is destructive-styled and always
  requires confirmation; the reveal ("Show key") action is not, since it's non-destructive.
- The password-reveal endpoint returns the plaintext password — do not add caching, prefetch-on-
  hover, or any path that calls it without a direct user action.

## 7. Tests covering this module

| Layer | File | What it locks |
|---|---|---|
| Unit | `src/pages/__tests__/ManagersPage.test.jsx` | manager directory CRUD, button migration (issue #49-ui), persistent row-scoped status-toggle error + inline delete-failure error (issue #43), required-field asterisk + `aria-required` on Name/Email/(create-mode) Password/Confirm — not on the edit dialog's optional password-reset fields (issue #11); 409 duplicate-email conflict shows the server's specific message, not a generic one (issue #26). |
| Unit | `src/pages/__tests__/ManagerAccountsPage.test.jsx` | driver directory, create-driver validation, enrollment-key rotate/revert/reveal, per-row reveal pending independence (issue #68), disable-driver confirmation (issue #50). |
| Unit | `src/components/shared/__tests__/confirm-dialog.test.jsx` | shared confirm/reject-with-reason modal behavior reused by disable-driver here. |
| e2e (Playwright) | `e2e/cross-role-onboarding.spec.ts` | a super-admin creates a manager via the real Add Manager dialog, then that manager does a real click-through sign-in (not seeded) and creates their first vehicle — the "set up a new customer" journey spanning both roles in one flow (issue #28). |

## 7a. Offline behaviour (Offline & Caching Audit §7)

`useManagers` / `useManagerDrivers` persist to disk. Offline:

- The `DataTable` shows cached rows under an amber "Offline — showing saved information" strip, or a
  calm `OfflineCard` if nothing is cached — never the red `ErrorState`. A `StaleChip` sits by the
  table, and the stat cards render `stale`/`asOf`.
- Every mutating control gates on `!isOnline` with an "Unavailable offline" tooltip: ManagersPage's
  Add / Edit / Activate-Deactivate / Delete and the FormDialog/ConfirmDialog submits;
  ManagerAccountsPage's Add Driver and the whole row action menu (edit, replace/restore key, view /
  reset password, enable/disable, delete).
- **Enrollment keys are not readable offline.** `useDriverEnrollmentKey` is an on-demand,
  audit-logged mutation with no cache, so "Show key" is disabled offline. The audit assumed keys
  were persisted with the directory; making them readable offline needs that fetch converted to a
  persisted query (tracked, not done here).

## 8. Change protocol

See [`_MODULE_TEMPLATE.md`](../guides/_MODULE_TEMPLATE.md). A role-scoping change needs a test
proving the other role still cannot reach it.
