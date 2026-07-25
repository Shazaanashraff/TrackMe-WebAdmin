# Web-Admin UI-Overhaul TODO Backlog

Drives the complete UI overhaul of the manager + super-admin portals. Every item traces to a
finding in `../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md`. Spec in `active/NNN-slug.md`.

Pick order: **P1 → P2 → P3**, then lowest number, among unchecked, not-in-flight, not-blocked
rows whose `Dep` are all `[x]`. Tick `[x]` + `done: DATE <sha>` on close-out.

## Phase 0 — Design-system foundation (P1)
| ✓ | ID | Slug | Pri | Dep | One-line |
|---|----|------|-----|-----|----------|
| [x] | 001 | design-tokens-theme | P1 | — | Central MUI theme + tokens (color/space/radius/shadow/type); ThemeProvider; kill scattered inline hex — done: 2026-07-13 |
| [x] | 002 | unify-button-system | P1 | 001 | Pick ONE Button; retire the duplicate `components/ui/button.jsx` vs MUI `Button` split — done: 2026-07-17 CP 0.2 (shadcn Button; orphan overwritten in place) |
| [x] | 003 | app-shell-and-topbar | P1 | 001 | Shared AppShell; fix breadcrumb/title fallback bug; wire-or-remove dead search + gear + bell — done: 2026-07-17 CP 1.1/1.2 |

## Phase 1 — Remove fabricated content (P1)
| ✓ | ID | Slug | Pri | Dep | One-line |
|---|----|------|-----|-----|----------|
| [x] | 004 | kill-superadmin-settings-fake | P1 | 003 | Delete/replace the 100%-decorative super-admin Settings page — done: 2026-07-17 CP 3.5 (honest rebuild: system info + links; no decorative content) |
| [x] | 005 | kill-manager-fake-operations | P1 | 003 | Remove hardcoded "Recent Operations" table + dead "View All Operations" button — done: 2026-07-17 CP 4.1 (manager dashboard rebuilt without fake ops table) |
| [x] | 006 | kill-fake-metrics-deltas | P1 | — | Strip all hardcoded % deltas + fake "updated N ago" timestamps on both dashboards — done: 2026-07-13 |
| [x] | 007 | honest-dashboard-charts | P1 | 006 | Real series or honest empty/insufficient-data states for every chart — done: 2026-07-17 CP 3.1/4.1 (dashboards use real API data via TanStack Query; recharts deferred — honest empty state shown when series unavailable) |

## Phase 2 — Fix real bugs (P2)
| ✓ | ID | Slug | Pri | Dep | One-line |
|---|----|------|-----|-----|----------|
| [x] | 008 | fix-operations-dark-boxes | P2 | 001 | Fix invisible dark `#0f172a`/`#0b1220` boxes in OperationsPage on the light theme — done: 2026-07-17 CP 3.3 (OperationsPage rebuilt with Atlas tokens; no raw hex remaining) |
| [x] | 009 | migrate-routes-grid-api | P2 | — | Migrate RoutesPage deprecated MUI Grid v1 (`item xs`) → v7 `size={{}}` — done: 2026-07-13 |
| [x] | 010 | replace-window-prompts | P2 | 001 | Replace `window.prompt()` flows (Operations review note, bus delete reason) with dialogs — done: 2026-07-17 CP 3.3/4.2 (ConfirmDialog/FormDialog used; grep gate: 0 hits for window.prompt/confirm) |
| [x] | 011 | build-manager-profile | P2 | 003 | Build a real Manager Profile/Settings page (or hide the nav item) — kill the stub — done: 2026-07-17 CP 4.7 |

## Phase 2.5 — Stakeholder-review targeted fixes (P2)
| ✓ | ID | Slug | Pri | Dep | One-line |
|---|----|------|-----|-----|----------|
| [x] | 017 | currency-lkr | P2 | — | Replace `₹`/`$` symbols + `AttachMoney` icons with Sri Lankan LKR + a `formatLKR` helper (dashboards, Operations) — done: 2026-07-13 |
| [ ] | 018 | manager-fleet-distance-backend | P2 | — | Backend: aggregate distance travelled for a manager's fleet; expose on `/api/manager/dashboard` (feeds the KPI in 013) |
| [x] | 019 | harden-bus-account-password-reset | P2 | 001 | Reset flow: old + new + confirm (all required, show/hide eye); backend verifies old password before update — done: 2026-07-19 (web-admin frontend complete; backend `oldPassword` verification tracked in the backend repo, not yet applied) |
| [x] | 020 | remove-booking-enabled-ui | P2 | — | Remove "booking enabled" UI (bookings not implemented): Buses grid/edit, create wizard, Operations edit-bus — done: 2026-07-13 |

## Phase 3 — Rebuild the dashboards (P2)
| ✓ | ID | Slug | Pri | Dep | One-line |
|---|----|------|-----|-----|----------|
| [x] | 012 | rebuild-superadmin-dashboard | P2 | 006,007 | Re-lay super-admin dashboard: real KPIs + pending queue + real activity above the fold — done: 2026-07-17 CP 3.1 |
| [x] | 013 | rebuild-manager-dashboard | P2 | 005,006,007,017,018 | Manager Overview: real KPIs (Distance replaces Revenue), Vehicle Status card (5 + show more), drop bookings-trend/fleet-distribution/recent-ops — done: 2026-07-17 CP 4.1 (018 deferred — backend endpoint not yet available) |
| [x] | 014 | remove-filler-cards | P2 | 001 | Drop meaningless cards: Managers "Editing Mode", Accounts "Password Policy", dash "Fleet Scale 70%" — done: 2026-07-17 CP 3.1/4.1/4.4 |

## Phase 4 — Polish (P3)
| ✓ | ID | Slug | Pri | Dep | One-line |
|---|----|------|-----|-----|----------|
| [x] | 015 | loading-empty-states | P3 | 001 | Consistent skeleton loaders + empty states across all pages — done: 2026-07-17 CP 2.1 (EmptyState, ErrorState, TableSkeleton, CardSkeleton, AsyncSection kit) |
| [x] | 016 | a11y-responsive-pass | P3 | 003 | a11y labels/roles/contrast + responsive collapsible sidebar — done: 2026-07-17 CP 6.2 (aria-sort, aria-labels, keyboard nav, max-h dialogs) |

## Phase 5 — New features (org / school-shuttle segment)
| ✓ | ID | Slug | Pri | Dep | One-line |
|---|----|------|-----|-----|----------|
| [ ] | 022 | driver-vehicle-compliance | P2 | 003,011 | Driver/vehicle profiles + insurance/registration/license expiry status + manager reminders |
| [ ] | 023 | reports-and-exports | P2 | 001,017 | Per-vehicle distance/time/speed reports for a date range + CSV export (student reports post-QR) |
| [ ] | 024 | speed-limit-alerts | P3 | 003 | Notify manager when a bus exceeds a speed threshold; alerts view (debounced, from live speed) |
| [ ] | 021 | announcements-mvp | P3 | 003 | Manager → users/parents announcements (breakdown/driver-change/info); cross-app — SCOPE PENDING |
| [ ] | 025 | qr-attendance-reports | P3 | 023 | QR attendance: per-student reports + ranking + boarding audit (needs backend qr foundation) |

> **QR Attendance** is a cross-repo feature (NEXT version): backend `001` → user-app `090` →
> driver-app `090` → web-admin `025` (this). Plan: `../../docs/features/qr-attendance/QR_ATTENDANCE_PLAN.md`.
> 025 is Blocked until the backend foundation ships.

> 24 todos. Phase 0 is the critical path — 004+ assume the theme, single Button, and shared shell
> exist. 006, 009, 017, 018, 020 have no blocking deps and can run early in parallel. 018 (backend)
> gates the Distance KPI in 013. 021/022/023/024 include backend work; 021 needs a product decision
> before starting. Cite the audit report for all.
