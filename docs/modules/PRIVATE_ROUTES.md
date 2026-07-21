# PRIVATE ROUTES — Web Admin

The manager side of private routes: reveal/rotate the room key, the hide and join-approval toggles, and approving join requests. Audited as fully done.

**Status:** `PLANNED (doc)` — the code is shipped; **this document is not yet written**.
Do not read its absence as "no such feature". Read the source below, then fill this file in from
[`../guides/_MODULE_TEMPLATE.md`](../guides/_MODULE_TEMPLATE.md) as part of your next change
here — that is the change protocol, not optional extra work.

## Source of truth until this doc exists

`src/pages/ManagerPrivateRoutesPage.jsx`, `src/hooks/use-private-routes.js`

## What this doc must cover

Template section order: Purpose · Key files (one job each) · Data flow · Contracts (API/socket/
storage) · **Not visible in the frontend** · Gotchas · Tests · Change protocol.

Pay particular attention to:
- **role scoping** — which of manager / super-admin may see this, and the fact that the backend,
  not the UI, is the gate;
- the **backend contract**: verify real endpoint paths against `backend/src` rather than
  inferring them, and link the matching `backend/docs/modules/*.md`;
- room-key reveal/rotate is **owner-only**; the two toggles (`isHidden`, `joinApprovalRequired`) are **independent** and disabled until Private is on;
- endpoints `GET /api/manager/routes/:routeId/join-requests` and `PATCH /api/manager/join-requests/:id/decision` — see [backend PRIVATE_ROUTES.md](../../../backend/docs/modules/PRIVATE_ROUTES.md);
- **known gap:** no pending-count badge on the "Private Routes" nav item though the data exists (`src/layout/AppShell.jsx`).
