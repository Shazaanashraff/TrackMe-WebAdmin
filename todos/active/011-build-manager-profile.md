# TODO 011 — Build a real Manager Profile page (kill the stub)

**Phase:** 2 · **Priority:** P2 · **Depends on:** 003
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §3.7, `src/pages/ManagerSettingsPage.jsx`

## Why
The manager "Profile" route renders one stub card: *"Profile editing and organization-level
settings will be expanded in the next increment."* The nav says "Profile" but the title says
"Manager Settings" (naming mismatch, see todo 003's title fix).

## Step-by-step
1. Check `src/api.js` + backend for what a manager can actually read/update about themselves
   (name/email, change password). Only build what's backed by a real endpoint.
2. Replace the stub with a real profile view: read-only account info (name, email, role, assigned
   province if available) + a "Change password" form if an endpoint exists.
3. Rename consistently: nav label, page `<h1>`, and breadcrumb all say the same thing ("Profile").
4. If NO manager self-service endpoint exists: instead of a stub, either (a) show real read-only
   account info from the auth/user object already in context, or (b) hide the "Profile" nav item
   entirely and remove the route. Do not leave a "coming soon" placeholder.
5. Tests: profile renders real account info; password form (if built) validates + calls the API.

## Design references
- Profile/account settings layout: shadcn settings blocks https://ui.shadcn.com/blocks and Form
  https://ui.shadcn.com/docs/components/form (MUI: `TextField` + `Button`, mirror ManagersPage's
  validation style).

## Out of scope
Org-level settings that need new backend work (→ `## Blocked` with the contract).

## Completion test
`todos/completion-tests/todo-011.sh` — grep proves the "next increment" stub string is gone from
`ManagerSettingsPage.jsx` (or the file+route are removed and the nav item dropped); if kept, the
page references an `adminApi`/auth-context source for real account data; lint + test green.

## Blocked
