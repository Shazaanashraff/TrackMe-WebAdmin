# TODO 015 — Consistent loading skeletons + empty states

**Phase:** 4 · **Priority:** P3 · **Depends on:** 001
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §5

## Why
Loading and empty handling is inconsistent: the super-admin dashboard has skeletons, most other
pages don't; empty tables show a bare "No rows"; some panels render nothing while loading. A shared
pattern makes the app feel finished and reinforces the "honest zero state" principle.

## Step-by-step
1. Add reusable `src/components/ui/EmptyState.jsx` (icon + title + optional action) and a
   `LoadingSkeleton` pattern (or standardize on MUI `Skeleton`) in the theme.
2. Apply to the primary data surfaces that lack them: Operations panels, Managers grid, Manager
   Buses, Route Approvals, Private Routes, both rebuilt dashboards. Use consistent copy.
3. Ensure every list/table has three explicit states: loading (skeleton), empty (EmptyState),
   loaded. No panel should render blank on load.
4. Tests: EmptyState renders title/action; a representative page shows skeleton while loading and
   EmptyState when data is empty.

## Design references
- Skeleton: https://ui.shadcn.com/docs/components/skeleton (MUI `Skeleton`).
- Empty states: patterns from https://ui.shadcn.com/blocks ; keep copy honest ("No buses yet",
  "No pending requests").

## Out of scope
New data fetching. Page re-layouts (done in earlier todos).

## Completion test
`todos/completion-tests/todo-015.sh` — `EmptyState` component exists and is imported by ≥3 pages;
at least the dashboards + one list page use `Skeleton`/EmptyState; lint + test green.

## Blocked
