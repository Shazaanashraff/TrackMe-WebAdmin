# TODO 010 — Replace window.prompt() with real dialogs

**Phase:** 2 · **Priority:** P2 · **Depends on:** 001
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §2.3 & §3.2,
`src/pages/OperationsPage.jsx:128`, `src/pages/ManagerBusesPage.jsx:155`

## Why
Two flows collect input via the browser's native `window.prompt()`: the Operations approve/reject
note and the manager bus delete-request reason. It's jarring, unstyled, untestable, and blocks the
main thread.

## Step-by-step
1. **Operations review note** (`OperationsPage.jsx` `handleReviewRequest`): replace the `prompt`
   with a MUI `Dialog` containing a `TextField` (optional note) + Approve/Reject confirmation. Keep
   the exact `adminApi.reviewBusRequest(requestId, { decision, note })` call and busy state.
2. **Bus delete reason** (`ManagerBusesPage.jsx` `handleDeleteRequest`): replace the `prompt` with a
   confirm `Dialog` + optional reason `TextField`; keep `adminApi.requestDeleteBus(busId,{reason})`.
3. Both dialogs: disable submit while in flight; surface errors inline (not `window.alert`).
4. Tests: opening the dialog, typing a note, and confirming calls the API with the note; cancel
   calls nothing.

## Design references
- Confirmation dialog with reason: shadcn Alert Dialog https://ui.shadcn.com/docs/components/alert-dialog
  and Dialog https://ui.shadcn.com/docs/components/dialog (MUI equivalent: `Dialog` — already used
  elsewhere in these very files, e.g. the edit-bus dialog, so copy that pattern).

## Out of scope
Other confirm flows that already use dialogs. Restyling the pages.

## Completion test
`todos/completion-tests/todo-010.sh` — grep proves no `window.prompt(` remains in
`OperationsPage.jsx` or `ManagerBusesPage.jsx`; both still call their respective `adminApi` review/
delete methods; lint + test green.

## Blocked
