# TODO 020 — Remove "booking enabled" UI (bookings not implemented)

**Phase:** 2.5 · **Priority:** P2 · **Depends on:** —
**Cite:** stakeholder review item 9, `src/pages/ManagerBusesPage.jsx`, `src/pages/OperationsPage.jsx`

## Why
Booking/reservations are not a real feature yet, so every "Booking Enabled/Disabled" control is
meaningless surface area. Remove it from the manager-facing UI.

## Step-by-step
1. `ManagerBusesPage.jsx`: remove the **Booking** column (`:171`), the `bookingEnabled` field in the
   edit dialog (`:445-448`), and the "Booking Enabled" summary card + its `summary.bookingEnabled`
   computation (`:191,:263`). Remove `bookingEnabled` from the create wizard/`emptyCreateForm` if it
   isn't required by the create request contract — verify against `adminApi.createBusAccountRequest`
   and the backend; if the backend requires the field, send a sane default and DON'T surface it in
   the UI (note this in the PR).
2. `OperationsPage.jsx` (super-admin edit bus): remove the "Booking Status" toggle from the edit
   dialog (`:388-398, :613-629`) and the Bookings column in the managed-buses grid — unless
   super-admin explicitly needs it; default is to remove for consistency (confirm in PR).
3. Keep all other bus fields/flows intact. Don't touch backend booking models (out of scope).
4. Tests: buses grid/edit render without booking controls; create + edit still submit successfully.

## Design references
- n/a (removal). Keep the existing DataGrid/dialog patterns.

## Out of scope
Backend booking endpoints/models. Re-adding a real bookings feature later (separate initiative).

## Completion test
`todos/completion-tests/todo-020.sh` — grep proves no `bookingEnabled`/"Booking Enabled" column or
edit control remains in `ManagerBusesPage.jsx`; the "Booking Enabled" summary card is gone; lint +
test green.

## Blocked
