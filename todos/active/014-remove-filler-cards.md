# TODO 014 — Remove meaningless filler cards

**Phase:** 3 · **Priority:** P2 · **Depends on:** 001
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §2.1/§2.2/§3.4,
`src/pages/ManagersPage.jsx`, `src/pages/ManagerAccountsPage.jsx`, `src/pages/DashboardPage.jsx`

## Why
Several summary cards convey no information: Managers page **"Editing Mode: On/Off"** (just reflects
whether a dialog is open), Accounts page **"Password Policy: Min 8 chars"** (static label dressed
as a metric), and the super-admin dashboard **"Fleet Scale" progress bar hardcoded to 70%**.

## Step-by-step
1. `ManagersPage.jsx`: remove the "Editing Mode" summary card + its `summary.editing` computation
   (`:155,:175`). Keep the real Total/Active/Inactive cards.
2. `ManagerAccountsPage.jsx`: remove the "Password Policy" filler card (`:66`), or fold the "min 8
   chars" into the field's helper text (it already is at `:117`).
3. `DashboardPage.jsx`: in the Operations table, remove the hardcoded 70%-width progress bar
   (`:449-451`) — show a real proportion or drop the bar (coordinate with todo 012).
4. Tests: pages still render their real summary cards; removed cards are gone.

## Design references
- Metric-card discipline: only show a card if it carries a real, changing number. shadcn/Tremor KPI
  blocks for the pattern of what belongs in a stat card.

## Out of scope
Redesigning the pages otherwise. Other filler not listed here (report if found).

## Completion test
`todos/completion-tests/todo-014.sh` — grep proves "Editing Mode" gone from `ManagersPage.jsx`,
"Password Policy" gone from `ManagerAccountsPage.jsx`, and no hardcoded `70%` width in the
`DashboardPage.jsx` operations bar; lint + test green.

## Blocked
