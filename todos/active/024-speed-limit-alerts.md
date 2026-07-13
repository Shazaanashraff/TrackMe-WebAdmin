# TODO 024 — Speed-limit alerts (notify manager on overspeed)

**Phase:** 5 · **Priority:** P3 · **Depends on:** 003
**Cite:** stakeholder review, backend `models/LiveLocation.js` (`speed`), the driver location
socket pipeline, `models/Bus.js`

## Why
Safety for school/university shuttles: when a bus exceeds a speed threshold, the manager should be
notified. The location stream already carries `speed`.

## Step-by-step (backend — coordinate)
1. Decide the threshold model: a global default + optional per-bus/per-route override
   (`speedLimitKmh` on `Bus` or config). Confirm value(s) with the stakeholder.
2. In the location-ingestion path (socket handler that stores `LiveLocation`), when `speed` exceeds
   the threshold, raise an **overspeed event**: persist an alert (bus, driver, speed, location,
   timestamp) and notify the manager (reuse notification/socket pattern). Debounce so one sustained
   overspeed doesn't spam (e.g. one alert per bus per N minutes).
3. Integration test: an over-threshold location creates one alert + notifies; under-threshold does
   not; debounce holds.

## Step-by-step (web-admin)
4. Surface alerts: a manager **Alerts** view (or a section on the Live Service Board / dashboard)
   listing recent overspeed events (bus, speed, time, map link). Real data only; empty state when
   none.
5. Optional: a badge on the notification bell (todo 003) when unacknowledged alerts exist;
   acknowledge/dismiss action.
6. Tests: alert list renders from a mocked endpoint; acknowledge updates state.

## Design references
- Alert list / toast: shadcn `Sonner` https://ui.shadcn.com/docs/components/sonner ; MUI `Snackbar`
  for transient, a list/`DataGrid` for history.
- Debounce/threshold logic lives in the backend, not the UI.

## Out of scope
Geofencing / route-deviation alerts (separate; route-change requests already exist for off-route).

## Completion test
`todos/completion-tests/todo-024.sh` — a web-admin alerts view lists overspeed events from an
`adminApi` method; empty state present; lint + test green. (Backend threshold + debounce tests in
the backend suite.)

## Blocked
Confirm the speed threshold value(s) and whether it's global or per-bus/route before building.
