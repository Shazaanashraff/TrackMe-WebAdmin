# Web Admin Restructure Plan (Docs Only)

## Scope
- Documentation-only pass. No code changes in this step.
- Implement the existing helper refactor plan and unit test strategy (do not redesign).

## Helper Extraction (per WEB_ADMIN_HELPER_REFACTOR_PLAN)
- helpers/auth/authStorage.js
- helpers/auth/authNormalization.js
- helpers/api/request.js
- helpers/api/queryString.js
- helpers/api/errorMessages.js
- helpers/managers/*
- helpers/routes/*
- helpers/buses/*
- helpers/tracking/*
- helpers/operations/*
- helpers/dashboard/*

## Page Splits (Behavior-Preserving)
- OperationsPage -> subcomponents for filters, grid, edit dialog
- DashboardPage -> cards + charts components
- ManagerBusesPage -> request wizard components
- ManagerTrackingPage -> map panel + history panel
- ManagerDashboardPage -> summary cards
- LoginPage -> form + error banner

## Guardrails
- Keep API usage centralized through src/api.js.
- Preserve auth redirect and refresh behavior.
- Keep UI behavior unchanged.
