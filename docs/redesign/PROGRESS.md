# Redesign Progress Tracker

> **CURRENT STATE:** CP 0.1 + 0.2 done, committed on branch `redesign/phase-0-foundation`.
> Token system on Tailwind **3** (v4 → Phase 6). shadcn foundation + 24 vendored primitives
> live, fonts self-hosted. **NEXT ACTION:** CP 0.3 — TanStack Query provider in `main.jsx`,
> `src/hooks/` query/mutation hooks wrapping every `adminApi.*` used by pages, remove the
> `refreshSignal` prop-drilling in favour of `queryClient.invalidateQueries()`.

Update the block above + tick checkpoints (`[x] … — done: DATE sha`) after every checkpoint.
One checkpoint per run. Tests green before ticking.

## Phase 0 — Foundation
- [x] CP 0.1 Semantic tokens (light/dark) + `darkMode:'class'` synced to MUI ColorMode + a11y/reduced-motion base — done: 2026-07-15 (Tailwind stays v3 for now — see Findings)
- [x] CP 0.2 shadcn foundation (`components.json`, `@/` alias via vite+jsconfig) + 24 vendored token-based primitives (JSX) + orphan button/input/card replaced in place + Inter/Fira Code self-hosted + `tailwindcss-animate` — done: 2026-07-16
- [ ] CP 0.3 TanStack Query provider + hooks per domain + refreshSignal removal
- [ ] CP 0.4 /styleguide review route (both themes)

## Phase 1 — App shell
- [ ] CP 1.1 AppShell + Sidebar (collapsible, role nav, badges)
- [ ] CP 1.2 Topbar (breadcrumb, ⌘K, refresh, theme, user menu)
- [ ] CP 1.3 ErrorBoundary + Toaster + AppLoading

## Phase 2 — Shared kit
- [ ] CP 2.1 PageHeader, StatCard, StatusBadge, EmptyState, ErrorState, skeletons, AsyncSection
- [ ] CP 2.2 DataTable
- [ ] CP 2.3 ConfirmDialog, FormDialog, ExportMenu, CopyField, LiveIndicator, RelativeTime, Money

## Phase 3 — Super-admin pages
- [ ] CP 3.1 Dashboard
- [ ] CP 3.2 Managers
- [ ] CP 3.3 Operations (+ detail sheet)
- [ ] CP 3.4 Routes
- [ ] CP 3.5 Settings (honest rebuild)

## Phase 4 — Manager pages
- [ ] CP 4.1 Dashboard
- [ ] CP 4.2 Buses
- [ ] CP 4.3 Tracking
- [ ] CP 4.4 Accounts
- [ ] CP 4.5 Route Approvals
- [ ] CP 4.6 Private Routes
- [ ] CP 4.7 Settings/Profile

## Phase 5 — Special components
- [ ] CP 5.1 CustomRoutePreviewModal + RouteComparisonPanel

## Phase 6 — Teardown & polish
- [ ] CP 6.1 Remove MUI/Emotion/framer-motion + theme.js; grep gates pass
- [ ] CP 6.2 a11y + responsive pass
- [ ] CP 6.3 Full 04-VERIFICATION-CHECKLIST run + final code review

## Findings / blocked log

| Date | CP | Finding / blocker | Resolution |
|---|---|---|---|
| 2026-07-15 | 0.1 | Dark mode is driven by MUI's `ColorModeProvider` (React context), not a `.dark` class. Jumping to Tailwind v4 while MUI `CssBaseline` is still mounted on every page risks preflight/border-reset conflicts across all live pages for no incremental benefit. | **Deferred the Tailwind 3→4 jump to Phase 6** (after MUI is gone). Built the token system on Tailwind 3 (`darkMode:'class'` + CSS-var utilities) — same destination, non-breaking. `ColorModeProvider` now also toggles `.dark` so one control drives both systems. |
| 2026-07-15 | 0.1 | `npm test` shows 3 suites failing with `EMFILE: too many open files` on `@mui/icons-material` barrels (DashboardPage, OperationsPage, ManagerDashboardPage). | **Pre-existing / environmental** — confirmed identical failure on a clean tree (changes stashed). Windows file-handle exhaustion from MUI icon barrels under vitest; will disappear as those pages drop MUI. 47 tests pass, incl. the ColorMode suite. |
| 2026-07-15 | 0.1 | `npm run lint` red (6 errors). | **Pre-existing** — all in untouched pages (unused imports, unescaped entity). CP 0.1 added no new lint error. Cleared as pages migrate. |
| 2026-07-15 | 0.1 | Font roles: Inter (body) + Fira Code (numbers) not yet self-hosted. | `--font-sans`/`--font-mono` fall back to system stacks for now; `@fontsource/inter` + `@fontsource/fira-code` land in CP 0.2 (needs `npm install`). Uber Move (brand) already self-hosted. → **Resolved in CP 0.2.** |
| 2026-07-16 | 0.2 | Which primitives to vendor now vs. later. | Vendored 24 (button, input, card, badge, label, textarea, skeleton, separator, dialog, alert-dialog, sheet, dropdown-menu, tooltip, popover, tabs, avatar, scroll-area, select, checkbox, switch, radio-group, sonner, table, breadcrumb, alert, pagination). **Deferred:** `command` (needs cmdk) → CP 1.2, `chart` (needs recharts) → dashboards CP 3.1/4.1. Add via `npx shadcn add` or hand-vendor when their consumer lands. |
| 2026-07-16 | 0.2 | 3 orphan `components/ui/` files used hardcoded slate/indigo and `input.jsx`/`button.jsx` are imported by ManagersPage. | **Replaced in place** (same export names) rather than deleted — ManagersPage keeps building and gets restyled for free; full ManagersPage migration is CP 3.2. |
| 2026-07-16 | 0.2 | `@fontsource` `@import`s must precede `@tailwind`; and `sonner` shadcn template uses `next-themes`. | Moved font `@import`s to top of `index.css` (verified fonts load, no 404). Rewired `sonner.jsx` to our `useColorMode()` instead of adding `next-themes`. |
| 2026-07-16 | 0.2 | Lint: 3 `react-refresh/only-export-components` **warnings** on button/badge/alert (they co-export `*Variants`). | Inherent to shadcn's variant pattern (Shabeer's files carry the same); warnings, non-failing. 0 errors. |
