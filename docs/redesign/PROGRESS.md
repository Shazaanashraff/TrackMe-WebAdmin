# Redesign Progress Tracker

> **CURRENT STATE:** CP 0.1 done (2026-07-15) on branch `redesign/phase-0-foundation`
> (uncommitted — awaiting user go-ahead to commit). Token system live on Tailwind **3**
> (v4 jump deferred to Phase 6 — see Findings). **NEXT ACTION:** CP 0.2 — shadcn init +
> vendor primitives (JSX) + delete the 3 orphan `components/ui/` files.

Update the block above + tick checkpoints (`[x] … — done: DATE sha`) after every checkpoint.
One checkpoint per run. Tests green before ticking.

## Phase 0 — Foundation
- [x] CP 0.1 Semantic tokens (light/dark) + `darkMode:'class'` synced to MUI ColorMode + a11y/reduced-motion base — done: 2026-07-15 (Tailwind stays v3 for now — see Findings)
- [ ] CP 0.2 shadcn init + vendored primitives (JSX) + delete orphan ui files
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
| 2026-07-15 | 0.1 | Font roles: Inter (body) + Fira Code (numbers) not yet self-hosted. | `--font-sans`/`--font-mono` fall back to system stacks for now; `@fontsource/inter` + `@fontsource/fira-code` land in CP 0.2 (needs `npm install`). Uber Move (brand) already self-hosted. |
