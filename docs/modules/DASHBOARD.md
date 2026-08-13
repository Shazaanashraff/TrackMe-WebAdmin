# DASHBOARD — Web Admin

Super-admin dashboard and the manager dashboard.

**Status:** `PLANNED (doc)` — the code is shipped; **this document is not yet written**.
Do not read its absence as "no such feature". Read the source below, then fill this file in from
[`../guides/_MODULE_TEMPLATE.md`](../guides/_MODULE_TEMPLATE.md) as part of your next change
here — that is the change protocol, not optional extra work.

## Source of truth until this doc exists

`src/pages/DashboardPage.jsx`, `src/pages/ManagerDashboardPage.jsx`, `src/hooks/use-dashboard.js`

## What this doc must cover

Template section order: Purpose · Key files (one job each) · Data flow · Contracts (API/socket/
storage) · **Not visible in the frontend** · Gotchas · Tests · Change protocol.

Pay particular attention to:
- **role scoping** — which of manager / super-admin may see this, and the fact that the backend,
  not the UI, is the gate;
- the **backend contract**: verify real endpoint paths against `backend/src` rather than
  inferring them, and link the matching `backend/docs/modules/*.md`;
- which aggregates are computed server-side vs in the client.
