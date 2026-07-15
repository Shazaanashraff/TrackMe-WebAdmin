# 02 — Component Inventory

Three tiers, mirroring Shabeer: **`components/ui/`** (vendored shadcn primitives — never
hand-edited beyond theming), **`components/shared/`** (cross-page kit — where the real design
system lives), **`layout/`** (shell). Pages compose these; a page file should contain almost
no bespoke styling.

## Tier 1 — shadcn primitives (`components/ui/`, vendored via CLI, JSX)

| Primitive | Used for |
|---|---|
| `button` | Everything. Variants: default (emerald), outline, ghost, destructive, link; sizes sm/default/icon. THE only button in the app |
| `badge` | StatusBadge base; variants extended with the 5 status colors |
| `card` | KPI cards, panels, map container, settings sections |
| `input`, `label`, `textarea` | All forms; search inputs with leading Lucide icon |
| `select`, `checkbox`, `switch`, `radio-group` | Form controls (route pickers, privacy toggle, filters) |
| `separator` | Section splits in sidebars/menus/settings |
| `skeleton` | Base of TableSkeleton/CardSkeleton; shimmer via `animate-pulse` |
| `tooltip` | Icon-only buttons, truncated text, absolute timestamps |
| `popover` | Filters, column pickers |
| `dropdown-menu` | Row actions (⋯), user menu, export menu |
| `dialog` | FormDialog base (create/edit flows) |
| `alert-dialog` | ConfirmDialog base (destructive confirms — replaces every `window.prompt`/`confirm`) |
| `sheet` | Detail panels (manager detail, bus detail, members list), mobile sidebar |
| `tabs` | Private Routes (Requests/Members), Operations (Overview/Requests/Audit), Settings sections |
| `table` | DataTable base markup |
| `avatar` | User menu, manager rows (initials fallback — avatars are backend base64) |
| `breadcrumb` | Topbar location |
| `command` | ⌘K command menu (nav + quick actions) |
| `sonner` | Toasts: mutation success/failure, undo actions |
| `scroll-area` | Sidebar nav, long sheets, audit log |
| `alert` | Inline non-toast notices (e.g. "GPS data older than 15 min") |
| `pagination` | DataTable footer |
| `chart` | Recharts wrapper themed by CSS vars (dashboard charts) |

## Tier 2 — shared kit (`components/shared/`)

Every component handles: populated, loading, empty, error. Tests cover all states.

| Component | Props (core) | Spec |
|---|---|---|
| `PageHeader` | `title, description?, actions?` | h1 (Uber Move, 24px) + muted description + right action slot. `mb-6`. Every page starts with this — the giant centered ghost heading dies |
| `StatCard` | `label, value, icon, hint?, trend?, isLoading, href?` | KPI tile: muted 12px uppercase label, 32px Fira Code tabular value, 20px Lucide icon in a muted square. `isLoading` → skeleton lines. NO fake deltas — `trend` renders only when a real series exists |
| `DataTable` | `columns, data, isLoading, error, onRetry, onRowClick?, emptyTitle/Description/Action, skeletonRows=8, renderMobileCard?, totalCount?` | TanStack wrapper, ported from Shabeer: sorting (chevron affordances), pagination footer (count + page buttons), column visibility menu, hover `bg-surface-muted/60`, row-action column revealed on hover/focus. State machine: loading→TableSkeleton, error→ErrorState, empty→EmptyState, else table |
| `TableSkeleton` | `rows=8, cols` | Header bar + N rows of skeleton lines, `role="status"`, sr-only "Loading…" |
| `CardSkeleton` | `lines=3` | Card-shaped skeleton for KPI tiles / panels / map placeholder |
| `AsyncSection` | `isLoading, error, data, isEmpty?, onRetry, loadingFallback, empty*` | Decision-tree wrapper for non-table sections (charts, detail sheets, map). One way to render async state everywhere |
| `EmptyState` | `icon?, title, description?, action?` | Centered Lucide icon (40px, muted) + title + optional CTA. Every list/queue has a tailored one |
| `ErrorState` | `error, onRetry` | Human message (mapped, never raw stack) + Retry button |
| `StatusBadge` | `status, label?` | Domain map → 5 badge variants (see 01). Central `DOMAIN_MAP` for: bus online/idle/offline, request pending/approved/rejected, manager active/suspended, route public/private, GPS fresh/stale |
| `ConfirmDialog` | `open, title, description, confirmLabel, destructive?, pending, onConfirm, requireReason?` | AlertDialog; optional reason textarea (bus delete reason, review note — kills `window.prompt`). Confirm shows spinner while pending |
| `FormDialog` | `open, title, children, onSubmit, pending, error?` | Dialog + standard footer (Cancel/Save), server-error slot above footer, focus trap |
| `ExportMenu` | `data, columns, filename` | Dropdown → CSV download of current filtered/sorted rows |
| `CopyField` | `value, masked?, onReveal?` | Mono field + copy button + optional reveal (room keys). Copied → toast |
| `LiveIndicator` | `state: live\|stale\|offline` | Dot + label; pulse only when live and motion allowed |
| `RelativeTime` | `date` | "4 min ago" + absolute tooltip, Asia/Colombo |
| `Money` | `amount` | `formatLKR`, Fira Code, tabular-nums, right-aligned |
| `SearchInput` | `value, onChange, placeholder` | Input with leading Search icon, `max-w-xs`, debounced |
| `FilterBar` | `children` | Toolbar row under PageHeader: search + filters left, columns/export/refresh right (`border-b` px-6 py-3) |
| `KpiGrid` | `children` | Responsive grid for StatCards: 1 → 2 → 4 cols |

## Tier 3 — shell (`layout/`)

| Component | Spec |
|---|---|
| `AppShell` | Replaces SuperAdminLayout + ManagerLayout with ONE component taking a `nav` config per role. Grid: sidebar + (topbar / scrollable outlet). Content in `max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-6` |
| `Sidebar` | `bg-surface border-r`; collapsible w-56 ↔ w-14 (chevron toggle, persisted in localStorage); wordmark row h-12; NavItems; Sign out pinned bottom as ghost destructive-on-hover. Hidden < md |
| `NavItem` | Lucide 20px + label; active = `bg-primary/10 text-primary` + 2px left rail; collapsed = icon-only + tooltip |
| `Topbar` | h-14 `border-b bg-surface`: breadcrumb left (route-driven; fixes fallback bug), right cluster: ⌘K search trigger, Refresh (invalidateQueries; spins while fetching), ThemeToggle, user DropdownMenu (avatar/initials, name, role, sign out). No dead bell/gear |
| `CommandMenu` | shadcn `command` in a dialog; ⌘K/Ctrl-K; groups: Navigate (all nav items), Actions (New manager, New route… role-aware) |
| `MobileNav` | Hamburger in Topbar < md → Sheet with the same NavItems |
| `ErrorBoundary` | Root + per-route; friendly fallback + Reload |
| `AppLoading` | Session-restore screen: wordmark + spinner, token colors (no gradient) |

## Query hooks (`src/hooks/`) — one file per domain

`use-dashboard.js`, `use-managers.js`, `use-operations.js`, `use-system-routes.js`,
`use-manager-dashboard.js`, `use-buses.js`, `use-tracking.js` (query + socket merge),
`use-route-approvals.js`, `use-private-routes.js`.
Pattern: `useQuery`/`useMutation` wrapping `adminApi.*`, central `queryKeys.js`, mutations
invalidate their domain keys. Components never call `adminApi` directly after migration.
