# SETTINGS — Web Admin

Manager and super-admin self-service account settings.

**Status:** `SHIPPED` — minimal scope (issue #6). Name editing and a password-change entry point
for both roles. Email is read-only (no self-service change-email endpoint exists yet); everything
else on the old placeholder pages remains a documented "coming soon" list, not real functionality.
Managers also get a **QR boarding** card: one switch per route they own (2026-10-08).

---

## 1. Purpose

Give a manager or super-admin a real, working page behind their "Settings" nav item instead of a
static "under development" placeholder. In scope: edit your own display name, and reach the
existing forgot-password flow to change your password. Out of scope for now: changing your login
email (no backend endpoint), and the role-specific preference sections both pages used to list as
"planned" (notification thresholds, operations alerts, organization defaults) — those are still
unbuilt and are labeled "Coming soon" rather than implied to work.

## 2. Key files

| File | Responsibility |
|---|---|
| `src/pages/SettingsPage.jsx` | Super-admin settings route (`/settings`). |
| `src/pages/ManagerSettingsPage.jsx` | Manager settings route (`/manager/settings`). |
| `src/components/shared/account-settings-panel.jsx` | The actual self-service UI (`AccountSettingsPanel`), shared by both pages above — name edit + save, read-only email, "Change password" entry point. |
| `src/hooks/use-profile.js` | `useUpdateOwnProfile()` — the profile mutation. |
| `src/hooks/use-route-qr.js` | `useOwnRouteQr(managerId)` (the manager's own routes with their QR state) and `useSetRouteQr()`, used by `QrBoardingCard` in `ManagerSettingsPage.jsx`. |
| `src/App.jsx` | Owns the `auth` state; `updateStoredUser()` merges a profile patch into the stored session so the topbar reflects a new name without a re-login. |
| `src/layout/AppShell.jsx` | Passes `user` and `onUserUpdate` into `<Outlet context={{ user, onUserUpdate }} />` — how both settings pages (and any future page) reach the current account and the update callback. |

## 3. Data flow

```
AccountSettingsPanel (useOutletContext: user, onUserUpdate)
  → useUpdateOwnProfile() → adminApi.updateOwnProfile(name) → PUT /api/auth/profile
  → onUserUpdate({ name }) → App.jsx's updateStoredUser() → writeStoredAuth() (localStorage/sessionStorage)

"Change password" button → navigate('/forgot-password', { state: { email } })
  → existing ForgotPasswordRequestPage → ...verify... → ...reset... (see AUTH.md)

QrBoardingCard (manager only)
  → useManagerAssignableRoutes() → GET /api/manager/routes        (ids only: no owner, no QR state)
  → one GET /api/routes/:routeId per listed route (qk.routeDetail) → keep routes whose managerId is the user
  → switch → useSetRouteQr() → PATCH /api/manager/routes/:routeId/qr { qrEnabled }
  → the saved value is written into that route's qk.routeDetail cache entry
```

No TanStack Query cache entry backs the current account — it lives in `authSession`'s stored
auth object (`auth.user`), not a query key, so there is nothing to invalidate on save; the mutation
result is applied directly via `onUserUpdate`.

## 4. Contracts (API / storage)

| Kind | Name | Shape / notes |
|---|---|---|
| REST | `PUT /api/auth/profile` | `{ name }` → `{ success, data }`. Pre-existing, generic across every account role (`protect` only — no role middleware); web-admin only sends `name`, never `phoneNumber` (that field is rider-only). Backend: [`backend/docs/modules/AUTH.md`](../../../backend/docs/modules/AUTH.md). |
| REST | `POST /api/auth/forgot-password/request-otp` (+ verify/reset) | Unchanged — reused as-is for the "Change password" entry point. See [`AUTH.md`](AUTH.md) / `backend/docs/modules/AUTH.md`. |
| REST | `GET /api/routes/:routeId` | Full route document, including `managerId` and `qrEnabled`, which `GET /api/manager/routes` leaves out. |
| REST | `PATCH /api/manager/routes/:routeId/qr` | `{ qrEnabled }` → `{ success, data: { routeId, qrEnabled } }`. Owner only: another manager's or a public route answers 403. |
| Storage | `admin-auth` (localStorage or sessionStorage, per `rememberMe`) | `auth.user.name` is updated in place by `App.jsx`'s `updateStoredUser()` after a successful save — see `src/lib/authSession.js`. |

No contract change: `PUT /api/auth/profile` already existed and already supported every role: this
module is a new **consumer**, not a backend change. Nothing here needed a `docs/CHANGES.md`-style
cross-repo coordination note beyond this doc itself.

## 5. Not visible in the frontend

- **There is no authenticated "change password" endpoint.** The "Change password" button doesn't
  submit a form on this page — it navigates to the existing, pre-built forgot-password flow
  (`/forgot-password`), passing the account's own email via `location.state` so the first step can
  (optionally) be prefilled. This works while already logged in; the flow itself doesn't require
  being logged out.
- **Email is intentionally read-only.** There is no backend endpoint for a manager/super-admin to
  change their own login email. The field is shown (for context) but disabled, with an inline note
  to contact a super-admin instead of silently omitting it.
- **The "Coming soon" list on each page is inert text, not a feature.** It replaced the previous
  `PLANNED_SECTIONS` cards (which read like real settings) specifically so the page stops implying
  functionality that isn't there — see the no-fabricated-data precedent set when the super-admin
  topbar bell was removed rather than backed by invented data (PR for issue #3-adjacent AppShell
  work).

## 6. Known gotchas

- `AccountSettingsPanel` reads `user`/`onUserUpdate` from `useOutletContext()`, not props — it must
  be rendered under `AppShell`'s `<Outlet>` (i.e. inside `ProtectedShell`'s route tree). Rendering
  it standalone in a test needs a `MemoryRouter`/`Routes`/`Route` wrapper that supplies the same
  outlet context (see the page-level tests for the pattern).
- Saving a name change updates the *stored* session immediately (so the topbar/avatar reflect it
  without a reload), but does not re-fetch `GET /api/auth/me` — it trusts the mutation's own
  response (`{ data: { name } }`).
- Role scoping is unchanged and not cosmetic here either: `SettingsPage` is only reachable from the
  super-admin route tree and `ManagerSettingsPage` only from the manager one (see `src/App.jsx`) —
  this module didn't touch that gate.
- **QR boarding reaches the apps with a delay.** The switch drives the driver app's On board card
  and Scan action and the passenger app's Vehicle pass. The driver app caches the route, so a
  change can take up to about 5 minutes to show there. The card costs one request per assignable
  route, because no list endpoint returns the owner or the QR state.

## 7. Tests covering this module

| Layer | File | What it locks |
|---|---|---|
| Unit/RTL | `src/components/shared/__tests__/account-settings-panel.test.jsx` | name edit/save, save disabled while unchanged, empty-name client-side rejection, server-error rendering, `onUserUpdate` + toast on success, "Change password" navigation with the account email |
| Unit/RTL | `src/pages/__tests__/SettingsPage.test.jsx`, `src/pages/__tests__/ManagerSettingsPage.test.jsx` | each page wires `useOutletContext()` into the panel; "Coming soon" replaces the old "under development" copy; QR boarding shows a switch only for owned routes, set to their state, saves through the manager endpoint, stays put and toasts on failure, and says so when there are no owned routes |
| E2E | `e2e/settings.spec.ts` | full mocked-backend flow for both roles: edit name → save → toast; manager flow also toggles QR boarding on an owned route (one PATCH with `{ qrEnabled: true }`) and confirms "Change password" reaches `/forgot-password` |

See [`ADDING_A_TEST.md`](../guides/ADDING_A_TEST.md) and the [`TESTING_GUIDE.md`](../TESTING_GUIDE.md)
"Settings" section.

## 7a. Offline behaviour (Offline & Caching Audit §7)

Both settings pages are local preferences and stay fully usable offline. `AccountSettingsPanel`
disables its "Save changes" button while `navigator.onLine` is false and shows a "You need a
connection to save profile changes." warning; "Change password" (which navigates to the
forgot-password flow) is unaffected.

## 8. Change protocol

See [`_MODULE_TEMPLATE.md`](../guides/_MODULE_TEMPLATE.md). If a real email-change or
authenticated password-change endpoint is ever added on the backend, this doc's §4 contracts table
and §1 scope note both need updating in the same change, and the corresponding placeholder note in
§5 should be removed rather than left stale.


## Responsive behaviour (375px floor)

Breakpoint contract for this page (Tailwind defaults, no custom screens):
base = one column, nothing side by side; `sm` (640) = content reflow, form and stat grids
regain columns; `md` (768) = structural, the sidebar becomes a Sheet and a `DataTable`
becomes a card list; `lg` (1024) = density (3 and 4 column stat grids, the tracking split).

Enforced by [`e2e/responsive-manager.spec.ts`](../../e2e/responsive-manager.spec.ts) at
375x800 in light and dark. See [`CHANGES.md`](../CHANGES.md) 2026-09-22.

Page specifics: no responsive work was needed. The layout comes from
`components/shared/account-settings-panel.jsx`, which is already
`grid-cols-1 lg:grid-cols-2`.
