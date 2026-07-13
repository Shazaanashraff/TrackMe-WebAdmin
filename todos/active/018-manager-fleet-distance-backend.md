# TODO 018 — Backend: fleet distance-travelled for the manager dashboard

**Phase:** 2.5 · **Priority:** P2 · **Depends on:** —
**Cite:** stakeholder review item 5, backend `controllers/managerController.js` `getManagerDashboard`,
`controllers/driverEarningsController.js` (`totalDistance`), `controllers/customRouteController.js`
(`totalDistanceKm`)

## Why
Todo 013 replaces the (always-zero) Revenue KPI with **Distance Travelled**, but no manager-facing
aggregate exists. Journey distance is computed elsewhere (driver earnings / custom-route recording)
— we need it summed for a manager's fleet and returned by the dashboard endpoint.

> This is a **backend** todo (runs in `backend/`, not `web-admin/`). It follows the backend
> testing policy: integration test + a `docs/TESTING_GUIDE.md` row. It is listed here because it
> gates the web-admin todo 013.

## Step-by-step
1. Identify the authoritative distance source. Check the journey/trip model + how
   `driverEarningsController` derives `totalDistance`, and whether a Journey/Trip document stores a
   per-trip distance. Prefer summing persisted trip distances over recomputing from raw points.
2. Add an aggregation in `getManagerDashboard` (or a helper) that sums distance across the manager's
   buses' journeys, returning `fleet.totalDistanceKm` (number, km, rounded) in the existing payload.
   Handle the zero/no-journeys case → `0`.
3. Decide the window with the stakeholder if needed (all-time vs this month). Default all-time;
   note the choice. If a per-window value needs a param, document it.
4. Integration test: a manager with N journeys of known distances gets the correct
   `fleet.totalDistanceKm`; a manager with none gets `0`. Add a `TESTING_GUIDE.md` row.

## Blocked-path note
If trip distance is NOT persisted anywhere (only derived on the fly for earnings), STOP and record
in `## Blocked`: the exact model/field that would need to store per-trip distance, so it can be a
follow-up. Do not fabricate a value.

## Out of scope
The web-admin KPI card (todo 013). Historical backfill of distance for old trips (note if needed).

## Completion test
`backend` — `npm run test:integration` (jest) green including the new distance test; grep proves
`getManagerDashboard` returns a `totalDistanceKm` field; a new `docs/TESTING_GUIDE.md` row exists.
(Provide `todos/completion-tests/todo-018.sh` asserting the field name + test presence.)

## Blocked
