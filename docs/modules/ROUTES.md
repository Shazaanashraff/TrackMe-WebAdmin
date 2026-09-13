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

## Offline behaviour (Offline & Caching Audit §7)

`useSystemRoutes` persists to disk and now carries a 15-minute `staleTime` — the catalogue changes
a few times a month, so a background refetch on every visit was pure waste; the create/edit/toggle/
delete mutations still invalidate it on a real change. The page already used `AsyncSection` (so its
offline branch was inherited), the province filter is client-side, and column sort runs over the
fetched array. Added: the Create button and the row Edit / Activate-Deactivate / Delete gate on
`!isOnline` (with the edit `FormDialog` and delete `ConfirmDialog` `submitDisabled`/`confirmDisabled`);
a `StaleChip` sits in the list header.
