# TODO 002 — Unify the button system

**Phase:** 0 · **Priority:** P1 · **Depends on:** 001
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §5, `src/components/ui/button.jsx`

## Why
The app ships two button systems: MUI `@mui/material` `Button` (most pages) and a custom
shadcn/CVA-style `src/components/ui/button.jsx` (used in ManagersPage). Two sets of variants,
sizes, and focus styles = inconsistent UI and double maintenance.

## Step-by-step
1. **Decide and document** the single system. Default recommendation: standardize on **MUI
   `Button`** themed in todo 001 (rest of the app + dialogs/data-grids are MUI). Record the
   decision + rationale at the top of `docs/DESIGN_TOKENS.md`.
2. Map every variant/size used by the retired component to the chosen one (e.g. shadcn
   `variant="outline"/"secondary"`, `size="sm"` → MUI `variant="outlined"/"contained"`,
   `size="small"`).
3. Replace all imports of the retired button (grep `components/ui/button`) — currently
   `ManagersPage.jsx`. Delete `src/components/ui/button.jsx` once unreferenced (and `input.jsx`
   too if it becomes orphaned — check first).
4. Keep behavior identical (onClick, disabled, type, form submit). Visual change only.
5. Unit test: the migrated page still renders its actions and fires handlers.

## Design references
- MUI Button API/variants: https://mui.com/material-ui/react-button/
- If instead you standardize on shadcn (only if the team wants Tailwind-first): Button
  https://ui.shadcn.com/docs/components/button — but then plan to migrate MUI usages, which is a
  much bigger effort; note that trade-off in the decision doc.

## Out of scope
Migrating IconButtons, wholesale page restyles. Just consolidate the text/contained buttons.

## Completion test
`todos/completion-tests/todo-002.sh` — no source file imports `components/ui/button`;
`src/components/ui/button.jsx` deleted; decision recorded in `docs/DESIGN_TOKENS.md`; lint + test
green.

## Blocked
