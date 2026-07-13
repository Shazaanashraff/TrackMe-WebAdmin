# TODO 005 — Remove the invented "Recent Operations" table (manager)

**Phase:** 1 · **Priority:** P1 · **Depends on:** 003
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §3.1, `src/pages/ManagerDashboardPage.jsx:284-330`

## Why
The manager Overview shows a "Recent Operations" table of **entirely invented rows** — `BUS-4021
Route Expansion`, `BUS-8821 Maintenance Check`, `BUS-1102 Schedule Change`, `BUS-5531 Driver Swap`
— rendered even for a manager with zero buses. The `…` row action does nothing and the "View All
Operations" button has no handler. Also the "Fleet Distribution" chart hardcodes a `2` for the
"Maint" bar.

## Step-by-step
1. Delete the hardcoded operations array + its table markup and the dead "View All Operations"
   `Button` (`:303-330`).
2. Replace with a **real** panel OR an honest empty state:
   - If a real source exists (e.g. `adminApi.getManagerCustomRoutes({status:'PENDING_NAMING'})` /
     `getRouteChangeRequests` — already used by the layout badge, and pending bus requests), show a
     genuine "Needs your attention" queue that links to Route Approvals / Buses.
   - If nothing real fits here, render an `EmptyState` ("No recent activity") — never fake rows.
3. Fix "Fleet Distribution": remove the hardcoded `2`. Use real `[activeBuses, totalBuses-activeBuses]`
   (+ a real maintenance count only if the API provides one); otherwise drop the third bar.
4. Test: with zero data the component renders the empty state and NO `BUS-4021`/hardcoded rows.

## Design references
- Empty state: https://ui.shadcn.com/docs/components (Empty / placeholder patterns), or MUI simple
  centered empty block.
- "Needs attention" queue / task list: shadcn dashboard blocks https://ui.shadcn.com/blocks
- Data table (if you show a real queue): https://ui.shadcn.com/docs/components/data-table (MUI:
  keep `@mui/x-data-grid`).

## Out of scope
Full dashboard re-layout (todo 013). Removing % deltas (todo 006).

## Completion test
`todos/completion-tests/todo-005.sh` — grep proves `BUS-4021`/`BUS-8821`/`BUS-1102`/`BUS-5531` and
"View All Operations" are gone from `ManagerDashboardPage.jsx`; no hardcoded `2` maint literal in
the Fleet Distribution series; lint + test green.

## Blocked
