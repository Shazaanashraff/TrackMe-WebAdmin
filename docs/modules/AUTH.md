# AUTH — Web Admin

Login, forgot/reset password, session persistence, refresh, and the manager vs super-admin gate.

**Status:** `SHIPPED`

**Role:** Both. This is the gate everything else sits behind — `ProtectedShell` in `App.jsx`
decides which of the two role-branched `<Routes>` trees (super-admin vs manager) a session sees,
or bounces to `/login` if there's no valid session at all.

---

## 1. Purpose

Authenticate a manager or super-admin, keep them signed in across reloads (with a Remember-me
choice of `localStorage` vs `sessionStorage`), silently refresh an access token in the background,
and surface a login failure's *actual* cause (wrong credentials vs a deactivated account) rather
than one generic string. Forgot/reset-password and first-login account activation are the same
identity system, reached from `LoginPage` or a driver-code-style activation link.

## 2. Key files

| File | Responsibility |
|---|---|
| `src/App.jsx` | `LoginShell` (login submission, role validation, post-login navigation), top-level `App` (session hydration + silent refresh on load, logout), `ProtectedShell` (role-branched route trees + the auth gate). |
| `src/pages/LoginPage.jsx` | The login form; renders whatever `error` string `LoginShell` passes it verbatim, no message processing of its own. |
| `src/pages/ForgotPasswordRequestPage.jsx` / `ForgotPasswordVerifyPage.jsx` / `ForgotPasswordResetPage.jsx` | The 3-step OTP reset flow; persist `email`/`resetToken` to `sessionStorage` (`lib/forgotPasswordSession.js`) so a refresh mid-flow doesn't restart it. |
| `src/pages/ActivateAccountPage.jsx` | First-login password activation for an account created by an admin. |
| `src/lib/authSession.js` | `readStoredAuth`/`writeStoredAuth`/`clearStoredAuth` (Remember-me storage), `getJwtPayload`/`isJwtExpired` (client-side JWT decode, no signature check — expiry only). |
| `src/hooks/use-refresh.js` | `useRefreshData()` — invalidates every active TanStack Query cache; used by the Topbar manual refresh control, unrelated to token refresh. |
| `src/api.js` | The one HTTP layer. Owns the bearer token attach, the 401 retry-after-refresh flow, and `REFRESH_EXEMPT_PATHS` (login/refresh/logout/forgot-password — endpoints a refresh attempt would be pointless or recursive for). |

## 3. Data flow

```
LoginShell.handleLogin ──> adminApi.login() ──> POST /api/auth/login
  success → writeStoredAuth() → navigate to role's dashboard
  failure → setError(err.message) → LoginPage renders it verbatim

App mount ──> readStoredAuth() ──> if refreshToken present ──> adminApi.refreshToken()
  success → writeStoredAuth() with the new tokens
  rejected (err.status 401/403) → clearStoredAuth() → back to /login
  network/no-status failure → keep the stored session, don't log out on a blip
```

Every request goes through `src/api.js`'s single `request()` helper — see
[`api.js's request() error surfacing (issue #42)`](../TESTING_GUIDE.md) row for the shape it
throws on failure.

## 4. Contracts

| Kind | Name | Notes |
|---|---|---|
| REST | `POST /api/auth/login` | `{ email, password }` → `{ token/accessToken, refreshToken, user }`. `user.role` must be `super-admin` or `admin` (manager) — any other role is rejected client-side even on a 200. |
| REST | `POST /api/auth/refresh-token` | Silent refresh on app load and on a 401 mid-session (single-flight — concurrent 401s share one refresh call). |
| REST | `POST /api/auth/logout` | Best-effort server-side session invalidation; the client clears its own storage regardless. |
| REST | `POST /api/auth/forgot-password/request-otp` / `verify-otp` / `reset` | The 3-step reset flow. |
| Storage | `admin-auth` (`localStorage` or `sessionStorage`, never both) | Whichever the last `writeStoredAuth(auth, rememberMe)` call chose; `readStoredAuth` checks `localStorage` first, falls back to `sessionStorage`. |

Backend side: [`AUTH.md`](../../../backend/docs/modules/AUTH.md) — four-collection identity model
(`User`/`Driver`/`Manager`/`SuperAdmin`), the `login` controller's distinct
401/403 responses referenced below.

## 5. Not visible in the frontend

- **Wrong credentials and a deactivated account already render distinct, actionable messages** —
  this is a backend fact, not a frontend one. `authController.js`'s `login` returns 401
  `"Invalid email or password"` (or `"Invalid driver ID or password"`) for a bad credential check,
  and a separate 403 `"Account has been deactivated. Contact super admin."` once credentials
  match but `isActive === false`. `LoginShell.handleLogin`'s catch does `err.message || 'Login
  failed'` with no normalization, and `LoginPage` renders that string as-is — so the distinction
  reaches the user unmodified (issue #70). Don't add message rewriting here; if the wording ever
  needs to change, change it in the backend controller so REST clients besides this one stay in
  sync.
- **A network/timeout failure during silent token refresh is treated differently from a genuine
  rejection.** `api.js`'s thrown `Error` always carries `error.status` from the HTTP response; a
  failure that never got a response (offline, timeout) has no `status` at all. `App`'s mount-time
  refresh only calls `clearStoredAuth()` when `err.status` is `401` or `403` — anything else (a
  blip, the backend restarting) leaves the stored session alone rather than logging the user out
  on every flaky reload.
- **The same `error.status`-presence signal is how the app-wide `ErrorState` component tells a
  network/timeout failure apart from a server rejection**, not just during token refresh.
  `src/components/shared/error-state.jsx`'s `humanizeError` checks `error.status` first (401/403/
  404/5xx get specific copy); an error with **no** `status` at all — the request never got a
  response — renders "Network error. Check your connection and try again." instead of falling
  through to raw, often-unhelpful message text. This matters because a real fetch-level failure's
  message varies by browser/cause ("Failed to fetch", Safari's "Load failed", a timeout
  `AbortError`) and doesn't reliably contain the word "network", so message-text sniffing alone
  used to miss most of them (issue #76). `AsyncSection`/`ErrorState` consumers (`DashboardPage`,
  `ManagerDashboardPage`, `ManagerTrackingPage`, `OperationsPage`, `RoutesPage`) get this for free;
  a status-bearing error whose status doesn't match one of the specific buckets still shows its own
  message verbatim (e.g. a 400 validation rejection), unchanged from before.
- **`REFRESH_EXEMPT_PATHS`** in `api.js` is why login itself never gets caught in a refresh-retry
  loop: login, refresh, logout, and the three forgot-password endpoints are excluded from the
  "401 → try refresh → retry" path, since none of them can be fixed by refreshing a token that
  doesn't exist yet.
- **`isJwtExpired`/`getJwtPayload` decode the JWT client-side with no signature verification** —
  they exist purely to proactively refresh a token that's about to expire before firing a request
  with it, not as any kind of security check. The server is always the real authority.

## 6. Known gotchas

- **Two storages, chosen once at login, never split.** `writeStoredAuth` always clears both
  `localStorage` and `sessionStorage` before writing to just one, based on `rememberMe` — there is
  no code path that reads from one and writes to the other mid-session.
- `ProtectedShell`'s role check (`isSuperAdmin`/`isManager`) is a **UI convenience**, not the
  access boundary — every backend endpoint re-checks the role independently. A bug here would be a
  bad user experience, not a security hole.
- `toast('Logged out successfully')` / `toast('Data refreshed')` in `App.jsx` are unrelated to the
  auth *logic* — don't confuse them with error surfacing; they're plain confirmations.

## 7. Tests covering this module

| Layer | File | What it locks |
|---|---|---|
| Unit | `src/__tests__/App.test.jsx` | role-gated routing, login submission incl. distinct wrong-password vs deactivated-account messages (issue #70), session hydration/silent-refresh, logout. |
| Unit | `src/__tests__/api.test.js` | `request()`'s error surfacing, token-refresh retry gating, single-flight refresh, proactive refresh. |
| Unit | `src/pages/__tests__/ForgotPasswordVerifyPage.test.jsx`, `ForgotPasswordResetPage.test.jsx`, `ForgotPasswordRequestPage.test.jsx`, `ActivateAccountPage.test.jsx` | the OTP reset flow and first-login activation, including refresh-survival via `sessionStorage`. |

## 8. Change protocol

See [`_MODULE_TEMPLATE.md`](../guides/_MODULE_TEMPLATE.md). Any change to `request()`'s
error/retry behavior needs a test proving the exempt-paths list and the single-flight refresh
still hold — a regression here breaks every page in the app, not just one.
