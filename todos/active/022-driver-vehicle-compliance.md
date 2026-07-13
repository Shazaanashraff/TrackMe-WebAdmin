# TODO 022 — Driver & vehicle compliance (profiles + expiry reminders)

**Phase:** 5 · **Priority:** P2 · **Depends on:** 003, 011
**Cite:** stakeholder review, `src/pages/ManagerAccountsPage.jsx` (the "Drivers" page),
backend `models/User.js` (driver fields), `models/Bus.js` (`registrationExpiry`, `insuranceExpiry`)

## Why
The org needs to stay compliant: vehicle **insurance** + **registration** and driver **license**
expiries must be visible, and the manager must be **notified as an expiry approaches**. The Drivers
page should become a real driver/vehicle profile view instead of just a password-reset form.

## What already exists (verified)
- `Bus` already has `registrationExpiry` and `insuranceExpiry` (Date). ✅
- Driver (`User`) has `nicNumber`, `licenseCardNumber`, `phoneNumber` — but **no license expiry
  date** field. ❌ (needs adding)

## Step-by-step (backend — coordinate)
1. Add `licenseExpiry` (Date) to the driver on `User` (or a driver sub-doc), and optional document
   fields (e.g. `documents: [{ type, number, expiry, fileUrl? }]`) — start minimal: license expiry.
2. Extend the create/edit-bus + driver flows to capture `registrationExpiry`, `insuranceExpiry`,
   `licenseExpiry`.
3. Add an endpoint the manager page reads: driver+vehicle profile with the three expiry dates and a
   computed status (OK / expiring within N days / expired). Add a **compliance summary** endpoint
   (counts of expiring/expired) for the dashboard 4th KPI.
4. **Reminders:** a scheduled job (cron) that, when an expiry is within the threshold, creates a
   notification for the manager (reuse the notification pattern). Integration tests + TESTING_GUIDE
   rows for the new fields + endpoint.

## Step-by-step (web-admin)
5. Rebuild the **Drivers** page into a driver/vehicle **profile view**: per bus/driver show name,
   contact, NIC, license #, and the three expiry dates with color-coded status chips
   (green/amber/red). Keep the password-reset (todo 019) as one action on this page.
6. Add a **compliance list** (all drivers/vehicles with soonest expiry first) + filter to
   "expiring/expired".
7. Surface the compliance count as the dashboard's optional 4th KPI ("Expiring Soon") linking here.
8. Tests: profile renders real fields + status; expiring/expired chips computed correctly.

## Design references
- Status chips + data table with sort-by-date: `@mui/x-data-grid`; shadcn Badge/Table patterns
  https://ui.shadcn.com/docs/components/data-table .
- Expiry-status color logic (OK/amber/red) as a shared helper.

## Out of scope
Document file uploads/storage (note as follow-up if wanted). QR/attendance (separate plan).

## Completion test
`todos/completion-tests/todo-022.sh` — Drivers page references the expiry fields
(`registrationExpiry|insuranceExpiry|licenseExpiry`) and renders status chips; a compliance
list/filter exists; lint + test green. (Backend field + reminder tests in the backend suite.)

## Blocked
Confirm the reminder **threshold** (e.g. 30/14/7 days) and delivery channel (in-app notification
vs email) before building the cron job.
