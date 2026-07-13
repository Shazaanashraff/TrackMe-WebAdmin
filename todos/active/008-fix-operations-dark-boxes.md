# TODO 008 — Fix invisible dark boxes in Operations

**Phase:** 2 · **Priority:** P2 · **Depends on:** 001
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §2.3, `src/pages/OperationsPage.jsx:355,:659`

## Why
Two dark-theme leftovers on the light page: the 4 "Manager Operations Detail" metric boxes use
`backgroundColor: '#0f172a'` (dark navy) and the request-preview `<pre>` uses `'#0b1220'` — both
render near-invisible dark text on dark. Confirmed in `sa-operations.png`.

## Step-by-step
1. Replace the `#0f172a` metric-box background (`:355`) with the theme card surface (light) and
   theme text colors from todo 001. Match the other metric cards on the page for consistency.
2. Replace the `#0b1220` `<pre>` background (`:659`) with a light "code" surface (e.g. theme
   `grey[100]` / `grey[900]` text) so the JSON payload is readable.
3. Grep the rest of the file (and app) for other `#0f172a`/`#0b1220`/near-black backgrounds on
   light surfaces and fix any strays.
4. Test/visual: values in the detail cards and the payload preview are legible (dark text on light).

## Design references
- Use the theme surfaces from todo 001; MUI `Paper`/`Card` default backgrounds.
- Readable code/JSON block: light bg + monospace; e.g. shadcn "code" styling
  https://ui.shadcn.com/docs/components/typography as a reference.

## Out of scope
Restructuring the Operations page. Other pages' styling.

## Completion test
`todos/completion-tests/todo-008.sh` — grep proves `#0f172a` and `#0b1220` no longer appear in
`OperationsPage.jsx`; lint + test green.

## Blocked
