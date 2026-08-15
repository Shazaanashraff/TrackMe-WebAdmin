# 03 — Page Specs (all 12 pages)

Every page follows the same skeleton:

```
<PageHeader title description actions />
<FilterBar>  (list pages only)
<content>    (KpiGrid / DataTable / Card sections / Map)
```

For each page: **Data** = adminApi calls that MUST survive (parity), **Layout**, **States**
(loading / empty / error are mandatory deliverables, not afterthoughts).

---

## Super-admin

### 3.1 Dashboard (`/dashboard`) — absorbs todos 007, 012, part of 014

**Data:** `getSuperAdminDashboard`, `getOperationsOverview`, `getPendingBusRequests`.
**Layout:**
- PageHeader "Dashboard" / "Fleet operations at a glance". No actions.
- KpiGrid: Total Managers, Active Buses, Pending Requests, Confirmed Bookings → replace
  bookings KPI with a real metric (Active Routes or Online Buses) — bookings UI was removed
  (todo 020). Each StatCard links to its page.
- Two-column row (stack on <lg):
  - **Pending queue card** — top 5 pending bus requests (name, manager, RelativeTime,
    Approve/Reject inline via ConfirmDialog) + "View all" → Operations. THE actionable
    above-the-fold item.
  - **Recent activity card** — latest audit entries (real, from `getAuditLogs` if wired, else
    omit the card entirely — no fake feed).
- Charts (only with real series): fleet activity per day. If backend gives no series → honest
  EmptyState "Not enough data yet". Never invent a curve.
**States:** KPI skeletons (4 CardSkeletons), queue/list skeleton rows; page-level ErrorState
with retry; empty queue → "No pending requests — all caught up" + CheckCircle2 icon.

### 3.2 Managers (`/managers`) — absorbs part of 014

**Data:** `getManagers(params)`, `createManager`, `updateManager`, `updateManagerStatus`,
`resetManagerPassword`, `assignBusesToManager` (verify usage in page/detail flows).
**Layout:** PageHeader ("Managers", action: New manager) → FilterBar (search name/email,
status filter, columns, export, refresh) → DataTable: Avatar+Name, Email, Phone,
Buses (count, tabular), Status (StatusBadge active/suspended), Created (RelativeTime),
row actions ⋯ (Edit, Reset password, Suspend/Activate, Assign buses).
- Create/Edit → FormDialog. Reset password → FormDialog with generated-password display via
  CopyField. Suspend → ConfirmDialog (destructive). "Editing Mode" filler card: deleted.
**States:** TableSkeleton 8×6; empty → Users icon "No managers yet" + New manager CTA;
search-empty → "No managers match your search".

### 3.3 Operations (`/operations`) — absorbs todos 005-adjacent, 008, 010 (super-admin side)

**Data:** `getOperationsOverview`, `getOperationManagerDetail`, `getPendingBusRequests`,
`reviewBusRequest`, `getAuditLogs`, `updateBus`.
**Layout:** PageHeader "Operations" → Tabs:
- **Overview** — manager cards/table (fleet size, online count, pending) → click opens
  **Manager detail Sheet** (`getOperationManagerDetail`): buses DataTable with StatusBadges,
  edit bus → FormDialog (`updateBus`).
- **Bus requests** — DataTable of pending requests; Approve/Reject with required review note
  via ConfirmDialog `requireReason` (kills `window.prompt`).
- **Audit log** — DataTable (actor, action, target, RelativeTime), server pagination.
The invisible dark `#0f172a` boxes die with the token migration (todo 008).
**States:** per-tab TableSkeleton; requests empty → "No pending requests"; audit empty →
"No audit entries for this range"; per-tab ErrorState + retry.

### 3.4 Routes (`/routes`)

**Data:** `getSystemRoutes(params)`, `createSystemRoute`.
**Layout:** PageHeader ("System routes", action: New route) → FilterBar (search, columns,
export, refresh) → DataTable: Route no (Fira Code), Name, From → To, Stops (count),
Distance (tabular), Status. New route → FormDialog (multi-field; keep existing create
payload shape exactly).
**States:** TableSkeleton; empty → Route icon "No system routes yet" + CTA; ErrorState.

### 3.5 Settings (`/settings`) — absorbs todo 004 (page is currently 100% decorative)

Rebuild honest and minimal: Card sections for **Profile** (name, email — real account data),
**Appearance** (theme radio: Light/Dark/System), **Session** (sign out everywhere if backend
supports; else omit). Anything without a real backend: not rendered. If that leaves only
Profile+Appearance, that IS the page.
**States:** section CardSkeletons; save via toast.

---

## Manager

### 4.1 Dashboard (`/manager/dashboard`) — absorbs todos 005, 013

**Data:** `getManagerDashboard`.
**Layout:** PageHeader "Overview" / manager's org name.
- KpiGrid: Fleet size, Online now, Pending requests, Distance today (Distance stays hidden
  behind todo 018 backend — render the card only when the field exists in the payload).
- **Vehicle status card**: first 5 buses (name, plate mono, StatusBadge, RelativeTime last
  seen, link → Tracking) + "Show all" → Buses.
- Fake "Recent Operations" table + dead "View All Operations" button: deleted, not restyled.
- Charts only when the payload has real series; otherwise honest EmptyState.
**States:** KPI + card skeletons; ErrorState with retry.

### 4.2 Buses (`/manager/buses`) — absorbs todo 010 (bus-delete reason prompt)

**Data:** `getManagerBuses`, `getManagerAssignableRoutes`, `createBusAccountRequest`,
`updateManagerBus`, `requestDeleteBus`, `getManagerRequests` (verify where the requests list
renders — keep it).
**Layout:** PageHeader ("Buses", action: Request new bus) → FilterBar → DataTable: Bus name,
Plate (mono), Route, Driver/account email, Status (online/idle/offline via StatusBadge),
Last seen (RelativeTime), actions ⋯ (Edit, View on map, Request delete).
- Request new bus → FormDialog (wizard fields preserved from current create flow, minus the
  removed booking-enabled field).
- Edit → FormDialog (`updateManagerBus`, route select from `getManagerAssignableRoutes`).
- Request delete → ConfirmDialog `requireReason` (`requestDeleteBus`).
- Pending account requests section/tab (`getManagerRequests`) with StatusBadges.
**States:** TableSkeleton; empty → Bus icon "No buses in your fleet" + Request CTA; ErrorState.

### 4.3 Tracking (`/manager/tracking`)

**Data:** `getManagerFleetLive()` (all current manager-owned vehicles, polled every 30s), plus a
Socket.IO `vehicle:subscribe` for the selected vehicle. There is no history endpoint or trail.
**Layout:** PageHeader ("Live tracking", action: vehicle Select).
- Full-height flat Card containing Google Maps; selected vehicle recentres the view.
- Side panel: fleet selector/list plus selected vehicle speed, heading, driver, route, last update,
  coordinates, and LiveIndicator.
- Alert when data is older than 90 seconds instead of silently stale.
**States:** map CardSkeleton while first fleet snapshot loads; empty fleet → EmptyState; driver live
before first fix → explicit waiting state; socket disconnected → LiveIndicator offline + Alert +
REST-polling fallback note; ErrorState on fleet fetch failure.

### 4.4 Accounts (`/manager/accounts`) — absorbs part of 014; coordinates with todo 019

**Data:** `getManagerBuses`, `resetManagerBusAccountPassword`.
**Layout:** PageHeader "Bus accounts" → DataTable: Bus, Account email (mono), Last reset?,
action: Reset password → FormDialog (old/new/confirm with show/hide eyes — matches todo 019's
hardened flow; if backend not shipped yet, keep current payload but the UI fields are built).
"Password Policy" filler card: deleted.
**States:** TableSkeleton; empty → "No bus accounts yet"; ErrorState.

### 4.5 Route Approvals (`/manager/route-approvals`)

**Data:** `getManagerCustomRoutes(params)`, `nameCustomRoute`, `getRouteChangeRequests(params)`,
`resolveRouteChangeRequest`. (ManagerLayout currently polls the first two for nav badge counts —
port that to a query hook powering sidebar badges.)
**Layout:** PageHeader "Route approvals" → Tabs:
- **Unnamed routes** — DataTable of custom routes awaiting names; row action Name →
  FormDialog; Preview → `CustomRoutePreviewModal` (restyled Dialog, map preview kept).
- **Change requests** — DataTable (route, requester, RelativeTime, StatusBadge); row click →
  Sheet with `RouteComparisonPanel` (before/after maps) + Approve/Reject (ConfirmDialog with
  optional note → `resolveRouteChangeRequest`).
- Sidebar NavItem shows a count Badge when either queue is non-empty.
**States:** per-tab TableSkeleton; empty → "No routes waiting for a name" / "No pending change
requests" with CheckCircle2; ErrorState per tab.

### 4.6 Private Routes (`/manager/private-routes`)

**Data:** `getManagerOwnedRoutes`, `updateRoutePrivacy`, `revealRoomKey`, `rotateRoomKey`,
`getRouteJoinRequests(routeId)`, `decideJoinRequest`, `getRouteMembers(routeId)`,
`revokeRouteMember`. (Feature decisions locked in PRIVATE_ROUTES_PLAN.md — UI restyle only.)
**Layout:** Master-detail. Left: routes list (Card list or narrow DataTable — name, StatusBadge
public/private, member count). Right (route selected):
- **Access card** — privacy Switch (`updateRoutePrivacy` + ConfirmDialog when going private),
  Room key as masked CopyField (Reveal → `revealRoomKey`, Copy, Rotate → ConfirmDialog
  destructive → `rotateRoomKey`).
- Tabs: **Join requests** (DataTable: user, RelativeTime, Approve/Reject →
  `decideJoinRequest`) / **Members** (DataTable: user, joined, Revoke → ConfirmDialog →
  `revokeRouteMember`).
**States:** list skeleton; no route selected → EmptyState "Select a route"; requests empty →
"No pending join requests"; members empty → "No members yet — share the room key"; ErrorState
per panel; every mutation → toast.

### 4.7 Settings (`/manager/settings`) — absorbs todo 011 (currently a stub)

Same honest pattern as 3.5: Profile card (real account fields), Appearance card, nothing
fabricated. If a manager-profile backend endpoint is missing for editable fields, fields
render read-only and editing is `## Blocked` — never fake a save.

---

## Special components

- **CustomRoutePreviewModal** → shadcn Dialog, map in rounded container, metadata as
  definition list (mono values), actions in footer.
- **RouteComparisonPanel** → side-by-side (stack on mobile) map cards labeled Current /
  Proposed, diff summary list (added/removed stops with +/- badges).

## Future feature pages (todos 021–025) — must be built IN this system

Announcements (composer FormDialog + history DataTable), Compliance (expiry StatusBadges +
DataTable), Reports (date-range picker + DataTable + ExportMenu), Speed alerts (alerts
DataTable + threshold setting), QR attendance reports (DataTable + ranking). No new visual
language; they inherit kit components. Their specs live in their todo files.
