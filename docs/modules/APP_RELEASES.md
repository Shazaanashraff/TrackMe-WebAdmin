# APP_RELEASES — Web Admin

Super-admin registry of driver/rider app builds (APK/TestFlight links), and the public endpoint
the landing page reads to show real download links instead of "Coming soon".

**Status:** `SHIPPED` — frontend complete against the backend contract below. Binaries for both
apps (`driver-app-1.0.0.apk`, `rider-app-1.0.0.apk`) are already committed into
`public/downloads/`; registering them via this page is the remaining manual step.

**Role:** super-admin only. `/releases` is a flat super-admin route (this branch has no
`/admin/*` prefix — see `docs/modules/AUTH.md`). No manager-scoped data is involved.

---

## 1. Purpose

Lets a super-admin register a new driver or rider app build (version, download link, release
notes, mandatory flag) and toggle which build is "live" per (app, platform) pair, without a
deploy. The public landing page (`/`) reads the live rider-android and driver-android releases to
turn its "Coming soon" store buttons into real download links the moment a build is registered —
see [`LANDING.md`](LANDING.md) §4, which this doc cross-references rather than duplicates.

The hard constraint: this page only **registers metadata** pointing at a binary. It does not
upload or build anything. The binary itself is committed straight into `public/downloads/` by
whoever cuts the release, then registered here.

## 2. Key files (one job each)

| File | Responsibility |
|---|---|
| `src/pages/releases/AppReleasesPage.jsx` | The `/releases` page: app/platform pickers, the create-release form, and the release-history table with per-row Retract/Reactivate. |
| `src/hooks/use-app-releases.js` | `useAppReleases`, `useAppReleaseHistory(app)`, `useCreateAppRelease`, `useUpdateAppReleaseStatus` — TanStack Query hooks, mirrors `use-managers.js`'s pattern. |
| `src/api.js` | `getAppReleases`, `getAppReleaseHistory`, `createAppRelease`, `updateAppReleaseStatus` — the authenticated admin surface. |
| `src/lib/queryKeys.js` | `qk.appReleases.{all,list,history}`. |
| `src/pages/landing/useAppDownloadLinks.js` | The **public** landing page's own fetch against `GET /api/app-releases/latest`, deliberately bypassing `api.js` (see §4). |
| `src/pages/landing/JoinSection.jsx` | Consumes `useAppDownloadLinks()` for the rider store buttons and the driver panel's direct-download line. |
| `src/App.jsx` | `/releases` route, super-admin only. |
| `src/layout/AppShell.jsx` / `Topbar.jsx` | "Releases" nav entry (`SUPER_ADMIN_NAV`) and breadcrumb label (`ROUTE_LABELS`). |
| `public/downloads/*.apk` | The committed binaries themselves (see §5). |

## 3. Data flow

```
AppReleasesPage → use-app-releases.js (TanStack Query) → adminApi (src/api.js) → Backend
                                                                                      │
Public landing page → useAppDownloadLinks.js (plain fetch, no api.js) ───────────────┘
```

Create/toggle mutations invalidate `qk.appReleases.all()` and the specific `qk.appReleases.history(app)`
key, so the history table and the plain list query (whichever the latest-release lookups end up
using) both refresh.

## 4. Contracts (API / socket / storage)

| Kind | Name | Shape / notes |
|---|---|---|
| REST | `GET /api/app-releases` (public) | `{ releases: [...] }` — latest active release per (app, platform) pair. |
| REST | `GET /api/app-releases/latest?app=driver\|rider&platform=android\|ios` (public) | `{ release: {...} \| null }`. Called directly via `fetch` from `useAppDownloadLinks.js`, **not** through `adminApi`/`request()` — this call is made from the signed-out landing page and the endpoint itself needs no auth, so routing it through the authenticated admin surface would misattribute it as an admin action. |
| REST | `GET /api/app-releases/history?app=driver\|rider` (super-admin auth) | `{ releases: [...] }`, newest first. |
| REST | `POST /api/app-releases` (super-admin auth) | body `{ app, platform, version, versionCode, downloadUrl, releaseNotes, mandatory, fileSizeBytes }` → 201. |
| REST | `PATCH /api/app-releases/:id` (super-admin auth) | body `{ isActive }` → toggles Retract/Reactivate. |

See [`LANDING.md`](LANDING.md) §4 — the landing page now fetches live rider/driver download links
from the public endpoint above instead of only reading the static `APP_LINKS` placeholders.

## 5. Not visible in the frontend

- **Hosting model:** app binaries are committed directly into `public/downloads/` (e.g.
  `driver-app-1.0.0.apk`, `rider-app-1.0.0.apk`) — there is no object storage or CDN upload step.
  The manual release flow is: build the APK/IPA → commit it into `public/downloads/` → register its
  metadata via this page with a `downloadUrl` of `/downloads/<file>.apk` (or a full TestFlight URL
  for iOS). Deleting or renaming a committed binary without first retracting (or re-pointing) the
  matching release leaves a dead link on the public landing page.
- `fileSizeBytes` is accepted by the backend contract but not surfaced anywhere in this page's UI
  yet — the create form does not collect it.
- The "latest" lookup the landing page uses only covers **android** for both apps; no iOS driver
  flow exists (there is no driver iOS panel on the landing page to wire one into).

## 6. Known gotchas / regressions

- `useAppDownloadLinks()` always falls back to `config.js`'s static `APP_LINKS` (`null` by
  default) on any fetch failure — a 404, a network error, or the backend being unreachable all
  degrade silently to the pre-existing "Coming soon" button state. This is deliberate: the public
  landing page must never crash or show a broken link because the releases backend is down.
- Retracting the release currently backing the landing page's live download link does not
  invalidate anything client-side on the public page — a visitor who already loaded `/` keeps
  showing the old link until they reload. Acceptable for now; revisit if this becomes a real
  support issue.

## 7. Tests covering this module

| Layer | File | What it locks |
|---|---|---|
| Unit | `src/pages/releases/__tests__/AppReleasesPage.test.jsx` | create-release form validation and payload, history table rendering, Retract/Reactivate wiring, inline error on a failed create |
| Unit | `src/pages/landing/__tests__/useAppDownloadLinks.test.js` | falls back to `APP_LINKS` statics on a 404 or a thrown fetch; picks up real `downloadUrl` values when the API returns a release; `driverAndroid` stays `null` with no driver release |
| Unit | `src/pages/landing/__tests__/JoinSection.test.jsx` | rider store buttons render disabled/"Coming soon" with no release, and as real links once the hook returns URLs; the driver panel's direct-download line appears only when `driverAndroid` is set, without altering the `LeadForm` CTA |
| Integration | `src/__tests__/App.test.jsx` | `/releases` reachable by a super-admin, `NotFound` for a manager |
| Integration | `src/layout/__tests__/AppShell.test.jsx`, `src/layout/__tests__/Topbar.test.jsx` | "Releases" nav entry present for super-admin only; breadcrumb label |

See [`ADDING_A_TEST.md`](../guides/ADDING_A_TEST.md) for how to add one, and the
[`TESTING_GUIDE.md`](../TESTING_GUIDE.md) traceability row that must exist.

## 8. Change protocol

Any change to this module must:
1. Run this module's tests green as a baseline.
2. Implement **page → hook → api → client** (never add a second fetch call outside
   `useAppDownloadLinks.js`'s deliberate, documented exception).
3. Add/adjust tests for every changed behaviour (a change with no test is not done).
4. Re-run green (`lint`, `test`, `build`).
5. Update **this doc** + the [`TESTING_GUIDE.md`](../TESTING_GUIDE.md) row, and append a
   [`CHANGES.md`](../CHANGES.md) entry before pushing.
