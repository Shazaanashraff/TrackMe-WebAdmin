# 04 — Verification & Anti-Hallucination Checklist

Run this at CP 6.3 (and per page at each page CP). Purpose: prove the redesign didn't drop,
invent, or break behavior. Every unchecked box blocks completion. Findings go to PROGRESS.md.

## A. Feature parity — API calls per page (source of truth: grep, 2026-07-15)

Each call must still be reachable from the UI (possibly via a hook) and exercised by a test.

- [ ] **DashboardPage**: getSuperAdminDashboard, getOperationsOverview, getPendingBusRequests
- [ ] **ManagersPage**: getManagers, createManager, updateManager, resetManagerPassword, updateManagerStatus
- [ ] **OperationsPage**: getOperationsOverview, getOperationManagerDetail, getPendingBusRequests, getAuditLogs, updateBus, reviewBusRequest
- [ ] **RoutesPage**: getSystemRoutes, createSystemRoute
- [ ] **ManagerDashboardPage**: getManagerDashboard
- [ ] **ManagerBusesPage**: getManagerBuses, getManagerAssignableRoutes, createBusAccountRequest, updateManagerBus, requestDeleteBus
- [ ] **ManagerTrackingPage**: getManagerBuses, getManagerBusLocation, socket.io live stream (same events/rooms/cleanup)
- [ ] **ManagerAccountsPage**: getManagerBuses, resetManagerBusAccountPassword
- [ ] **ManagerRouteApprovalsPage**: getManagerCustomRoutes, getRouteChangeRequests, nameCustomRoute, resolveRouteChangeRequest
- [ ] **ManagerPrivateRoutesPage**: getManagerOwnedRoutes, getRouteJoinRequests, getRouteMembers, updateRoutePrivacy, revealRoomKey, rotateRoomKey, decideJoinRequest, revokeRouteMember
- [ ] **ManagerLayout badge counts** (getManagerCustomRoutes + getRouteChangeRequests polling) ported to AppShell sidebar badges
- [ ] **assignBusesToManager, getManagerRequests, getBusRoutes**: confirm where these are (or were) used; either wired in the new UI or explicitly recorded as previously-dead code in PROGRESS.md — do not silently drop

## B. Auth & session (untouched zone)

- [ ] `lib/authSession.js` byte-identical (or changes explicitly approved)
- [ ] Login/logout/refresh flows work; role routing (super-admin vs admin) unchanged
- [ ] Auth pages NOT restyled (out of scope)
- [ ] 401 refresh-and-retry behavior in `api.js` unchanged

## C. Design-system conformance (grep gates)

- [ ] `grep -r "@mui" src/` → 0 hits
- [ ] `grep -r "@emotion" src/` → 0 hits
- [ ] `grep -r "framer-motion" src/` → 0 hits
- [ ] `grep -r "window.prompt\|window.confirm" src/` → 0 hits
- [ ] `grep -rE "#[0-9a-fA-F]{3,8}" src/pages src/components src/layout` → 0 hits outside index.css/tokens
- [ ] `grep -r "fetch(" src/pages src/components src/layout` → 0 hits (api.js only)
- [ ] One Button component; no orphan duplicates
- [ ] Icons: lucide-react only (`grep -r "@mui/icons"` → 0)

## D. States coverage (walk every page, throttled + mocked)

For EACH of the 12 pages:
- [ ] First-load skeleton renders (no layout shift when data lands)
- [ ] Error state renders with working Retry (kill backend to test)
- [ ] Empty state renders (empty fixture) with correct copy + icon
- [ ] Mutations show pending state on the button + toast on settle
- [ ] Refresh (topbar) refetches page data with visible feedback
- [ ] No fabricated values anywhere (numbers, deltas, timestamps, series, activity feeds)

## E. Both themes, all breakpoints

- [ ] Every page audited in light AND dark (contrast, invisible-box class of bugs)
- [ ] 375px / 768px / 1280px: no horizontal scroll; sidebar collapses; tables usable
- [ ] Focus ring visible on every interactive element; dialogs trap focus; ESC closes
- [ ] `prefers-reduced-motion`: no pulses/transitions

## F. Tests & tooling

- [ ] `npm run lint` + `npm test` green, no `.only`/skips
- [ ] Kit components have state-machine tests (loading/error/empty/populated)
- [ ] Existing page tests updated, not deleted; e2e smoke passes
- [ ] Absorbed todos ticked in `todos/todo-list.md` with CP references
- [ ] package.json: MUI/Emotion/framer-motion removed; lockfile regenerated; build passes

## G. Final code review protocol

1. Fresh session (or reviewer) reads 00–03 docs, then diffs each page against its spec.
2. Check the spec's Layout/States lists item-by-item against the running app (dev server),
   not just the code.
3. Verify section A by clicking every action in the UI while watching the network tab.
4. Record verdict per page in PROGRESS.md: `parity ✅ / findings: …`.
