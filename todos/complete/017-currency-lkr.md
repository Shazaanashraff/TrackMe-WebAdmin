# TODO 017 — Sri Lankan LKR currency everywhere

**Phase:** 2.5 · **Priority:** P2 · **Depends on:** —
**Cite:** stakeholder review item 2, `src/pages/DashboardPage.jsx`,
`src/pages/ManagerDashboardPage.jsx`, `src/pages/OperationsPage.jsx`

## Why
Money is shown with the Indian Rupee sign `₹` (e.g. Operations revenue column, manager dashboard
revenue) and dollar `$` glyphs/`AttachMoneyRounded` icons. The product is Sri Lankan — it must use
**LKR** (`Rs.` / `LKR`).

## Step-by-step
1. Add a helper `src/lib/formatCurrency.js` → `formatLKR(amount)` returning e.g. `"Rs. 12,500"`
   (use `Intl.NumberFormat('en-LK', { style:'currency', currency:'LKR', maximumFractionDigits:0 })`
   or `Rs.` + `toLocaleString('en-LK')`). Match the driver-app's `formatCurrency` style if practical.
2. Replace every `₹` literal (grep `₹` across `src/`) with the helper output — currently
   `OperationsPage.jsx` (revenue columns), `ManagerDashboardPage.jsx` (revenue).
3. Replace `$` money glyphs and swap the `AttachMoneyRounded`/`AttachMoney` icon for a neutral or
   LKR-appropriate icon (e.g. `PaymentsRounded`/`AccountBalanceWalletRounded`) where a money icon is
   still meaningful. Note: the manager dashboard "Total Revenue" card is being removed in todo 013 —
   don't relabel it, just ensure any remaining money display uses LKR.
4. Tests: `formatLKR(12500)` → expected string; a page render shows `Rs.`/`LKR`, no `₹`/`$`.

## Design references
- `Intl.NumberFormat` currency: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NumberFormat
- Keep one helper as the single source of truth (mirrors driver-app `helpers/formatters.js`).

## Out of scope
Removing the revenue card itself (todo 013). Booking price flows (bookings unimplemented).

## Completion test
`todos/completion-tests/todo-017.sh` — `src/lib/formatCurrency.js` exports `formatLKR`; grep proves
no `₹` remains in `src/` and no `AttachMoney` icon import remains where money is shown; lint + test
green.

## Blocked
