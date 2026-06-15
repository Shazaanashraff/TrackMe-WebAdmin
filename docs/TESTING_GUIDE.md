# Web Admin Testing Guide

## Auth and Session
| Item (fn / flow) | Test type | Test file | Cases covered | Update when |
|---|---|---|---|---|
| adminApi.login() | unit (fetch) | src/__tests__/api.test.js | token normalization, error parse | auth response changes |
| auth storage helpers | unit | src/helpers/auth/__tests__/authStorage.test.js | read/write/clear | storage keys change |
| App role gating | RTL | src/__tests__/App.test.jsx | redirect rules | role logic changes |

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

## Buses and Requests
| Item (fn / flow) | Test type | Test file | Cases covered | Update when |
|---|---|---|---|---|
| adminApi.createBusAccountRequest() | unit (fetch) | src/__tests__/api.test.js | POST payload | request schema changes |
| adminApi.reviewBusRequest() | unit (fetch) | src/__tests__/api.test.js | PATCH payload | review rules change |
| Operations flow | RTL | src/__tests__/pages/OperationsPage.test.jsx | review + edit bus | operations UI changes |

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
