# Web Admin Testing Guide

## Auth and Session
| Item (fn / flow) | Test type | Test file | Cases covered | Update when |
|---|---|---|---|---|
| adminApi.login() | unit (fetch) | src/__tests__/api.test.js | token normalization, error parse | auth response changes |
| auth storage helpers | unit | src/helpers/auth/__tests__/authStorage.test.js | read/write/clear | storage keys change |
| App role gating | RTL | src/__tests__/App.test.jsx | redirect rules | role logic changes |
| ForgotPasswordVerifyPage (recovery code) | RTL (Vitest) | src/pages/__tests__/ForgotPasswordVerifyPage.test.jsx | numeric-keyboard affordance (`inputMode`/`pattern`) + "digits only" helper text (issue #20), non-digit stripping capped at 6, successful verify navigates to reset with `resetToken`, server error shown inline | recovery-code field or verify flow changes |
| ForgotPasswordResetPage password fields (issue #7) | RTL (Vitest) | src/pages/__tests__/ForgotPasswordResetPage.test.jsx | both password fields use the shared `password-input.jsx` reveal toggle, masked by default, each toggles independently; mismatch blocks submit; success navigates to `/login`; server error shown inline | the reset page's password UI changes |

## Managers
| Item (fn / flow) | Test type | Test file | Cases covered | Update when |
|---|---|---|---|---|
| adminApi.createManager() | unit (fetch) | src/__tests__/api.test.js | POST payload | manager schema changes |
| adminApi.updateManagerStatus() | unit (fetch) | src/__tests__/api.test.js | PATCH payload | status rules change |
| Managers page flow | RTL | src/__tests__/pages/ManagersPage.test.jsx | create/edit/reset | UI flow changes |

## Routes
| Item (fn / flow) | Test type | Test file | Cases covered | Update when |
|---|---|---|---|---|
| adminApi.createSystemRoute() | unit (fetch) | src/__tests__/api.test.js | POST payload | route fields change |
| Routes page flow | RTL | src/__tests__/pages/RoutesPage.test.jsx | create + validation | stop validation changes |
| SERVICE_TYPES shared constant (issue #19) | — (refactor, no behavior change) | covered by existing RoutesPage/ManagerVehiclesPage/OperationsPage suites | `src/lib/serviceTypes.js` is the single source imported by RoutesPage, ManagerVehiclesPage and OperationsPage instead of three hand-duplicated arrays | a new service type is added (add it once, in `src/lib/serviceTypes.js`) |
| RoutesPage stop rows keyed by stable id (issue #17) | RTL (Vitest) | src/pages/__tests__/RoutesPage.test.jsx | a stop's typed values follow it (not its list position) after `moveStop()`; an invalid stop's `aria-invalid` highlight stays attached to that stop, not to whatever now occupies its old row | stop-list reordering or per-stop validation UI changes |

## Buses and Requests
| Item (fn / flow) | Test type | Test file | Cases covered | Update when |
|---|---|---|---|---|
| adminApi.createBusAccountRequest() | unit (fetch) | src/__tests__/api.test.js | POST payload | request schema changes |
| adminApi.reviewBusRequest() | unit (fetch) | src/__tests__/api.test.js | PATCH payload | review rules change |
| Operations flow | RTL | src/pages/__tests__/OperationsPage.test.jsx | review + edit vehicle; no manager auto-selected on load, detail only fetches after the viewer clicks a row, `?managerId=` still preselects (issue #9) | operations UI changes |
| lib/phone-number.js (Sri Lankan numbers) | unit (Vitest) | src/lib/__tests__/phone-number.test.js | local and +94 forms accepted with any punctuation; typing capped at ten digits, eleven behind a +; an over-long number rejected rather than trimmed into a valid one | the accepted phone formats change (keep in step with TrackMe-backend/src/utils/phoneNumber.js) |
| Phone fields on the driver form | RTL (Vitest) | src/pages/__tests__/ManagerAccountsPage.test.jsx | a long paste stops at ten digits; +94 numbers keep their eleven; a half-typed number blocks submit with the shared message | the phone inputs move or the cap changes |
| lib/number-plate.js (Sri Lankan plates) | unit (Vitest) | src/lib/__tests__/number-plate.test.js | CAB-1234, WP CAB-1234 and 62-1234 canonicalised from any spacing or case; "WP-1234" read as a plate not a province; wrong digit or letter counts and unknown provinces rejected; cleanPlateInput keeps spaces and hyphens while typing; tidyPlate hands back unparseable text so it can be corrected | the accepted plate formats change (keep in step with TrackMe-backend/src/utils/numberPlate.js) |
| Plate fields on the vehicle and driver forms | RTL (Vitest) | src/pages/__tests__/ManagerVehiclesPage.test.jsx, src/pages/__tests__/ManagerAccountsPage.test.jsx | vehicle create blocks a malformed plate at step 0; the driver form's vehicle number tidies a plate on blur ("pf- 2327" → "PF-2327") but leaves a vehicle ID untouched | plate inputs move, or the field stops accepting a vehicle ID |
| Edit-vehicle route field (issue #13) | RTL (Vitest) | src/pages/__tests__/ManagerVehiclesPage.test.jsx | edit dialog uses the same validated route dropdown as create (no free-text Route ID input); picking a different route sends the new routeId on save; a vehicle whose current route isn't in the assignable list still shows it as the selected option instead of blanking it | the edit form's route field changes, or reverts to free text |
| Enrollment key replacement and its undo | RTL (Vitest) | src/pages/__tests__/ManagerAccountsPage.test.jsx | "Replace enrollment key" opens a warning instead of acting on the click; the warning states the old key stops working and that one undo is available; Cancel replaces nothing; confirming calls rotate; "Restore previous key" appears only once a replacement is recoverable (from the rotate response, or from a reveal reporting `canRevert`) and disappears after it is used | the confirmation, the undo affordance, or the `canRevert` contract changes (keep in step with TrackMe-backend enrollment-key endpoints; the endpoint is still named rotate, only the copy is plain-language) |
| Vehicles page without seat capacity | RTL (Vitest) | src/pages/__tests__/ManagerVehiclesPage.test.jsx | neither the create wizard (step 0 fields, Review summary) nor the edit dialog collects or shows a seat count, and no seatCapacity is sent on create or update | seat capacity returns to the manager UI (it is the last place a real capacity could be entered — see TrackMe-backend bookingController.getAvailableSeats) |
| Driver directory vehicle column | RTL (Vitest) | src/pages/__tests__/ManagerAccountsPage.test.jsx | the vehicle is shown by number plate alone, never the internal vehicleId; falls back to the vehicleId when a record has no plate; "Unassigned" when there is no vehicle | the vehicle column stops being plate-first |

## Tracking
| Item (fn / flow) | Test type | Test file | Cases covered | Update when |
|---|---|---|---|---|
| adminApi.getManagerBusLocation() | unit (fetch) | src/__tests__/api.test.js | minutes default | query changes |
| Tracking page flow | RTL | src/__tests__/pages/ManagerTrackingPage.test.jsx | selection + history | tracking UI changes |

## Dashboard
| Item (fn / flow) | Test type | Test file | Cases covered | Update when |
|---|---|---|---|---|
| adminApi.getSuperAdminDashboard() | unit (fetch) | src/__tests__/api.test.js | GET + auth | dashboard payload changes |
| Dashboard page flow | RTL | src/__tests__/pages/DashboardPage.test.jsx | cards + error state | metrics layout changes |

## Custom Routes (school/work shuttles)
| Item (fn / flow) | Test type | Test file | Cases covered | Update when |
|---|---|---|---|---|
| lib/polyline.js decodePolyline | unit (Vitest) | src/lib/__tests__/polyline.test.js | canonical round trip, empty/missing input | polyline decode logic changes |
| ManagerBusesPage route-assignment toggle | RTL (Vitest) | src/pages/__tests__/ManagerBusesPage.test.jsx | submits routeMode CUSTOM with no routeId, EXISTING with routeId, custom mode skips route requirement | create-bus wizard or routeMode contract changes |
| ManagerRouteApprovalsPage + CustomRoutePreviewModal | RTL (Vitest) | src/pages/__tests__/ManagerRouteApprovalsPage.test.jsx | recorded vs awaiting-driver rendering, empty state, name-field validation (disabled until filled), nameCustomRoute call | approvals list or naming modal changes |
| ManagerRouteApprovalsPage — route change requests + RouteComparisonPanel (Phase 2) | RTL (Vitest) | src/pages/__tests__/ManagerRouteApprovalsPage.test.jsx | pending list renders with deviation stats, comparison panel shows both route maps, resolveRouteChangeRequest called with KEEP_OLD/ADOPT_NEW | diff resolver UI or resolve contract changes |
| Full custom-route flow (mocked backend) | e2e (Playwright) | e2e/custom-routes.spec.ts | create CUSTOM driver request, review→name a recorded route→becomes ACTIVE→selectable in another bus's route dropdown, **Phase 2**: seeded route-change request→review diff→Adopt New→route geometry updates | end-to-end custom-route UX changes |

Setup: `npm run test` (Vitest, jsdom) and `npm run test:e2e` (Playwright, mocks all `/api/manager/*` calls — no live backend/DB needed). Run `npx playwright install chromium` once before the first `test:e2e` run.
