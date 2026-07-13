# TODO 021 — Announcements (manager → users/parents) — MVP

**Phase:** 5 (future) · **Priority:** P3 · **Depends on:** 003
**Status:** SCOPE PENDING — needs product sign-off before implementation. Cross-app (backend +
web-admin + user-app). Do NOT start until the fields/scope below are confirmed.
**Cite:** stakeholder review (Announcement tab idea)

## Why
The portal is run by a transport organisation for school/university shuttles. Managers need to push
timely notices to the parents/users who follow their routes — e.g. "Bus B12 broke down, replacement
en route", "Driver changed for Route 7 today", general service info. This is a natural, high-value
addition and complements the Private Routes membership model (targeted audiences already exist).

## Proposed scope (confirm before building)
- **Audience targeting:** all users, a specific route (incl. private-route members), or a specific
  bus. (Private routes already have a members table → reuse it.)
- **Fields:** title, body, severity (info / warning / critical), optional route/bus, start + expiry,
  author (manager), createdAt.
- **Delivery:** stored + shown in user-app (list/banner); optionally a push/socket notification
  (the app already has Socket.IO + a notification service in driver-app — reuse the pattern).
- **Manager UX:** a new "Announcements" nav item + page: compose form, list of active/expired, edit,
  expire/delete. Empty + loading states (todo 015 components).

## Step-by-step (once scoped)
1. **Backend:** `Announcement` model + CRUD routes scoped to the manager's routes/buses; a read
   endpoint for the user-app filtered by the user's followed/member routes. Integration tests +
   TESTING_GUIDE rows.
2. **web-admin:** Announcements page (compose/list/expire) via new `adminApi.*` methods (HTTP in
   `api.js` only); nav item in the manager shell.
3. **user-app:** surface active announcements (banner/list) + optional push. (Separate app track —
   coordinate; may be its own todo in `user-app/todos`.)
4. Tests across all three; e2e for the manager compose→appears flow.

## Design references
- Notification/announcement patterns: shadcn `Alert`/`Sonner` (toast) https://ui.shadcn.com/docs/components/sonner ;
  admin "compose broadcast" flows. Severity chips + expiry are standard.
- Reuse driver-app's `services/notificationService.js` + Socket.IO pattern for delivery.

## Out of scope (for MVP)
Two-way messaging/replies; per-user read receipts; scheduling beyond start/expiry.

## Completion test
Deferred until scoped. When built: `todos/completion-tests/todo-021.sh` — Announcements page exists
+ nav item; `adminApi` create/list methods present; backend model + tests green; lint + test green.

## Blocked
Awaiting product decision on audience targeting + delivery channel (in-app only vs push) before any
code.
