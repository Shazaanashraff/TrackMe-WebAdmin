# TODO 019 — Harden the bus-account password reset (old + new + confirm + eye)

**Phase:** 2.5 · **Priority:** P2 · **Depends on:** 001
**Cite:** stakeholder review item 10, `src/pages/ManagerAccountsPage.jsx` (the "Drivers" nav →
Account Management screen), `src/api.js` `resetManagerBusAccountPassword`,
backend `controllers/managerController.js` `resetBusAccountPassword` (~:489)

> Note: the reset lives on the **Account Management / "Drivers"** page (`ManagerAccountsPage.jsx`),
> not the Buses grid. Target that file.

## Why
Today the reset takes only a single new password and sets it (no verification). The stakeholder
wants a safer rotation: **old password + new password + confirm password**, all required, with the
update rejected if the old password doesn't match, and show/hide eye toggles on the fields.

## Step-by-step (frontend — web-admin)
1. Replace the single password field with three: **Old password**, **New password**, **Confirm new
   password** — all `required`, each with a show/hide `IconButton` (`VisibilityRounded` /
   `VisibilityOffRounded`, mirror `LoginPage.jsx`'s adornment pattern).
2. Client validation: new ≥ 8 chars; new === confirm; block submit otherwise with inline errors.
3. Send `{ oldPassword, password }` to `adminApi.resetManagerBusAccountPassword(busId, ...)`.
   Surface a specific error when the backend says the old password is wrong.
4. Clear fields + success alert on success (existing behavior).
5. Tests: mismatch new/confirm blocks submit; short password blocks; a wrong-old-password API error
   renders inline; happy path calls the API with `oldPassword` + `password`.

## Step-by-step (backend — coordinate; contract change)
6. `resetBusAccountPassword`: accept `oldPassword`, load the driver with `+password`, and verify via
   the model's compare method (e.g. `driver.comparePassword(oldPassword)`); on mismatch return a
   `400/401` with a clear message; only then set the new password. Keep the audit-log write.
7. Integration test for the new contract + a `docs/TESTING_GUIDE.md` row.

## Blocked-path note
If product decides the manager (an admin) should NOT need the driver's old password (they may not
know it), STOP and confirm the intended security model before implementing — record in `## Blocked`.

## Design references
- Password field with visibility toggle: MUI `InputAdornment` + `IconButton` (see `LoginPage.jsx`).
- Change-password form pattern: shadcn Form https://ui.shadcn.com/docs/components/form .

## Out of scope
Super-admin's manager-password reset (`ManagersPage`) unless the same pattern is trivially reused.

## Completion test
`todos/completion-tests/todo-019.sh` — `ManagerAccountsPage.jsx` has three password fields
(old/new/confirm) and visibility toggles (grep `Visibility` + `confirm`); it sends `oldPassword`;
lint + test green. (Backend contract test tracked in the backend integration suite.)

## Blocked
None for the web-admin (frontend) scope of this todo — implemented in full (steps 1-5).

Steps 6-7 (`resetBusAccountPassword` backend verification of `oldPassword` + integration test +
`docs/TESTING_GUIDE.md` row) live in the separate backend repository, which this session does not
have access to. The frontend now sends `{ oldPassword, password }` to
`adminApi.resetManagerBusAccountPassword`, and surfaces whatever error message the backend
returns — but until the backend contract change lands, the backend will not actually reject a
wrong old password. This is a coordination item for the backend repo, not a frontend blocker.
