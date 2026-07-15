# 00 — Master Redesign Plan

Goal: every web-admin screen looks and behaves like a professional, minimal admin product —
the Shabeer register — with zero MUI left at the end, zero fabricated data, and full
loading/empty/error coverage. Scope excludes the auth pages (done).

## 1. Stack decisions (recommended — flag objections before Phase 0 lands)

| Area | Today | Target | Why |
|---|---|---|---|
| CSS engine | Tailwind 3.4 + MUI/Emotion | **Tailwind v4** (`@theme inline` CSS-var tokens) — but the token system lands on **v3 first** (CSS vars + `darkMode:'class'` + config mapping), and the v3→v4 jump is **deferred to Phase 6** after MUI is gone (doing it while `CssBaseline` is mounted risks preflight conflicts for no gain). Same destination, non-breaking. | Exactly how Shabeer defines its design language; kills `theme.js` + inline hex |
| Components | MUI v7 + 3 orphan shadcn files | **shadcn/ui** (new-york style, `"tsx": false` → JSX output) | Codebase is JSX; shadcn CLI generates JS variants; matches Shabeer 1:1 |
| Icons | @mui/icons-material + some lucide | **lucide-react only**, stroke 1.5, sizes 16/20 | One set, one style (Shabeer rule); lucide already installed |
| Tables | @mui/x-data-grid | **@tanstack/react-table** via shared `DataTable` | Shabeer's proven wrapper handles all async states centrally |
| Charts | @mui/x-charts | **Recharts via shadcn Chart** | shadcn-native, themable with CSS vars, honest empty states |
| Server state | `useEffect` + `refreshSignal` prop drilling | **@tanstack/react-query** hooks wrapping `adminApi` | Matches Shabeer + user-app locked decision; gives isLoading/isFetching/error for free; the Topbar refresh button becomes `queryClient.invalidateQueries()` |
| Toasts | MUI Snackbar | **sonner** | shadcn standard; undo-action support (Shabeer uses it for undo flows) |
| Dialogs | MUI Dialog + `window.prompt()` | **shadcn Dialog / AlertDialog / Sheet** | Kills todo 010 (window.prompt) as a side effect |
| Maps | react-leaflet | keep react-leaflet, restyled container | No reason to change |
| Animation | framer-motion | **remove** — CSS transitions only | Shabeer avoid-list: no animation that delays a result |
| Language | JSX | keep JSX | No TS migration scope creep in this track |

**Removed at the end (Phase 6):** `@mui/material`, `@mui/icons-material`, `@mui/x-charts`,
`@mui/x-data-grid`, `@emotion/react`, `@emotion/styled`, `framer-motion`, `src/theme.js`.

**Added:** `tailwindcss@4` (+ `@tailwindcss/vite`), `@tanstack/react-table`,
`@tanstack/react-query`, `sonner`, `@fontsource/inter`, `@fontsource/fira-code`,
shadcn primitives (vendored files, not a dependency).

## 2. Migration strategy — strangler, not big-bang

MUI and shadcn coexist during the migration. Order: tokens → shell → shared kit → pages
(one page per checkpoint) → MUI removal. A page is "migrated" only when it renders zero MUI
imports and passes its parity checklist in `04-VERIFICATION-CHECKLIST.md`.

Tailwind v4 upgrade note: v4 uses `@import "tailwindcss"` + CSS-first config; the existing
`tailwind.config.cjs` content-scanning still works via `@config` or is replaced by automatic
content detection. `ace-*` colors and `font-uber` utilities get re-declared as `@theme` tokens
so existing pages don't break mid-migration.

## 3. Phases & checkpoints

Work ONE checkpoint at a time. After each: run `npm run lint` + `npm test`, update
`PROGRESS.md`, commit (Conventional Commits). Screenshots before/after for page checkpoints.

### Phase 0 — Foundation
- **CP 0.1** ✅ (2026-07-15) — Token set in `src/index.css` (01-DESIGN-LANGUAGE, light+dark);
  `tailwind.config.cjs` extended with `darkMode:'class'` + semantic utilities mapping to the
  CSS vars (legacy `ace-*`/`uber` kept); `ColorModeProvider` now also toggles `.dark` on
  `<html>` so one control drives MUI + Tailwind, and honors `prefers-color-scheme` on first
  run. **Tailwind stayed v3** (v4 jump moved to Phase 6). Inter/Fira Code self-hosting moved
  to CP 0.2. Verified: tokens resolve + toggle, app boots clean, production build green.
- **CP 0.2** shadcn init (`components.json`, jsx, path aliases `@/`); vendor primitives:
  button, badge, card, input, label, textarea, select, checkbox, switch, radio-group,
  separator, skeleton, tooltip, popover, dropdown-menu, dialog, alert-dialog, sheet, tabs,
  table, avatar, breadcrumb, command, sonner, scroll-area, alert, pagination, chart.
  Delete the 3 orphan files in `components/ui/` (replaced by vendored versions).
- **CP 0.3** TanStack Query provider in `main.jsx`; `src/hooks/` query/mutation hooks wrapping
  every `adminApi` method used by pages (one hook file per domain: managers, operations,
  routes, buses, tracking, approvals, private-routes, dashboards). `refreshSignal` prop
  plumbing removed in favor of invalidation.
- **CP 0.4** Dev-only `/styleguide` route rendering every primitive + kit component in both
  themes (the review surface for sign-off before pages are touched).

### Phase 1 — App shell
- **CP 1.1** `layout/AppShell.jsx`: collapsible sidebar (w-56 ↔ w-14, persisted), wordmark,
  Lucide nav items with active state, role-driven nav list (super-admin vs manager), Sign out
  pinned bottom. Mobile: sidebar becomes a Sheet.
- **CP 1.2** Topbar: breadcrumb (route-driven, no fallback bug), command menu (⌘K search over
  nav + actions), refresh (query invalidation + spinner while `isFetching`), theme toggle,
  user menu (avatar initial, role label, sign out). Dead gear/bell icons are NOT carried over.
- **CP 1.3** Route-level `ErrorBoundary` + sonner `Toaster` mounted once; MUI Snackbar removed
  from `App.jsx`; `AppLoading` (session restore) rebuilt as minimal centered spinner + wordmark.

### Phase 2 — Shared kit (build once, reuse everywhere)
- **CP 2.1** `PageHeader`, `StatCard`, `StatusBadge`, `EmptyState`, `ErrorState`,
  `TableSkeleton`, `CardSkeleton`, `AsyncSection` (the AsyncBoundary equivalent).
- **CP 2.2** `DataTable` (TanStack wrapper: sorting, pagination, column visibility, row
  actions, empty/loading/error states, optional mobile card renderer).
- **CP 2.3** `ConfirmDialog`, `FormDialog`, `ExportMenu` (CSV), `CopyField` (room keys),
  `LiveIndicator`, `RelativeTime`, `formatLKR` display component (`Money`).

### Phase 3 — Super-admin pages (one CP each)
- **CP 3.1** Dashboard · **CP 3.2** Managers · **CP 3.3** Operations (+ manager detail)
- **CP 3.4** Routes · **CP 3.5** Settings (rebuilt honest — see page spec; absorbs todo 004)

### Phase 4 — Manager pages (one CP each)
- **CP 4.1** Dashboard · **CP 4.2** Buses · **CP 4.3** Tracking (live map)
- **CP 4.4** Accounts · **CP 4.5** Route Approvals · **CP 4.6** Private Routes
- **CP 4.7** Settings/Profile (absorbs todo 011)

### Phase 5 — Modals & special components
- **CP 5.1** `CustomRoutePreviewModal` + `RouteComparisonPanel` restyled on Dialog/Sheet.

### Phase 6 — Teardown & polish
- **CP 6.1** Remove MUI/Emotion/framer-motion deps + `theme.js`; **now do the Tailwind 3→4
  jump** (`@import "tailwindcss"`, `@theme inline`, drop the `.cjs` config) — safe once
  `CssBaseline` is gone; grep-gate: zero `@mui`, `@emotion`, `sx={`, `window.prompt`
  imports/usages in `src/`.
- **CP 6.2** a11y + responsive pass (focus rings, labels, contrast both themes, keyboard
  order, reduced-motion) — absorbs todo 016.
- **CP 6.3** Full run of `04-VERIFICATION-CHECKLIST.md` + fix findings; final code review.

## 4. Existing todo backlog — mapping

This track **absorbs** the pure-UI todos; data/backend todos stay in `todos/`.

| Todo | Fate |
|---|---|
| 002 unify-button-system | Absorbed by CP 0.2 (single shadcn Button) |
| 003 app-shell-and-topbar | Absorbed by Phase 1 |
| 004 kill-superadmin-settings-fake | Absorbed by CP 3.5 |
| 005 kill-manager-fake-operations | Absorbed by CP 4.1 |
| 007 honest-dashboard-charts | Absorbed by CP 3.1 / 4.1 |
| 008 fix-operations-dark-boxes | Absorbed by CP 3.3 |
| 010 replace-window-prompts | Absorbed by CP 3.3 / 4.2 (ConfirmDialog/FormDialog) |
| 011 build-manager-profile | Absorbed by CP 4.7 |
| 012 rebuild-superadmin-dashboard | Absorbed by CP 3.1 |
| 013 rebuild-manager-dashboard | Absorbed by CP 4.1 (Distance KPI still gated on todo 018 backend) |
| 014 remove-filler-cards | Absorbed by CP 3.2 / 4.4 / 3.1 |
| 015 loading-empty-states | Absorbed by Phase 2 + every page CP |
| 016 a11y-responsive-pass | Absorbed by CP 6.2 |
| 001, 006, 009, 017, 020 (complete) | Kept — LKR helper, honest metrics etc. carry into new pages |
| 018, 019, 021, 022, 023, 024, 025 | **Stay in todos/** (backend/feature work); their future UIs must use this design system |

When a todo is absorbed and shipped, tick it in `todos/todo-list.md` with a pointer to the CP.

## 5. Quality gates (every checkpoint)

1. `npm run lint` + `npm test` green; no skipped tests.
2. New/changed components have Vitest tests (kit components especially: all async states).
3. Page CPs: e2e smoke updated if flow changed; before/after screenshot; zero console errors.
4. No new inline hex; tokens only. No `@mui` imports added to migrated files.
5. Parity: every `adminApi` call and user flow listed for that page in
   `04-VERIFICATION-CHECKLIST.md` still works — restyle, never silently drop behavior.
6. Update `PROGRESS.md` (checkbox + date + sha) before moving on.
