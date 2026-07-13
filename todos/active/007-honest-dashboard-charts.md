# TODO 007 — Honest charts (real series or honest empty states)

**Phase:** 1 · **Priority:** P1 · **Depends on:** 006
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §2.1 & §3.1,
`src/pages/DashboardPage.jsx`, `src/pages/ManagerDashboardPage.jsx`

## Why
Every chart is synthetic: `barData`/`bookingsTrend` are one number × multipliers with constant
fallbacks; `ratingTrend` is a literal array; the manager `bookingTrend` is `confirmed ± n` (its
`curve:'natural'` even dips below zero). They draw confident trends over zero real data.

## Step-by-step
1. Inventory what real time-series the backend can provide. Grep `src/api.js` + backend routes for
   any history/aggregation endpoints (e.g. bookings-over-time, fleet-activity-by-day, ratings).
2. **If a real series endpoint exists:** wire the chart to it via a new `adminApi.*` method (HTTP
   only in `api.js`). Render real data.
3. **If it does NOT exist:** do NOT synthesize. Replace the chart with an **"Not enough data yet"**
   panel (icon + one line), OR remove the chart and keep only the real KPI cards. Record the exact
   missing endpoint contract you'd need in `## Blocked` so the backend can add it later.
4. Delete the synthetic generators: `barData`, `bookingsTrend`, `ratingTrend`, `ordersOverview`'s
   fake pieces (super-admin); `bookingTrend` (manager). Remove now-unused `@mui/x-charts` imports
   if a page no longer charts.
5. Test: charts render from real data when present; render the empty/insufficient state when the
   series is empty — never a fabricated line.

## Design references
- Charts (patterns/empty states): shadcn Charts https://ui.shadcn.com/charts ; Tremor charts
  https://www.tremor.so/ (has good "no data" treatments). Keep MUI `@mui/x-charts` as the renderer
  unless the team migrates.
- Empty/insufficient-data UX: never zero-pad a line to imply a trend; show a flat honest state.

## Out of scope
Backend endpoint creation (backend track). Full re-layout (012/013).

## Completion test
`todos/completion-tests/todo-007.sh` — grep proves the synthetic arrays (`barData`,
`bookingsTrend`, `ratingTrend`, manager `bookingTrend`) are gone; any remaining `<BarChart>`/
`<LineChart>` is fed from state derived from an `adminApi` call (not a local synthetic const); lint
+ test green.

## Blocked
