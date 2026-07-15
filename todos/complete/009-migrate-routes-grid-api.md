# TODO 009 — Migrate RoutesPage to MUI Grid v7 API

**Phase:** 2 · **Priority:** P2 · **Depends on:** —
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §2.4, `src/pages/RoutesPage.jsx`

## Why
`RoutesPage.jsx` uses the **deprecated MUI Grid v1 API** (`<Grid item xs={12} md={3}>`) while the
rest of the app uses the current v7 API (`<Grid size={{ xs:12, md:3 }}>`). It emits deprecation
warnings and will break on the next MUI major.

## Step-by-step
1. Convert every `<Grid item xs={..} md={..}>` in `RoutesPage.jsx` to `<Grid size={{ xs:.., md:.. }}>`
   and drop the `item` prop (container grids stay `container`). Reference `:183,:193-219,:233-270`.
2. Confirm no other file still uses `<Grid item` (grep whole `src/`); if strays exist, note them in
   the PR body (out of scope to fix here unless trivial).
3. Verify layout is visually unchanged and no MUI Grid deprecation warning is logged.
4. Test: page renders; the create-route form + province list still lay out correctly.

## Design references
- MUI Grid v2 migration guide: https://mui.com/material-ui/migration/upgrade-to-grid-v2/
- Grid API: https://mui.com/material-ui/react-grid/

## Out of scope
Restyling RoutesPage. Fixing Grid usage in other files (report only).

## Completion test
`todos/completion-tests/todo-009.sh` — grep proves `RoutesPage.jsx` has no `Grid item` occurrences;
lint + test green.

## Blocked
