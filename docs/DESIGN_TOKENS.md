# Design Tokens

Single source of truth: `src/theme.js`, exported as `darkTheme` and wired into the app via
`<ThemeProvider theme={darkTheme}>` + `<CssBaseline />` in `src/main.jsx`.

Consume tokens through `theme.palette.*` / `theme.custom.*` (e.g. `const theme = useTheme()` or an
`sx={(theme) => ({...})}` callback). Do not hardcode hex literals in pages/components — that's the
thing this token pass exists to remove.

## Palette

| Token | Value | Intent |
|---|---|---|
| `palette.primary.main` | `#2f2f2f` | Primary text / dark UI accents |
| `palette.primary.dark` | `#161616` | Gradient start, hover states |
| `palette.primary.light` | `#4a4a4a` | Gradient end |
| `palette.secondary.main` | `#5e5e5e` | Secondary accents |
| `palette.info.main` | `#17c1e8` | Informational accents |
| `palette.success.main` | `#82d616` | Success / positive states |
| `palette.warning.main` | `#fbcf33` | Warning states |
| `palette.error.main` | `#ea0606` | Error / destructive states |
| `palette.background.default` | `#f8f9fa` | App/page background |
| `palette.background.paper` | `#ffffff` | Card/surface background |
| `palette.text.primary` | `#2f2f2f` | Headings, primary body text |
| `palette.text.secondary` | `#6b7280` | Secondary/muted text |
| `palette.divider` | `rgba(0,0,0,0.08)` | Divider lines |

## Custom tokens (`theme.custom`)

| Token | Value | Intent |
|---|---|---|
| `custom.gradients.primary` | `linear-gradient(310deg, #161616 0%, #4a4a4a 100%)` | Sidebar logos, active nav items, primary CTA buttons |
| `custom.border` | `#d2d6da` | Input/field borders outside MUI's default outlined-input styling |

## Spacing / shape / shadows

- `spacing`: 8px base unit (MUI default, declared explicitly).
- `shape.borderRadius`: 8px standard unit; Cards use a fixed 16px (`components.MuiCard`).
- `shadows`: a short custom scale (`none` / xs / sm / md / lg) — see `theme.js` for exact values;
  indices above `4` fall back to `none` rather than MUI's default shadow ramp.

## Typography

Font family: `"Uber Move", sans-serif`. Headings (`h1`–`h6`) are weight 800; body/subtitle/caption
weights and sizes are declared explicitly in `theme.js` — see that file for the full scale.

## Component defaults

`theme.components` sets defaults for `MuiCard`, `MuiButton`, `MuiDivider`, `MuiTableCell` and
`MuiTextField` so pages stop repeating `sx={{ borderRadius, boxShadow, border }}` on every Card.

## Migrated surfaces (proof of concept)

`ManagerLayout`, `SuperAdminLayout` and `ManagersPage` consume these tokens instead of inline hex.
Full page-by-page migration happens in later `todos/active/NNN-*.md` items — this pass only proves
the tokens work end to end.
