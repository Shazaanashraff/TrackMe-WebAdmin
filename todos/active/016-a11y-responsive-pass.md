# TODO 016 — Accessibility + responsive pass

**Phase:** 4 · **Priority:** P3 · **Depends on:** 003
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §5

## Why
The shell is desktop-only (permanent 260px drawer, no mobile collapse) and several controls lack
labels/roles. A production admin panel should be usable on a laptop-to-tablet range and pass basic
a11y.

## Step-by-step
1. Make the sidebar responsive: permanent on `md+`, a temporary `Drawer` with a hamburger toggle
   below `md`. Content must not sit under the drawer on small screens.
2. Add `aria-label`s / roles to icon-only controls kept after todo 003 (refresh, notifications,
   avatar menu). Ensure focus-visible styles from the theme.
3. Check color contrast of the greys/greens against WCAG AA (the muted `#67748e`/`#9ca3af` on white
   for small text); bump where failing.
4. Keyboard: dialogs trap focus (MUI does this), nav items reachable, no positive `tabindex`.
5. Tests: sidebar toggles on small viewport (e2e or component); icon buttons expose accessible
   names.

## Design references
- Responsive sidebar: shadcn Sidebar (mobile behavior) https://ui.shadcn.com/docs/components/sidebar ;
  MUI responsive Drawer https://mui.com/material-ui/react-drawer/#responsive-drawer .
- Contrast: WCAG AA (4.5:1 text) — verify with any contrast checker.

## Out of scope
Full mobile redesign of every page body; deep audit beyond the shell + shared controls.

## Completion test
`todos/completion-tests/todo-016.sh` — shell renders a mobile drawer toggle (grep for a temporary
`Drawer`/menu button in the shell); icon buttons in the shell have `aria-label`; lint + test green;
`npm run test:e2e` if a responsive e2e is added.

## Blocked
