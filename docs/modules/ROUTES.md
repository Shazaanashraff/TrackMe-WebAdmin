# ROUTES — Web Admin

The routes catalogue and system routes.

**Status:** `PLANNED (doc)` — the code is shipped; **this document is not yet written**.
Do not read its absence as "no such feature". Read the source below, then fill this file in from
[`../guides/_MODULE_TEMPLATE.md`](../guides/_MODULE_TEMPLATE.md) as part of your next change
here — that is the change protocol, not optional extra work.

## Source of truth until this doc exists

`src/pages/RoutesPage.jsx`, `src/hooks/use-system-routes.js`

## What this doc must cover

Template section order: Purpose · Key files (one job each) · Data flow · Contracts (API/socket/
storage) · **Not visible in the frontend** · Gotchas · Tests · Change protocol.

Pay particular attention to:
- **role scoping** — which of manager / super-admin may see this, and the fact that the backend,
  not the UI, is the gate;
- the **backend contract**: verify real endpoint paths against `backend/src` rather than
  inferring them, and link the matching `backend/docs/modules/*.md`;
- as of issue #39, `RoutesPage.jsx` also edits (`PUT`), deactivates/activates (`PATCH .../toggle`),
  and deletes (`DELETE`) a route — all three go to `/api/routes/:routeId(/toggle)` on the backend,
  confirmed against `backend/src/routes/routeRoutes.js`. (A prior version of this note claimed the
  catalogue lived under `/api/bus/` — that was never true for this page; `getSystemRoutes` /
  `createSystemRoute` / the three new mutations all call `/api/routes`.)
