# TODO 012 — Rebuild the super-admin dashboard (real, actionable)

**Phase:** 3 · **Priority:** P2 · **Depends on:** 006, 007
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §2.1 & §5, `src/pages/DashboardPage.jsx`

## Why
After 006/007 the fabricated deltas and charts are gone; now re-lay the page so it leads with real,
actionable content instead of hero charts. Currently the least-trustworthy content is above the
fold and the most useful (pending approvals, real fleet status) is buried.

## Step-by-step
1. Establish hierarchy top→bottom: (a) real KPI row (managers, active buses, pending requests,
   confirmed bookings — all already fetched), (b) **Pending approvals queue** as the primary CTA
   (data from `getPendingBusRequests`) linking into Operations, (c) real charts/insights only if a
   real series exists (todo 007), else omit.
2. Make KPI cards clickable where it makes sense (e.g. Pending → Operations).
3. Keep the real "Operations" table but drop the hardcoded "Fleet Scale 70%" bar (coordinate with
   todo 014) — show a real count or nothing.
4. Remove leftover decorative scaffolding (fake timeline glyphs) unless backed by real events.
5. Tests: renders real KPIs; empty states when zero; pending-queue links navigate correctly.

## Design references
- Admin dashboard layout/hierarchy: shadcn dashboard blocks https://ui.shadcn.com/blocks ,
  Tremor dashboard blocks https://www.tremor.so/blocks .
- Inspiration for "lead with real numbers + queues, not hero charts": Vercel, Linear, Stripe
  dashboards.

## Out of scope
Backend endpoints for new series (→ todo 007 `## Blocked`). Manager dashboard (todo 013).

## Completion test
`todos/completion-tests/todo-012.sh` — no synthetic/hardcoded metric literals remain (re-assert
006/007 greps); dashboard renders a pending-approvals element sourced from `adminApi`; lint + test
green.

## Blocked
