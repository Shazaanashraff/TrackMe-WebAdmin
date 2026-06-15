# Web-Admin Unit Testing Strategy

## Purpose
This document is the unit testing strategy for the `web-admin` application only. It is written as a practical handoff for developers and QA, with enough detail for an intern to follow and enough rigor for a senior engineer to trust.

The recommended test stack is **Vitest + React Testing Library**.

This strategy assumes the helper refactor described in [WEB_ADMIN_HELPER_REFACTOR_PLAN.md](WEB_ADMIN_HELPER_REFACTOR_PLAN.md) is the target shape of the codebase. In other words, the cleanest unit test surface is the one where validation, payload creation, response shaping, and auth utilities live in small helper modules instead of being embedded inside page components.

## Testing Goal

The goal is to prove that the web-admin logic works correctly in isolation, without needing a live backend, real sockets, or full browser end-to-end flows.

Unit tests should answer these questions:

- Does the helper return the right output for a given input?
- Does the page submit the correct payload when the user clicks save?
- Does the API client attach the right headers and parse errors correctly?
- Does the UI show the right validation message or state when data is missing or invalid?
- Do the derived values shown in tables, cards, and charts match the backend data?

## Recommended Scope

### In Scope

- Pure helper functions.
- API client request behavior.
- Auth normalization and local storage handling.
- Query-string building.
- Validation rules.
- Payload builders.
- View-model transformations.
- Small React component behavior tested with React Testing Library and mocks.

### Out of Scope

- Live backend integration.
- Socket.IO real network behavior.
- Map rendering correctness beyond what is needed to test the component's logic.
- Full navigation and multi-page end-to-end flows.
- Database behavior.

## Recommended Tooling Standard

Use the following baseline:

- `vitest` for running tests.
- `@testing-library/react` for component tests.
- `@testing-library/user-event` for realistic user interactions.
- `@testing-library/jest-dom` for readable DOM assertions.

Recommended supporting mocks:

- Mock `fetch` for API client tests.
- Mock `localStorage` for auth and session tests.
- Mock `react-router-dom` only where navigation behavior must be asserted.
- Mock `socket.io-client` for tracking-page logic tests.
- Mock `window.prompt` when testing delete/review flows.

## Testing Philosophy

### 1. Test Behavior, Not Implementation Details
Write tests against outcomes. For example, test that a manager form produces the right payload, not that a specific state variable was set in a certain order.

### 2. Prefer Small, Focused Tests
Each test should verify one behavior. If a test needs too much setup, the helper or component is probably doing too much.

### 3. Keep Pure Logic Pure
Validation, normalization, and transformation should be tested as plain functions. These tests should not render React unless the page itself owns important UI behavior.

### 4. Use Component Tests Only Where the UI Matters
React Testing Library should cover form submission, validation messages, dialog state, selection state, and visible derived output.

### 5. Test Edge Cases as First-Class Cases
The web-admin surfaces include auth, forms, coordinate parsing, query parameters, and live tracking history. These are all areas where small edge cases cause real user-facing bugs.

## Test Architecture by Layer

### Layer 1: Shared API and Auth Helpers

These are the foundation. If these are wrong, every page that depends on them is at risk.

Files expected after refactor:

- `web-admin/src/helpers/auth/authStorage.js`
- `web-admin/src/helpers/auth/authNormalization.js`
- `web-admin/src/helpers/api/request.js`
- `web-admin/src/helpers/api/queryString.js`
- `web-admin/src/helpers/api/errorMessages.js`

What to test:

- Reading cached auth safely.
- Writing and removing cached auth.
- Normalizing `token` and `accessToken` into one auth shape.
- Attaching the authorization header only when a token exists.
- Returning the correct error message when the backend sends field errors.
- Triggering unauthorized cleanup on `401` and `403` responses.
- Building query strings with filters and pagination.

Why this matters:

- These helpers are shared by multiple pages and the login shell.
- If auth or request handling is wrong, many other tests can fail for the wrong reason.

### Layer 2: Domain Helpers

These are the pure functions that represent the business logic of the web-admin app.

Expected domains:

- Managers.
- Routes.
- Buses.
- Tracking.
- Operations.
- Dashboard.

What to test:

- Validation rules.
- Normalized payloads.
- Display view-models.
- Numeric conversions.
- List ordering and transformation.
- Derived summary values.

Why this matters:

- This is the highest-value unit test surface because it catches logic regressions without rendering the UI.

### Layer 3: RTL Component Tests

Use React Testing Library for the pages that still contain important UI behavior after the helpers are extracted.

What to test:

- Form submission calls the right helper or API method.
- Validation messages appear when users submit bad data.
- Buttons, dialogs, and steppers open and close correctly.
- Lists and summary cards render the right derived data.
- Loading and error states are visible.
- Filters and selection controls update the displayed output.

Why this matters:

- A component test should prove the wiring between UI and helper logic is correct.
- It should not repeat every pure helper assertion, or the test suite becomes slow and noisy.

## Test Coverage Plan by Area

## 1. API Client Tests

Target file:

- `web-admin/src/api.js`

Primary goals:

- Verify request behavior.
- Verify auth behavior.
- Verify response error handling.
- Verify query-string handling.

Test cases:

- `request()` sends `Content-Type: application/json`.
- `request()` adds `Authorization: Bearer <token>` when cached auth is present.
- `request()` omits the auth header when no token exists.
- `request()` uses `token` first and falls back to `accessToken`.
- `request()` parses JSON responses correctly.
- `request()` throws the first field-level error when `response.errors` is present.
- `request()` falls back to `response.message` when field errors are missing.
- `request()` falls back to `Request failed` when no useful message exists.
- `handleUnauthorized()` clears cached auth when message indicates unauthorized access.
- `handleUnauthorized()` redirects to `/login` only when not already on the login page.
- `handleUnauthorized()` does nothing for unrelated error messages.
- `login()` normalizes the returned auth object into a consistent token shape.
- `getSystemRoutes()`, `getManagers()`, `getPendingBusRequests()`, and `getAuditLogs()` build correct query strings.
- `getManagerBusLocation(busId, minutes = 15)` uses `15` when minutes is omitted.
- `getManagerBusLocation()` uses the provided minutes when present.

Edge cases to include:

- Cached auth string is invalid JSON.
- Cached auth exists but has no usable token.
- Response body has `errors` as an empty array.
- Response body has `errors` items with `message`, `msg`, or both missing.
- Response status is `401` or `403` with a non-auth message.
- Query params contain empty strings, `null`, or `undefined` values.
- Query params contain spaces or special characters that need encoding.

## 2. Auth Helper Tests

Target files:

- `web-admin/src/helpers/auth/authStorage.js`
- `web-admin/src/helpers/auth/authNormalization.js`

Primary goals:

- Ensure login/session data is stored and read consistently.
- Ensure role checks are explicit and stable.

Test cases:

- Normalize auth when only `token` exists.
- Normalize auth when only `accessToken` exists.
- Normalize auth when both exist and `token` should win.
- Return `null` or empty auth safely when response is missing.
- Accept only allowed roles for web-admin access.
- Read cached auth when localStorage contains valid JSON.
- Return `null` when localStorage contains invalid JSON.
- Remove auth from storage without throwing.

Edge cases to include:

- Auth object exists but `user` is missing.
- Role is unexpected, blank, or lowercase when the app expects a specific role value.
- Stored auth is present but token is an empty string.

## 3. Manager Logic Tests

Target files:

- `web-admin/src/helpers/managers/managerValidation.js`
- `web-admin/src/helpers/managers/managerPayloads.js`

Current page source:

- [ManagersPage.jsx](../../web-admin/src/pages/ManagersPage.jsx)

Primary goals:

- Validate manager form input.
- Build payloads for create, update, password reset, and status toggle.

Test cases:

- Name is required.
- Email is required.
- Email must match a valid email format.
- Password is required for new manager creation.
- Password is optional during edit but must still meet minimum length if present.
- Password length must be at least 8 characters.
- Empty strings and whitespace-only strings should fail validation.
- Create payload contains name, email, and password only.
- Update payload contains editable fields only and excludes password unless reset is intended.
- Reset-password payload contains only the password field.
- Status payload flips the active state correctly.

Edge cases to include:

- Email with leading or trailing spaces.
- Manager ID exists but password is blank.
- Password contains spaces but is still valid by length policy.
- Existing inactive manager is edited without changing status.

Component test ideas with RTL:

- Open create dialog, fill the form, and confirm the create API call is built correctly.
- Open edit dialog, change fields, and confirm the update call uses the right payload.
- Submit with invalid email and verify the visible validation message.
- Submit without a password for a new manager and verify submission is blocked.
- Toggle active/inactive status and verify the API is called with the expected value.

## 4. Route Logic Tests

Target files:

- `web-admin/src/helpers/routes/routeStops.js`
- `web-admin/src/helpers/routes/routeValidation.js`
- `web-admin/src/helpers/routes/routePayloads.js`

Current page source:

- [RoutesPage.jsx](../../web-admin/src/pages/RoutesPage.jsx)

Primary goals:

- Validate route data.
- Normalize stops into backend-ready objects.
- Preserve stop ordering.

Test cases:

- Add stop appends a blank stop object.
- Update stop changes only the targeted stop field.
- Remove stop deletes the targeted stop index.
- Move stop up swaps the correct entries.
- Move stop down swaps the correct entries.
- Move stop at the first or last index is a no-op.
- Stop validation rejects missing stop name.
- Stop validation rejects missing latitude or longitude.
- Stop validation rejects invalid numeric coordinates.
- Normalized stops are trimmed and re-numbered starting at 1.
- Empty stop rows are ignored rather than submitted.
- Route payload converts `distance` and `fare` into numbers.
- Route payload includes `stopsCount` based on normalized stops.

Edge cases to include:

- A route with no stops at all.
- Stops where only one of name, latitude, or longitude is filled.
- Duplicate stop names.
- Coordinates are strings that parse to numbers with decimals.
- Coordinates are `0`, which is a valid number and must not be treated as missing.
- Distance or fare are `0` or negative.

Component test ideas with RTL:

- Add two stops, reorder them, and ensure the visible order changes.
- Enter invalid stop data and verify the warning is shown on submit.
- Submit a valid route and verify the API receives the normalized payload.

## 5. Bus Request and Bus Edit Logic Tests

Target files:

- `web-admin/src/helpers/buses/busRequestValidation.js`
- `web-admin/src/helpers/buses/busPayloads.js`
- `web-admin/src/helpers/buses/busViewModel.js`

Current page sources:

- [ManagerBusesPage.jsx](../../web-admin/src/pages/ManagerBusesPage.jsx)
- [ManagerAccountsPage.jsx](../../web-admin/src/pages/ManagerAccountsPage.jsx)

Primary goals:

- Validate the multi-step bus account request flow.
- Normalize bus edit forms and payloads.
- Protect seat and driver data quality.

Test cases:

- Step 0 requires bus ID, bus name, number plate, and route ID.
- Step 0 rejects invalid or non-positive seat capacity.
- Step 1 requires an initial password.
- Step 1 rejects invalid driver email format.
- Step 1 allows empty optional driver fields when the form design permits them.
- Edit form maps bus entity fields into the edit form shape correctly.
- Create bus request payload converts seat capacity to a number.
- Edit bus payload converts seat capacity to a number and preserves boolean fields.
- Delete request payload carries the optional reason safely.
- Password reset payload includes only the new password.

Edge cases to include:

- Seat capacity as a numeric string with leading zeros.
- Seat capacity as empty string, `0`, `NaN`, or negative number.
- Driver email with whitespace.
- Bus type and service type default values when the form is partially filled.
- Boolean fields should remain booleans, not strings.

Component test ideas with RTL:

- Step through the bus request wizard and confirm validation at each step.
- Submit a valid request and verify the correct payload is sent.
- Open the edit dialog and verify the bus fields are prefilled from the selected row.
- Trigger reset password behavior and verify only the password field is submitted.

## 6. Tracking Logic Tests

Target files:

- `web-admin/src/helpers/tracking/trackingTransforms.js`
- `web-admin/src/helpers/tracking/trackingWindow.js`
- `web-admin/src/helpers/tracking/trackingSocket.js`

Current page source:

- [ManagerTrackingPage.jsx](../../web-admin/src/pages/ManagerTrackingPage.jsx)

Primary goals:

- Verify coordinate parsing.
- Verify rolling history window logic.
- Verify the live snapshot model.

Test cases:

- `toLatLng()` returns `[lat, lng]` for valid numeric values.
- `toLatLng()` returns `null` for missing, invalid, or non-finite numbers.
- `mapHistoryToPathPoints()` filters out invalid points.
- `trimHistoryWindow()` keeps only points inside the requested time window.
- `buildTrackingSnapshot()` merges live updates into prior state correctly.
- Live history should keep the previous route ID when the payload does not include one.
- Latest point and history are both updated when a new bus message arrives.

Edge cases to include:

- History array is empty.
- Timestamp values are invalid strings.
- Window minutes are `0`, negative, or unusually large.
- Payload includes partial data.
- Route ID is missing from the live payload but exists in previous state.

Component test ideas with RTL:

- Render the page with mocked data and verify the selected bus and history counts.
- Verify the page shows the latest status labels when location data changes.
- For socket wiring, prefer a small integration-style component test with the socket client mocked rather than testing the socket library itself.

## 7. Operations Logic Tests

Target files:

- `web-admin/src/helpers/operations/operationsFilters.js`
- `web-admin/src/helpers/operations/operationsReview.js`
- `web-admin/src/helpers/operations/operationsViewModel.js`

Current page source:

- [OperationsPage.jsx](../../web-admin/src/pages/OperationsPage.jsx)

Primary goals:

- Keep filter assembly deterministic.
- Keep review payloads consistent.
- Keep summary cards and preview data stable.

Test cases:

- Pending request filters include only supported values.
- Audit filters include manager, action, date range, and limit when provided.
- Empty filter fields are omitted rather than serialized as useless query parameters.
- Review payload includes decision and note.
- Edit bus payload includes the right business fields.
- Summary cards count managers, active managers, pending requests, and audit records accurately.
- Manager filter options are derived from overview rows correctly.
- Request preview groups the right fields for display.
- Bus display rows preserve key status and metric information.

Edge cases to include:

- `ALL` filter values should not break the query builder.
- Date range filters with only one boundary.
- Empty note on approve/reject flows.
- Missing manager names or emails in overview rows.
- Null or partial detail objects.

Component test ideas with RTL:

- Change request filters and verify the data-loading call is made with the right filter object.
- Open the request preview and verify the dialog contents are correct.
- Approve and reject requests with a mocked prompt and verify the correct payload is sent.
- Edit a bus from the operations panel and verify the update call uses the transformed form data.

## 8. Dashboard Logic Tests

Target files:

- `web-admin/src/helpers/dashboard/dashboardMetrics.js`
- `web-admin/src/helpers/dashboard/dashboardCharts.js`
- `web-admin/src/helpers/dashboard/dashboardViewModel.js`

Current page source:

- [DashboardPage.jsx](../../web-admin/src/pages/DashboardPage.jsx)

Primary goals:

- Normalize metrics safely.
- Generate predictable chart data.
- Shape summary cards and overview items.

Test cases:

- Dashboard metrics normalize missing nested fields to safe defaults.
- Total manager, active bus, booking, and rating counts are extracted correctly.
- Fleet activity series is generated from active bus counts.
- Booking trend series is generated from confirmed booking counts.
- Rating trend series handles average rating values and fallback values.
- Orders overview uses the correct metric values and labels.
- Operations snapshot handles empty arrays cleanly.

Edge cases to include:

- Metrics response is `null`, `undefined`, or missing nested objects.
- Count values are `0` and must not fall back to defaults incorrectly.
- Rating is missing, `0`, or a decimal.
- Operations array is empty.

Component test ideas with RTL:

- Render the dashboard in a loading state and confirm skeletons appear.
- Render with mocked metrics and verify the summary cards show the right values.
- Verify the error alert appears when the API request fails.

## 9. Login and App Shell Tests

Target file:

- `web-admin/src/App.jsx`

Primary goals:

- Ensure login flow rejects unsupported roles.
- Ensure cached auth is loaded safely.
- Ensure logout clears auth and shows the right toast.

Test cases:

- Login success stores normalized auth in localStorage.
- Login success redirects super-admin users to the dashboard.
- Login success redirects manager users to manager dashboard.
- Login rejects roles outside the allowed list.
- Existing auth in localStorage restores app session state.
- Corrupted localStorage auth does not crash the app.
- Logout clears cached auth and resets state.
- Refresh trigger increments refresh signal and shows the toast.

Edge cases to include:

- Auth object exists but has no user role.
- Auth object has a role but no token.
- LocalStorage contains malformed JSON.

Component test ideas with RTL:

- Mock the login page, submit credentials, and verify the app navigates correctly.
- Trigger logout and verify storage cleanup.
- Verify the protected shell blocks invalid or missing roles.

## Recommended Test File Structure

Use a co-located or feature-grouped test structure. Either of these is acceptable:

### Option A: Co-located tests

```text
web-admin/src/helpers/managers/managerValidation.test.js
web-admin/src/pages/ManagersPage.test.jsx
```

### Option B: Dedicated test folder

```text
web-admin/src/__tests__/helpers/managers/managerValidation.test.js
web-admin/src/__tests__/pages/ManagersPage.test.jsx
```

Recommendation:

- Use whichever pattern the team can keep consistent.
- Do not mix patterns randomly.
- Keep pure helper tests near the helper source when possible.

## Mocking Strategy

### `fetch`

Mock `fetch` directly in API tests.

Test both:

- Successful JSON responses.
- Rejected or non-OK responses.

### `localStorage`

Use a predictable localStorage mock.

Test both:

- Valid stored auth.
- Invalid JSON and missing values.

### `window.location`

Spy on navigation side effects when testing unauthorized handling.

### `socket.io-client`

Mock the socket client and assert only the events your page wires up.

### `window.prompt`

Stub prompt responses in delete/review tests so the behavior is deterministic.

## Suggested Edge Case Checklist

These are the kinds of cases that often slip through unless they are explicitly planned:

- Empty string versus `null` versus `undefined`.
- Whitespace-only strings.
- `0` versus missing numeric values.
- Decimal numbers supplied as strings.
- Boolean flags stored as strings instead of booleans.
- Invalid JSON in storage.
- Partial backend responses.
- Arrays with one item, many items, and no items.
- Filtering and pagination objects with unsupported keys.
- Error responses with `message`, `msg`, and `errors` combinations.
- Time-based logic around history trimming and polling.

## Coverage Priority Order

If the team is implementing these tests in phases, this is the best order:

1. API client and auth helpers.
2. Managers validation and payload helpers.
3. Routes validation and stop helpers.
4. Bus request and edit helpers.
5. Tracking transforms.
6. Operations filters and view-model helpers.
7. Dashboard metrics and chart helpers.
8. RTL tests for the pages that still have important UI behavior after extraction.

This order gives the fastest risk reduction because it tests the widest shared logic first.

## What "Good" Looks Like

A strong test suite for this area should have these properties:

- You can read the test and understand the business rule without reading the component internals.
- Every helper has direct unit coverage for success and failure cases.
- Page tests only prove the UI wiring, not the entire business rule set again.
- Failures point clearly to one behavior, not a giant component blob.
- Refactors are safe because the tests anchor the contract, not the implementation detail.

## Suggestions To Make This Perfect

If the goal is the best possible testing scenario, these are the improvements I would prioritize:

1. Extract helpers before writing most tests. Pure helpers are cheaper to test and easier to trust.
2. Define a single mock factory for auth, managers, routes, buses, and dashboard fixtures. Reuse it everywhere.
3. Standardize assertion patterns so the team does not write five different styles for the same behavior.
4. Keep validation messages stable and human-readable. Test exact messages where the message is part of the user contract.
5. Add a small number of page tests for each screen, but keep the majority of logic coverage in helper tests.
6. Make edge cases explicit in the test names. The test file should read like a QA checklist.
7. Use one source of truth for sample entities like manager, route, bus, request, and audit log records.
8. Treat time-based code carefully by freezing time in tests where history windows or polling windows matter.
9. Mock the network at the lowest useful layer. For helper tests, do not render components just to reach API behavior.
10. Separate success-path tests from failure-path tests so failures are easier to diagnose.

## Final Recommendation

For this codebase, the best unit testing strategy is:

- Use **Vitest** for the test runner.
- Use **React Testing Library** for the page-level interaction tests that remain after helper extraction.
- Push as much logic as possible into pure helpers.
- Test helpers directly first.
- Use RTL only where the UI state or wiring is part of the contract.

That combination gives the cleanest balance of speed, clarity, and long-term maintainability for `web-admin`.
