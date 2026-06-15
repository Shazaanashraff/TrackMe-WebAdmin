# Web-Admin Helper Refactor Plan

## Purpose
This document is a handoff plan for extracting page-local logic from `web-admin` into reusable helper modules. The goal is to make the admin UI easier to test, easier to reason about, and less dependent on inline validation and payload shaping inside React components.

This plan is limited to the `web-admin` application and focuses on the logic currently embedded in pages and the API client.

## What Should Move Out of Pages

The current pages contain three kinds of logic that should be extracted:

1. Validation logic.
2. Payload normalization and request shaping.
3. Response-to-view-model transformation.

The main extraction targets are:

- [web-admin/src/api.js](../../web-admin/src/api.js)
- [web-admin/src/pages/ManagersPage.jsx](../../web-admin/src/pages/ManagersPage.jsx)
- [web-admin/src/pages/RoutesPage.jsx](../../web-admin/src/pages/RoutesPage.jsx)
- [web-admin/src/pages/ManagerBusesPage.jsx](../../web-admin/src/pages/ManagerBusesPage.jsx)
- [web-admin/src/pages/ManagerTrackingPage.jsx](../../web-admin/src/pages/ManagerTrackingPage.jsx)
- [web-admin/src/pages/OperationsPage.jsx](../../web-admin/src/pages/OperationsPage.jsx)
- [web-admin/src/pages/DashboardPage.jsx](../../web-admin/src/pages/DashboardPage.jsx)
- [web-admin/src/App.jsx](../../web-admin/src/App.jsx)

## Recommended Helper Folder Structure

Create a dedicated helper tree under `web-admin/src/helpers/` and keep the current `web-admin/src/lib/utils.js` for generic non-domain utilities only.

Proposed layout:

```text
web-admin/src/helpers/
  auth/
    authStorage.js
    authNormalization.js
    authGuards.js
  api/
    request.js
    queryString.js
    errorMessages.js
  managers/
    managerValidation.js
    managerPayloads.js
    managerViewModel.js
  routes/
    routeValidation.js
    routePayloads.js
    routeStops.js
  buses/
    busRequestValidation.js
    busPayloads.js
    busViewModel.js
  tracking/
    trackingTransforms.js
    trackingWindow.js
    trackingSocket.js
  operations/
    operationsFilters.js
    operationsReview.js
    operationsViewModel.js
  dashboard/
    dashboardMetrics.js
    dashboardCharts.js
    dashboardViewModel.js
  shared/
    email.js
    numbers.js
    location.js
    labels.js
```

This structure keeps helpers grouped by behavior instead of creating one large utility bucket.

## Helper Design Rules

The developer should follow these rules when extracting logic:

- Keep helpers pure whenever possible.
- Helpers should not read or write React state.
- Helpers should not call `setState`, `navigate`, `window.prompt`, or `window.alert` directly.
- Helpers should return data, validation errors, or payload objects.
- Side effects like API calls, routing, localStorage writes, and socket connection management should stay in thin wrappers.
- Validation helpers should return structured errors, not UI strings scattered through components.
- Normalizers should convert form state into backend payloads in one place.
- View-model helpers should shape backend responses into display-ready data for tables, cards, and charts.

## Shared Logic Already Present

There are a few behaviors already duplicated across the app that should be centralized first:

- Auth token normalization from `token` and `accessToken`.
- Local storage access for `admin-auth`.
- Query-string generation for list endpoints.
- Error extraction from API responses.
- Latitude/longitude parsing for tracking data.

These should be extracted before page-specific helpers so the later refactor stays consistent.

## Page-by-Page Extraction Plan

### 1. API Client

Current behavior in [web-admin/src/api.js](../../web-admin/src/api.js):

- `request()` handles fetch, auth header injection, and response errors.
- `handleUnauthorized()` clears cached auth and redirects to login.
- `login()` normalizes `token` and `accessToken`.
- `getSystemRoutes()`, `getManagers()`, `getPendingBusRequests()`, and `getAuditLogs()` build query strings inline.
- `getManagerBusLocation(busId, minutes = 15)` embeds default parameter handling.

Recommended helpers:

- `helpers/auth/authStorage.js`
  - `getCachedAdminAuth()`
  - `setCachedAdminAuth(auth)`
  - `clearCachedAdminAuth()`
  - `getAuthToken(auth)`
- `helpers/api/request.js`
  - `requestJson(path, options)`
  - handles base URL, headers, JSON parsing, and unauthorized flow.
- `helpers/api/queryString.js`
  - `buildQueryString(params)`
  - omits empty values and preserves expected encoding rules.
- `helpers/api/errorMessages.js`
  - `extractApiErrorMessage(responseData)`
  - prefers field-level messages from `response.errors`.

Suggested outcome:

- `api.js` becomes a thin endpoint map around the shared request helper.
- Login normalization is shared by both `api.js` and `App.jsx`.

### 2. Managers Page

Current inline logic in [ManagersPage.jsx](../../web-admin/src/pages/ManagersPage.jsx):

- Email validation.
- Password rules for create versus update.
- Form validation state.
- Payload creation for create/update/reset password.
- Active/inactive toggle payload.

Recommended helpers:

- `helpers/managers/managerValidation.js`
  - `validateManagerForm(form)`
  - `validateEmail(email)`
  - `validatePassword(password, { isNewManager })`
- `helpers/managers/managerPayloads.js`
  - `buildCreateManagerPayload(form)`
  - `buildUpdateManagerPayload(form)`
  - `buildResetManagerPasswordPayload(form)`
  - `buildManagerStatusPayload(row)`

Suggested outcome:

- The page only owns dialog open/close state and submits the helper-produced payload.
- Validation messages become reusable and unit-testable.

### 3. Routes Page

Current inline logic in [RoutesPage.jsx](../../web-admin/src/pages/RoutesPage.jsx):

- Stop list add/remove/reorder behavior.
- Stop validation.
- Coordinate shaping.
- Route payload normalization.

Recommended helpers:

- `helpers/routes/routeStops.js`
  - `addStop(stops)`
  - `updateStop(stops, index, key, value)`
  - `removeStop(stops, index)`
  - `moveStop(stops, index, direction)`
  - `normalizeRouteStops(stops)`
- `helpers/routes/routeValidation.js`
  - `validateRouteStops(stops)`
  - `validateRouteCoordinates(stops)`
- `helpers/routes/routePayloads.js`
  - `buildCreateRoutePayload(form)`

Suggested outcome:

- The page becomes a form shell with helper-driven stop manipulation.
- Validation and payload generation can be tested without rendering the page.

### 4. Manager Buses Page

Current inline logic in [ManagerBusesPage.jsx](../../web-admin/src/pages/ManagerBusesPage.jsx):

- Multi-step create request validation.
- Driver email validation.
- Seat count validation.
- Final request payload normalization.
- Edit form mapping from bus entity to editable form.
- Edit payload normalization.

Recommended helpers:

- `helpers/buses/busRequestValidation.js`
  - `validateBusRequestStep(form, step)`
  - `validateDriverDetails(form)`
  - `validateSeatCapacity(seatCapacity)`
- `helpers/buses/busPayloads.js`
  - `buildCreateBusAccountRequestPayload(form)`
  - `buildEditBusPayload(editForm)`
  - `buildDeleteBusRequestPayload(reason)`
- `helpers/buses/busViewModel.js`
  - `mapBusToEditForm(bus)`
  - `summarizeBusFleet(buses)`

Suggested outcome:

- Step validation becomes reusable and easier to extend if the wizard grows.
- The edit dialog stops duplicating field mapping logic.

### 5. Manager Tracking Page

Current inline logic in [ManagerTrackingPage.jsx](../../web-admin/src/pages/ManagerTrackingPage.jsx):

- Token parsing from cached auth.
- `toLatLng()` coordinate parsing.
- Live history trimming by window size.
- Path point derivation.
- Marker and latest-point shaping.
- Socket join/leave lifecycle behavior.

Recommended helpers:

- `helpers/tracking/trackingTransforms.js`
  - `toLatLng(point)`
  - `mapHistoryToPathPoints(history)`
  - `buildTrackingSnapshot(prev, payload, windowMinutes)`
- `helpers/tracking/trackingWindow.js`
  - `trimHistoryWindow(history, windowMinutes)`
- `helpers/auth/authStorage.js`
  - reuse token retrieval instead of re-parsing localStorage in the page.
- `helpers/tracking/trackingSocket.js`
  - `createTrackingSocket({ baseUrl, token, busId, onUpdate })`

Suggested outcome:

- Coordinate and window logic become pure helpers.
- Socket connection setup stays thin and easier to maintain.

### 6. Operations Page

Current inline logic in [OperationsPage.jsx](../../web-admin/src/pages/OperationsPage.jsx):

- Request filter handling.
- Audit filter assembly.
- Review payload creation.
- Edit bus mapping.
- Summary-card calculation.
- Service-type and status label formatting.
- Request preview formatting.

Recommended helpers:

- `helpers/operations/operationsFilters.js`
  - `buildPendingRequestFilters(filters)`
  - `buildAuditLogFilters(filters)`
- `helpers/operations/operationsReview.js`
  - `buildBusReviewPayload(decision, note)`
  - `buildBusEditPayload(formData)`
- `helpers/operations/operationsViewModel.js`
  - `buildOperationsSummaryCards(overview, pendingRequests, auditLogs)`
  - `buildManagerFilterOptions(overview)`
  - `buildRequestPreview(request)`
  - `buildBusDisplayRows(managerDetail)`

Suggested outcome:

- Filtering logic and summary shaping become deterministic helpers.
- The page focuses on UI state and user actions only.

### 7. Dashboard Page

Current inline logic in [DashboardPage.jsx](../../web-admin/src/pages/DashboardPage.jsx):

- Metric normalization.
- Chart series derivation.
- Operations card shaping.
- Summary card shaping.
- Display fallback handling.

Recommended helpers:

- `helpers/dashboard/dashboardMetrics.js`
  - `normalizeDashboardMetrics(response)`
  - `getDashboardCounts(metricsData)`
- `helpers/dashboard/dashboardCharts.js`
  - `buildFleetActivitySeries(activeBuses)`
  - `buildBookingTrendSeries(confirmedBookings)`
  - `buildRatingTrendSeries(avgRating)`
- `helpers/dashboard/dashboardViewModel.js`
  - `buildOrdersOverview(metricsData, pendingRequests)`
  - `buildOperationsSnapshot(operations)`

Suggested outcome:

- Chart data becomes a reusable view-model layer rather than inline math.
- The page component becomes simpler and easier to review.

### 8. Login and App Shell

Current inline logic in [App.jsx](../../web-admin/src/App.jsx):

- Login response normalization.
- Cached auth parsing.
- Role checks.
- Auth persistence and cleanup.

Recommended helpers:

- `helpers/auth/authNormalization.js`
  - `normalizeAdminAuth(response)`
  - `isAllowedAdminRole(role)`
- `helpers/auth/authStorage.js`
  - `readAdminAuthFromStorage()`
  - `writeAdminAuthToStorage(auth)`
  - `removeAdminAuthFromStorage()`

Suggested outcome:

- Login behavior is shared between the shell and API client.
- Auth shape is normalized once, in one place.

## Prioritized Implementation Order

Use this order to minimize risk:

1. Extract shared auth and API helpers.
2. Extract manager validation and payload builders.
3. Extract route stop manipulation and route payload builders.
4. Extract bus request and bus edit helpers.
5. Extract tracking transforms and socket helpers.
6. Extract operations filters and view-model helpers.
7. Extract dashboard metric and chart helpers.

This order starts with the widest shared behavior and moves toward page-specific view models.

## Testing Plan for the Developer

Even if the web-admin app does not yet have a test runner wired up, the refactor should be written so these helpers can be unit tested as soon as one is added.

Test candidates by helper group:

- Auth helpers: token normalization, storage read/write, role allow-list.
- API helpers: auth header injection, query-string building, error extraction, unauthorized cleanup.
- Manager helpers: email/password validation, create/update payloads, status payload.
- Route helpers: stop filtering, stop ordering, coordinate conversion, route payload.
- Bus helpers: step validation, seat validation, edit-form mapping, request payload.
- Tracking helpers: `toLatLng()`, history trimming, path-point derivation.
- Operations helpers: filter builders, review payload, summary cards.
- Dashboard helpers: metrics normalization, chart series generation, card summaries.

## Acceptance Criteria

The refactor is complete when:

- Each extracted helper has a clear single responsibility.
- Page files contain only UI state, event handlers, and rendering.
- Shared auth and request logic is not duplicated across `api.js` and `App.jsx`.
- Route, bus, manager, operations, tracking, and dashboard transformations are all testable without rendering the UI.
- No page still contains large blocks of validation or payload-shaping logic that could live in a helper.

## Notes For The Developer

- Prefer pure functions and small modules over large generic utilities.
- Do not move UI rendering concerns into helpers.
- Do not create one monolithic `helpers.js` file.
- Keep naming domain-specific so later maintenance is obvious.
- If a helper starts being used by more than one page, move it into `shared/` or `auth/` rather than duplicating it.
- Keep `web-admin/src/lib/utils.js` for broad-purpose helpers only, such as class-name merging.

## Suggested Deliverable Structure

If this becomes an implementation task, the work should land as:

- New helper modules under `web-admin/src/helpers/`.
- Updated imports in the affected pages.
- Light cleanup in `web-admin/src/api.js` and `web-admin/src/App.jsx`.
- A short verification note listing which page behaviors were moved and which helpers were created.
