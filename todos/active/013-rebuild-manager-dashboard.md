# TODO 013 — Rebuild the manager Overview (stakeholder-specified content)

**Phase:** 3 · **Priority:** P2 · **Depends on:** 005, 006, 007, 017, 018
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §3.1, `src/pages/ManagerDashboardPage.jsx`,
backend `controllers/managerController.js` `getManagerDashboard`

## Why
This portal is operated by a transport organisation running school/university shuttles (then
public). The Overview must show real fleet operations — not bookings/revenue theatre. Exact content
was specified by the stakeholder.

## Final Overview composition (top → bottom)
1. **KPI row (real data only, 3 cards; a 4th is added by todo 022 later):**
   - Total Buses · Active Buses · **Distance Travelled**.
   - **Distance Travelled** *replaces* **Total Revenue** (bookings/revenue are not implemented →
     revenue is always 0). Source from todo 018's backend field (e.g. `fleet.totalDistanceKm`,
     summed from `DriverEarnings.totalDistance`). Until 018 lands this card is `## Blocked`.
   - **Do NOT show "Pending Approvals"** — the stakeholder confirmed manager bus create/delete
     requests happen rarely; it doesn't belong on the dashboard. (The count still exists in the API;
     just don't surface it here.)
   - Remove all hardcoded `change`/deltas (todo 006). Optional future 4th card = compliance
     "Expiring Soon" once todo 022 lands.
2. **Vehicle Status card** (replaces "Recent Activities"):
   - Lists the manager's vehicles, **5 at a time**, each row = bus name/number + an Active/Inactive
     status chip (from `getManagerBuses` → `isActive`).
   - A **"Show more"** button expands to reveal the rest (toggle collapse/expand). Consider MUI
     `Collapse`. Empty state when the manager has no buses.
3. **Remove entirely:** the "Bookings Trend" chart (todo 006/007 — no bookings), the "Fleet
   Distribution" chart, and the "Recent Operations" fake table (todo 005).
4. **Replacement panel for the freed space** — a **Live Service Board**: the buses that are
   *broadcasting right now* (derive from `getManagerBuses` live/isActive state + last-seen; a
   dedicated live endpoint can come later), each linking to `/manager/tracking`. Real operational
   value at a glance; no fabricated content. If no live data source is wired yet, render an honest
   empty state ("No buses broadcasting right now").

## Step-by-step
1. Rewrite `ManagerDashboardPage.jsx` to the composition above; delete the removed components and
   their synthetic data.
2. Wire the Vehicle Status list to `getManagerBuses`; implement the 5-row + Show more toggle.
3. Add the Distance Travelled KPI from todo 018's field; block if unavailable.
4. Currency shown anywhere here uses the LKR helper from todo 017 (no `₹`/`$`).
5. Tests: KPIs render from real data + empty states; Vehicle Status shows 5 then expands; no
   `BUS-4021`/bookings-trend/fleet-distribution remain.

## Design references
- Vehicle/asset status list with expand: MUI `List` + `Collapse` https://mui.com/material-ui/react-list/
  ; shadcn dashboard blocks https://ui.shadcn.com/blocks for card/hierarchy inspiration.
- "Needs attention" task queue: shadcn blocks; keep MUI components.

## Out of scope
Super-admin dashboard (012). New chart series beyond 018 (→ 007 `## Blocked`).

## Completion test
`todos/completion-tests/todo-013.sh` — grep proves `BUS-4021`, `const bookingTrend`, "Fleet
Distribution", "Total Revenue", "Pending Approvals"/"Pending Requests" are gone; page references
`getManagerBuses` (vehicle status + live board); a "Show more" control exists; no `₹` literal;
lint + test green.

## Blocked
