# TODO 001 — Central design tokens + MUI theme

**Phase:** 0 · **Priority:** P1 · **Depends on:** —
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §5 (consistency), `src/theme.js`

## Why
Colors, radii, shadows and type are hardcoded as inline hex literals in nearly every file
(`#2f2f2f`, `#344767`, `#67748e`, `#82d616`, `linear-gradient(310deg,#161616…)`, etc.). There is a
`src/theme.js` but it isn't the single source of truth. A theme pass is step one of any overhaul —
everything after this todo consumes the tokens instead of re-inventing them.

## Step-by-step
1. Define a token set in `src/theme.js`: brand/neutral palette (map the existing greys/greens),
   `spacing`, `shape.borderRadius`, `shadows`, and `typography` (the app uses "Uber Move" — declare
   it once). Capture the recurring gradient as a single token/util.
2. Build a MUI theme via `createTheme(...)` and wrap the app in `<ThemeProvider theme={...}>` +
   `<CssBaseline/>` in `src/main.jsx`.
3. Set MUI component defaults in the theme (`components.MuiCard`, `MuiButton`, `MuiTextField`) so
   pages stop repeating `sx={{ borderRadius, boxShadow, border }}` on every Card.
4. Migrate 2–3 representative surfaces (both layouts + one page) to consume theme values via
   `theme.palette.*` / `sx` callbacks — proving the tokens. Full migration happens per-page in
   later todos; do NOT restyle every page here.
5. Add `docs/DESIGN_TOKENS.md` (short) listing the tokens and their intent.

## Design references
- MUI theming: https://mui.com/material-ui/customization/theming/ and default-props/overrides:
  https://mui.com/material-ui/customization/theme-components/
- Token scale inspiration (spacing/radius/shadow/semantic color): shadcn theme
  https://ui.shadcn.com/themes and https://ui.shadcn.com/docs/theming
- Neutral, professional admin palettes: Tremor https://www.tremor.so/ , Untitled UI colors.

## Out of scope
Restyling every page (later todos). Choosing the Button system (todo 002). Charts (007).

## Completion test
`todos/completion-tests/todo-001.sh` — `theme.js` exports a `createTheme` theme with palette +
typography + shape; `main.jsx` wraps in `ThemeProvider` + `CssBaseline`; `docs/DESIGN_TOKENS.md`
exists; lint + test green.

## Blocked
