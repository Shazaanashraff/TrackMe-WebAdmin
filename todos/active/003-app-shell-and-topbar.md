# TODO 003 — Shared app shell + fix the dead/broken top bar

**Phase:** 0 · **Priority:** P1 · **Depends on:** 001
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §1, `src/layout/SuperAdminLayout.jsx`,
`src/layout/ManagerLayout.jsx`

## Why
The two layouts are ~90% duplicated. They also carry the shell's worst problems:
- **Dead controls:** the search box (no state/handler), the gear IconButton (no onClick), and the
  super-admin notification bell (no onClick) do nothing on every page.
- **Breadcrumb/title bug:** title = `navItems.find(startsWith path)?.label || 'Dashboard'`, so on
  `/settings` and `/manager/settings` (not in `navItems`) the header wrongly reads
  "Dashboard"/"Overview".

## Step-by-step
1. Extract a shared `src/layout/AppShell.jsx` (sidebar + topbar + `<Outlet/>`) parameterized by
   `navItems`, `accountItems`, `brandLabel`, `role`. Refactor both layouts to render it. Keep the
   manager's live pending-routes badge behavior. **Brand label:** the manager sidebar must read
   **"Manager"** (not "TRACKME MGR"); super-admin reads "Admin" (not "TRACKME ADMIN"). Keep the "T"
   mark or replace with a real logo, but the wordmark text changes.
2. **Breadcrumb/title fix:** derive the active label from a lookup across BOTH `navItems` and
   `accountItems` (and any future routes), or from a route→title map, with a correct fallback.
   Verify title is right on Settings/Profile.
3. **Search box:** either (a) remove it, or (b) make it a real command/nav search. Default: remove
   for now and leave a documented placeholder in `## Blocked`/PR notes if a search feature is
   wanted later. No dead input may remain.
4. **Gear icon:** remove it (Settings/Profile already live in the sidebar), or wire it to navigate
   to the settings route. No dead icon may remain.
5. **Bell:** make the super-admin bell behave like the manager's (navigate to a real destination +
   badge) or remove it. No dead icon may remain.
6. **Avatar:** make it a real menu (Profile / Sign out) using MUI `Menu`, or leave non-interactive
   but visually correct — do not fake a dropdown affordance that doesn't open.
7. Tests: shell renders correct title per route (incl. Settings/Profile); no `<input>` without an
   `onChange`; e2e updated if selectors move (`data-testid="notifications-bell"` must survive).

## Design references
- Sidebar patterns: shadcn Sidebar https://ui.shadcn.com/docs/components/sidebar and dashboard
  blocks https://ui.shadcn.com/blocks (sidebar-07 etc.)
- MUI Menu (avatar dropdown): https://mui.com/material-ui/react-menu/
- Breadcrumb pattern: https://ui.shadcn.com/docs/components/breadcrumb ; keep MUI `Breadcrumbs`.
- Command/search (if you build it): https://ui.shadcn.com/docs/components/command

## Out of scope
Responsive collapse (todo 016). Rebuilding page bodies.

## Completion test
`todos/completion-tests/todo-003.sh` — `AppShell.jsx` exists and both layouts import it; no
top-bar `<input>` without a handler (grep); no `IconButton` gear without `onClick`; a test asserts
the correct title on `/settings`; e2e bell testid present; lint + test green.

## Blocked
