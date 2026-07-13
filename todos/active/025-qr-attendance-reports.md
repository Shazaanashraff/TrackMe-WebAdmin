# TODO 025 — QR attendance: manager reports + boarding audit

**Phase:** 5 · **Priority:** P3 · **Depends on:** 023
**Cross-repo dependency:** requires **backend `001-qr-attendance-foundation`** to be live (attendance
aggregation + BoardingEvents). **Blocked until that ships.**
**Cite:** ../../docs/features/qr-attendance/QR_ATTENDANCE_PLAN.md (READ FULLY FIRST)

## Why
The manager-visible half of QR attendance: per-student attendance analytics, a class/route ranking of
attendance, and a boarding audit trail for disputes. This completes the "student analytics" follow-up
deferred from web-admin todo 023.

## Libraries
None new — reuse `@mui/x-data-grid` (+ CSV export toolbar) and the MUI X date pickers introduced in
todo 023, and the LKR helper (017) if any cost columns appear.

## Step-by-step
1. New **Attendance** section/page (or a tab on Reports from todo 023) + nav item.
2. Wire to backend `GET /api/manager/attendance?from&to[&routeId]` via a new `adminApi.*` method
   (HTTP only in `api.js`): a `DataGrid` of per-student rollup (attendance %, trips, last seen,
   distance if provided) with a date-range + route filter, sortable to produce the **ranking** (most/
   least attendant). CSV export.
3. **Boarding audit:** a drill-in (per student or per route) listing raw `BoardingEvent`s (BOARD/
   ALIGHT, bus, time) from `GET /api/attendance/student/:id` — for oversight/disputes.
4. Honest empty/loading states (todo 015). No fabricated data — if attendance is empty, say so.
5. Tests: reports + audit render from a mocked endpoint; ranking sort works; export control present.

## Design references
- DataGrid sort/filter/export: https://mui.com/x/react-data-grid/export/
- Attendance/analytics table blocks: shadcn https://ui.shadcn.com/blocks , Tremor https://www.tremor.so/blocks .

## Out of scope
The parent-facing attendance view (user-app 090). Backend aggregation (backend 001).

## Completion test
`todos/completion-tests/todo-025.sh` — an Attendance/reports view references an `adminApi` attendance
method; a boarding-audit list exists; empty state present; lint + test green.

## Blocked
Until backend `001-qr-attendance-foundation` lands (attendance endpoints). No frontend-only mocking of
real attendance data in shipped code.
