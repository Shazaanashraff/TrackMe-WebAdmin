# Web Admin Unit Test Plan

## API Client
| Item | Test focus |
|---|---|
| adminApi.login | auth header, token normalization |
| adminApi.refreshToken | refresh flow, retry disabled |
| adminApi.requestPasswordResetOtp | URL, body |
| adminApi.verifyPasswordResetOtp | URL, body |
| adminApi.resetPasswordWithToken | URL, body |
| adminApi.getSuperAdminDashboard | GET + auth header |
| adminApi.getSystemRoutes | query string handling |
| adminApi.createSystemRoute | POST + payload |
| adminApi.getOperationsOverview | GET + auth header |
| adminApi.getOperationManagerDetail | path param |
| adminApi.getManagers | query string handling |
| adminApi.createManager | POST + payload |
| adminApi.updateManager | PUT + payload |
| adminApi.updateManagerStatus | PATCH + payload |
| adminApi.resetManagerPassword | PATCH + payload |
| adminApi.assignBusesToManager | PATCH + payload |
| adminApi.getPendingBusRequests | query string handling |
| adminApi.reviewBusRequest | PATCH + payload |
| adminApi.getAuditLogs | query string handling |
| adminApi.updateBus | PUT + payload |
| adminApi.getManagerDashboard | GET + auth header |
| adminApi.getBusRoutes | GET + auth header |
| adminApi.getManagerBuses | GET + auth header |
| adminApi.getManagerBusById | path param |
| adminApi.updateManagerBus | PUT + payload |
| adminApi.createBusAccountRequest | POST + payload |
| adminApi.requestDeleteBus | POST + payload |
| adminApi.getManagerRequests | GET + auth header |
| adminApi.resetManagerBusAccountPassword | PATCH + payload |
| adminApi.getManagerBusLocation | minutes default and override |

## Auth Helpers
| Item | Test focus |
|---|---|
| authStorage read/write/clear | storage parsing and failures |
| authNormalization | token/accessToken normalization |

## Domain Helpers (Planned)
| Item | Test focus |
|---|---|
| managers helpers | validation, payload shaping |
| routes helpers | stop normalization, payload shaping |
| buses helpers | request validation, payload shaping |
| tracking helpers | coord parsing, history window |
| operations helpers | filter building, review payloads |
| dashboard helpers | metric normalization, chart data |

## Page Wiring (RTL)
| Page | Test focus |
|---|---|
| ManagersPage | create/edit/reset/status flows |
| RoutesPage | create route payload + errors |
| ManagerBusesPage | request wizard steps + edit |
| ManagerTrackingPage | selection + location history |
| OperationsPage | filters, review dialog, update bus |
| DashboardPage | cards render, error state |
| App shell | role gating, logout |
