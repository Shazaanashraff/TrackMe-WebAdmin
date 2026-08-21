# SETTINGS — Web Admin

Manager and super-admin self-service account settings.

**Status:** `SHIPPED` — minimal scope (issue #6). Name editing and a password-change entry point
for both roles. Email is read-only (no self-service change-email endpoint exists yet); everything
else on the old placeholder pages remains a documented "coming soon" list, not real functionality.

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
| `src/hooks/use-profile.js` | `useUpdateOwnProfile()` — the one mutation this module adds. |
| `src/App.jsx` | Owns the `auth` state; `updateStoredUser()` merges a profile patch into the stored session so the topbar reflects a new name without a re-login. |
| `src/layout/AppShell.jsx` | Passes `user` and `onUserUpdate` into `<Outlet context={{ user, onUserUpdate }} />` — how both settings pages (and any future page) reach the current account and the update callback. |

## 3. Data flow

```
AccountSettingsPanel (useOutletContext: user, onUserUpdate)
  → useUpdateOwnProfile() → adminApi.updateOwnProfile(name) → PUT /api/auth/profile
  → onUserUpdate({ name }) → App.jsx's updateStoredUser() → writeStoredAuth() (localStorage/sessionStorage)

"Change password" button → navigate('/forgot-password', { state: { email } })
  → existing ForgotPasswordRequestPage → ...verify... → ...reset... (see AUTH.md)
```

No TanStack Query cache entry backs the current account — it lives in `authSession`'s stored
auth object (`auth.user`), not a query key, so there is nothing to invalidate on save; the mutation
result is applied directly via `onUserUpdate`.

## 4. Contracts (API / storage)

| Kind | Name | Shape / notes |
|---|---|---|
| REST | `PUT /api/auth/profile` | `{ name }` → `{ success, data }`. Pre-existing, generic across every account role (`protect` only — no role middleware); web-admin only sends `name`, never `phoneNumber` (that field is rider-only). Backend: [`backend/docs/modules/AUTH.md`](../../../backend/docs/modules/AUTH.md). |
| REST | `POST /api/auth/forgot-password/request-otp` (+ verify/reset) | Unchanged — reused as-is for the "Change password" entry point. See [`AUTH.md`](AUTH.md) / `backend/docs/modules/AUTH.md`. |
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

## 7. Tests covering this module

| Layer | File | What it locks |
|---|---|---|
| Unit/RTL | `src/components/shared/__tests__/account-settings-panel.test.jsx` | name edit/save, save disabled while unchanged, empty-name client-side rejection, server-error rendering, `onUserUpdate` + toast on success, "Change password" navigation with the account email |
| Unit/RTL | `src/pages/__tests__/SettingsPage.test.jsx`, `src/pages/__tests__/ManagerSettingsPage.test.jsx` | each page wires `useOutletContext()` into the panel; "Coming soon" replaces the old "under development" copy |
| E2E | `e2e/settings.spec.ts` | full mocked-backend flow for both roles: edit name → save → toast; manager flow also confirms "Change password" reaches `/forgot-password` |

See [`ADDING_A_TEST.md`](../guides/ADDING_A_TEST.md) and the [`TESTING_GUIDE.md`](../TESTING_GUIDE.md)
"Settings" section.

## 8. Change protocol

See [`_MODULE_TEMPLATE.md`](../guides/_MODULE_TEMPLATE.md). If a real email-change or
authenticated password-change endpoint is ever added on the backend, this doc's §4 contracts table
and §1 scope note both need updating in the same change, and the corresponding placeholder note in
§5 should be removed rather than left stale.
