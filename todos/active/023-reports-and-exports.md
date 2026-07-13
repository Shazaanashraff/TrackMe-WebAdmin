# TODO 023 — Reports & exports (per-vehicle distance / time / speed)

**Phase:** 5 · **Priority:** P2 · **Depends on:** 001, 017
**Cite:** stakeholder review, backend `models/DriverEarnings.js` (`totalDistance`, `journeyDate`,
start/end times), `models/LiveLocation.js` (`speed`, `timestamp`)

## Why
The transport organisation needs operational reports. Phase 1 (this version): **per-vehicle
distance, active time, and speed** for a chosen day/range, viewable and **exportable (CSV, and PDF
if easy)**. Phase 2 (after QR): per-student attendance reports — out of scope here, noted below.

## What already exists (verified)
- `DriverEarnings`: `busId`, `tripId`, `journeyDate`, start/end times, `totalDistance`. → distance +
  duration per trip/day.
- `LiveLocation`: `busId`, `speed`, `timestamp`. → average/max speed.

## Step-by-step (backend — coordinate)
1. Add a manager reports endpoint: given a date/range, return per-vehicle rows: distance (sum of
   `DriverEarnings.totalDistance`), active time (from journey start/end), avg + max speed (from
   `LiveLocation`), trips count. Scope to the manager's buses. Handle empty → empty array.
2. Integration test (known trips → known aggregates) + TESTING_GUIDE row.

## Step-by-step (web-admin)
3. New **Reports** page + nav item: a date/range picker (MUI X Date pickers) + a `DataGrid` of
   per-vehicle metrics. Distances/speeds formatted (km, km/h); any currency via `formatLKR` (017).
4. **Export CSV** — use `@mui/x-data-grid` built-in CSV export toolbar (`GridToolbar`), or generate
   from the fetched rows. **PDF** optional (jsPDF/print stylesheet) — nice-to-have, not required.
5. Loading/empty states (todo 015). Tests: page renders rows from a mocked endpoint; export control
   present.

## Step-by-step (future — after QR, DO NOT build now)
6. Per-student attendance report (attendance %, trips, distance) + a manager overview ranking
   students by attendance — depends on the QR attendance data model. Tracked with the QR feature.

## Design references
- DataGrid export/toolbar: https://mui.com/x/react-data-grid/export/
- Date range picker: https://mui.com/x/react-date-pickers/date-range-picker/ (MUI X)
- Report/analytics table blocks: https://ui.shadcn.com/blocks , Tremor https://www.tremor.so/blocks .

## Out of scope
Student-level analytics (needs QR). Scheduled/emailed reports (note as follow-up).

## Completion test
`todos/completion-tests/todo-023.sh` — a Reports page + nav item exist; page uses a date picker + a
`DataGrid` fed from an `adminApi` reports method; an export (CSV) control is present; no `₹`;
lint + test green. (Backend aggregate test in the backend suite.)

## Blocked
