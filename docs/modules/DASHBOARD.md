# DASHBOARD — Web Admin

Super-admin dashboard (`/dashboard`) and the manager dashboard (`/manager/dashboard`).

**Status:** `SHIPPED`

---

## 1. Purpose

A landing overview for each role: fleet-wide KPIs and a short operations/requests snapshot for the
super-admin, org-scoped booking/vehicle KPIs for a manager. Both pages also carry a small
"Analytics"/"Booking Trend" note acknowledging that time-series charts aren't built yet — kept
deliberately low-profile (issue #15) rather than a large empty placeholder card.

## 2. Key files

| File | Responsibility |
|---|---|
| `src/pages/DashboardPage.jsx` | Super-admin dashboard: KPI stat cards, a compact operations snapshot (top 6 routes), pending-vehicle-request count, and the compact Analytics note. |
| `src/pages/ManagerDashboardPage.jsx` | Manager dashboard: booking-summary stat cards, confirmed/cancelled counts, and the compact Booking Trend note. |
| `src/hooks/use-dashboard.js` | `useSuperAdminDashboard()`, `useManagerDashboard()` — the two dashboard KPI queries. |
| `src/hooks/use-operations.js` | `useOperationsOverview()`, `usePendingVehicleRequests()` — reused by `DashboardPage` for its operations snapshot and pending-request count (not duplicated from `OperationsPage`). |
| `src/components/shared/stat-card.jsx` | The KPI tile both pages render in a grid. |

## 3. Data flow

```
DashboardPage        → useSuperAdminDashboard() ──────────┐
                      → useOperationsOverview()            ├─→ adminApi.* → GET /api/super-admin/...
                      → usePendingVehicleRequests()  ──────┘

ManagerDashboardPage → useManagerDashboard() → adminApi.getManagerDashboard() → GET /api/manager/dashboard
```

## 4. Contracts (API)

| Kind | Name | Notes |
|---|---|---|
| REST | `GET /api/super-admin/dashboard` | `{ success, data: { managers, vehicles, bookings, reviews } }` — the KPI numbers `DashboardPage` renders as stat cards. |
| REST | `GET /api/super-admin/operations` | Reused here (not just `OperationsPage`) for the dashboard's operations snapshot, sliced to the first 6 entries client-side. |
| REST | `GET /api/super-admin/vehicle-requests?status=PENDING` | Pending-request count shown as a stat card. |
| REST | `GET /api/manager/dashboard` | `{ success, data: { bookings: { confirmedBookings, cancelledBookings }, ... } }` — manager-scoped server-side. |

Backend side: [`ADMIN.md`](../../../backend/docs/modules/ADMIN.md).

## 5. Not visible in the frontend

- **No time-series data exists yet.** Neither dashboard endpoint returns a historical/daily series,
  so "Analytics" (super-admin) and "Booking Trend" (manager) cannot show a real chart. Rather than a
  large empty card implying a feature is "about to load", both are a single compact row: a label
  plus "Not enough data yet" (issue #15). This is not a loading state — it renders unconditionally,
  independent of `dashQ.isLoading`, since the gap is missing backend data, not slow data.
- `hasAvgRating` guards against `reviews.averageRating` arriving as a Decimal128-serialized string
  from the aggregation pipeline — a plain `!= null` check isn't sufficient before calling
  `.toFixed()`.

## 6. Known gotchas

- **Manager-scoped, not global.** `useManagerDashboard()` hits a manager-scoped endpoint —
  `ManagerDashboardPage` must never be given a `managerId` param to view another manager's numbers;
  that's what the super-admin's Operations drill-down is for (see `OPERATIONS.md`).
- `DashboardPage` reuses `useOperationsOverview()`/`usePendingVehicleRequests()` from
  `hooks/use-operations.js` rather than its own hooks — don't fork a duplicate query for the same
  data if you touch this page.
- The Analytics/Booking Trend note's exact copy ("Not enough data yet") is asserted by tests in both
  pages — keep it as an isolated text node (not merged into a longer sentence) if you touch it, or
  update the tests in the same change.

## 7. Tests covering this module

| Layer | File | What it locks |
|---|---|---|
| RTL | `src/pages/__tests__/DashboardPage.test.jsx` | KPI stat cards, no fabricated currency symbols, empty-operations state, the compact Analytics placeholder (issue #15) — asserts no `py-10` ancestor around the "Not enough data yet" text |
| RTL | `src/pages/__tests__/ManagerDashboardPage.test.jsx` | booking-summary stat cards, confirmed/cancelled counts, pending-request count, fleet snapshot rows, the compact Booking Trend placeholder (issue #15) — asserts no `py-12` ancestor |

## 8. Change protocol

See [`_MODULE_TEMPLATE.md`](../guides/_MODULE_TEMPLATE.md). If either dashboard endpoint ever
starts returning real time-series data, replace the placeholder note with an actual chart in the
same change that removes the "Not enough data yet" text — don't leave both.
