# TRACKING — Web Admin

The manager live-tracking map.

**Status:** `PLANNED (doc)` — the code is shipped; **this document is not yet written**.
Do not read its absence as "no such feature". Read the source below, then fill this file in from
[`../guides/_MODULE_TEMPLATE.md`](../guides/_MODULE_TEMPLATE.md) as part of your next change
here — that is the change protocol, not optional extra work.

## Source of truth until this doc exists

`src/pages/ManagerTrackingPage.jsx`, `src/hooks/use-tracking.js`, `src/lib/polyline.js`, `src/lib/map-tokens.js`

## What this doc must cover

Template section order: Purpose · Key files (one job each) · Data flow · Contracts (API/socket/
storage) · **Not visible in the frontend** · Gotchas · Tests · Change protocol.

Pay particular attention to:
- **role scoping** — which of manager / super-admin may see this, and the fact that the backend,
  not the UI, is the gate;
- the **backend contract**: verify real endpoint paths against `backend/src` rather than
  inferring them, and link the matching `backend/docs/modules/*.md`;
- the socket rooms it joins (`manager:join-bus` → `bus:<busId>`) and which broadcasts it consumes — see [backend REALTIME.md](../../../backend/docs/modules/REALTIME.md).
