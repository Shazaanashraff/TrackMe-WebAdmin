# Web Admin Integration Test Plan

Integration tests are owned by the backend service.
All CRUD and websocket integration coverage lives under backend/docs/TEST_PLAN_INTEGRATION.md.

Use this file as a pointer so QA can find the canonical backend integration plan.

## Web Admin CRUD Scope

The web admin app should validate the following backend-owned flows from the browser UI and API contract point of view:
- Routes: list, read, create, update, toggle active, delete
- Super admin: dashboard, operations, bus requests, audit logs
- Managers: create, list, detail, update, status toggle, reset password, assign buses
- Buses: admin bus update, maintenance toggle, delete
- Manager views: dashboard, buses, bus detail, bus account request, delete request, location history

## How To Test CRUD

For each flow, the test must verify:
- Success path with authenticated admin/manager session.
- Invalid form payloads, missing fields, and wrong types.
- Unauthorized access when no token is present.
- Forbidden access when the role is wrong.
- Not found for invalid resource ids.
- Conflict when the resource already exists or a dependency blocks the action.
- Error response includes `code`, `message`, and any useful `details`.

## Edge-Case Checklist

- Routes: duplicate route name, empty stops list, invalid status toggle, delete with dependent data.
- Managers: duplicate email, invalid role assignment, reset password on inactive manager, assign buses with invalid ids.
- Buses: delete active bus with dependent bookings, invalid maintenance payload, stale update.
- Bus requests: invalid review payload, duplicate decision, unauthorized audit access.
- Location history: empty window, invalid time range, no records found.

## Canonical References

- Backend CRUD and websocket matrix: backend/docs/TEST_PLAN_INTEGRATION.md
- Error and edge-case guide: backend/docs/project/TEST_EDGE_CASES.md
