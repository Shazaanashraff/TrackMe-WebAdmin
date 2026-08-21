# SETTINGS — Web Admin

Manager and super-admin self-service account settings.

**Status:** `SHIPPED` (partial) — self-service password change only. Both pages previously
rendered a static "planned features" placeholder with no working functionality at all
(`TrackMe-WebAdmin#6`); notification preferences, organization settings, and profile
name/email editing (`TrackMe-WebAdmin#75`) are still not implemented.

**Role:** `SettingsPage` (`/settings`) is super-admin only; `ManagerSettingsPage`
(`/manager/settings`) is manager only — see [`../../src/App.jsx`](../../src/App.jsx)'s two
role-branched `<Routes>` trees. Both pages render the same shared component for the one real
capability they have.

---

## 1. Purpose

Give a signed-in manager or super-admin a way to manage their own account. Today that's limited
to changing their own password (self-service, requiring the current password) — every other
"planned" capability shown before this change was fabricated UI copy with no backing feature and
has been removed rather than left as a permanent dead end.

## 2. Key files (one job each)

| File | Responsibility |
|---|---|
| `src/pages/SettingsPage.jsx` | Super-admin Settings screen — renders `ChangePasswordCard`. |
| `src/pages/ManagerSettingsPage.jsx` | Manager Settings screen — renders `ChangePasswordCard`. |
| `src/components/shared/change-password-card.jsx` | Shared self-service password-change form (current/new/confirm, reveal toggle, inline validation + server error). |
| `src/components/shared/password-input.jsx` | Masked input with a show/hide toggle, reused across auth + settings. |

## 3. Data flow

```
SettingsPage / ManagerSettingsPage → ChangePasswordCard → adminApi.changePassword() → PUT /api/auth/change-password
```

`ChangePasswordCard` calls `adminApi.changePassword` directly (no TanStack Query hook — this is a
one-shot form submission with no cached list to invalidate). All requests still go through
`src/api.js`'s `request()` helper, so bearer-token attachment and 401 refresh/redirect apply.

## 4. Contracts (API)

| Kind | Name | Shape / notes |
|---|---|---|
| REST | `PUT /api/auth/change-password` | `{ currentPassword, newPassword }` → `{ success, message }`. 401 if `currentPassword` is wrong; 400 on a `newPassword` that fails the complexity rule (8–64 chars, upper/lower/number/special). See `backend/docs/modules/AUTH.md`. Self-service only — distinct from `PATCH /api/super-admin/managers/:id/reset-password` and `PATCH /api/manager/drivers/:id/password`, which are an admin resetting *someone else's* password without knowing the old one (see [`ACCOUNTS.md`](ACCOUNTS.md)). |

## 5. Not visible in the frontend

- The backend writes the new password to the caller's shared `Identity`, not a per-role field —
  if a manager's login is ever attached to another role (not currently possible for `admin`/
  `super-admin`, see backend `AUTH.md` §1's isolation invariant), a password change here would
  change that login everywhere. Not reachable today, but is *why* the endpoint is a plain
  identity write rather than something scoped to the `Manager`/`SuperAdmin` collection.

## 6. Known gotchas / regressions

- `TrackMe-WebAdmin#75` (no reachable page for a manager to edit name/email) is only partially
  addressed: password self-service now exists, but name/email editing does not. Left open.
- Notification preferences and organization settings (previously shown as "planned" cards on both
  pages) are not implemented. If/when they are, extend these pages rather than reintroducing a
  placeholder card for them.

## 7. Tests covering this module

| Layer | File | What it locks |
|---|---|---|
| Unit | `src/components/shared/__tests__/change-password-card.test.jsx` | Masked fields; submits `{currentPassword, newPassword}`; success clears the form; client-side mismatch blocks submission with no request sent; server error (e.g. wrong current password) shown inline without clearing the form. |
| Unit | `src/pages/__tests__/SettingsPage.test.jsx`, `src/pages/__tests__/ManagerSettingsPage.test.jsx` | Each page renders the real form (not the old placeholder copy). |
| E2E | `e2e/settings.spec.ts` | Super-admin and manager both change their password through the real UI; wrong-current-password server error surfaces inline; mismatched new/confirm is blocked client-side with no network request. |

See [`ADDING_A_TEST.md`](guides/ADDING_A_TEST.md) for how to add one, and the
[`TESTING_GUIDE.md`](../TESTING_GUIDE.md) traceability row that must exist.

## 8. Change protocol

Any change to this module must:
1. Run this module's tests green as a baseline (`npx vitest run` for the files above,
   `npx playwright test e2e/settings.spec.ts`).
2. Implement **screen → shared component → `adminApi.*` → `src/api.js`** (never add a second
   HTTP layer).
3. Add/adjust tests for every changed behaviour (a change with no test is not done).
4. Re-run green (`npm run lint`, `npm test`, `npm run test:e2e`).
5. Update **this doc** + the [`TESTING_GUIDE.md`](../TESTING_GUIDE.md) row, and append a
   [`CHANGES.md`](../CHANGES.md) entry before pushing. A backend contract change (like adding
   `PUT /api/auth/change-password`) also needs `backend/docs/modules/AUTH.md` updated in the same
   cross-repo change.
