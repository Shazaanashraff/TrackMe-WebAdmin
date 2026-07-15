# TODO 006 — Strip hardcoded % deltas and fake timestamps (both dashboards)

**Phase:** 1 · **Priority:** P1 · **Depends on:** —
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §2.1 & §3.1,
`src/pages/DashboardPage.jsx`, `src/pages/ManagerDashboardPage.jsx`

## Why
Both dashboards print fabricated trend deltas as if real: `+12% / +5% / -3% / +18% / +15% / +24%`
(super-admin) and `+0% / +12%` (manager), plus fake footer timestamps ("updated 4 min ago",
"updated 2 hours ago", "just updated"). A KPI of 0 shows "+18%". These must go.

## Step-by-step
1. In `DashboardPage.jsx`: remove the hardcoded `change`/`changePositive` strings passed to every
   `StatCard` (`:301-334`), the `subtitle="(+15%) increase in bookings this month"` (`:371`), the
   `"+24% performance this month"` (`:502`), and the hardcoded footer strings ("updated 4 min ago"
   etc. at `:349,:373,:475`).
2. In `ManagerDashboardPage.jsx`: remove the hardcoded `change` strings (`:170` "+0%", `:179`
   "+12%") and the "PERFORMANCE IS PEAKING THIS WEEK" caption (`:222`).
3. Replace with EITHER a **real** delta (only if you can compute it from real data the API already
   returns — e.g. active/total ratio, which the manager card at `:173` already does correctly), OR
   nothing. The `StatCard` `change` prop should render only when a real value is supplied.
4. Simplify `StatCard` so an omitted `change` renders cleanly (no empty coloured span).
5. Test: `StatCard` with no `change` renders only the value; no `+18%`/`+24%`/"updated 4 min ago"
   literals remain (grep in test or completion script).

## Design references
- KPI/stat card patterns with *optional* trend: shadcn dashboard blocks
  https://ui.shadcn.com/blocks ; Tremor KPI cards https://www.tremor.so/blocks (Metrics).
- Rule of thumb: a delta needs a comparison window from the backend. No window → no delta.

## Out of scope
The charts themselves (todo 007). Re-layout (012/013).

## Completion test
`todos/completion-tests/todo-006.sh` — grep proves none of `+18%`, `+24%`, `(+15%)`,
`updated 4 min ago`, `updated 2 hours ago`, `PERFORMANCE IS PEAKING` remain in either dashboard
file; lint + test green.

## Blocked
