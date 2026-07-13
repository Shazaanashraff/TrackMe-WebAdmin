# TODO 004 — Kill the fake super-admin Settings page

**Phase:** 1 · **Priority:** P1 · **Depends on:** 003
**Cite:** ../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md §2.5, `src/pages/SettingsPage.jsx`

## Why
Every element on this page is decorative: 4 hardcoded summary counts (3/2/3/9), 4 `Switch`es with
no `onChange`/persistence/save, and a static "Settings Suggestions" bullet list. It teaches users
the app is fake.

## Step-by-step
Pick ONE path based on what the backend actually supports (check `src/api.js` + backend routes):

**Path A — real page (preferred if endpoints exist):** replace the body with things that work:
   the admin's own profile (name/email, change password via an existing endpoint) and only toggles
   backed by a real settings API. Remove the hardcoded count cards and the "suggestions" list.

**Path B — remove the page (if no settings API exists):** delete `SettingsPage.jsx`, drop the
   `/settings` route in `App.jsx`, and remove the "Profile" account nav item from the super-admin
   layout (or point it at a minimal real profile view). Do not leave a decorative shell.

In both paths: no `Switch` without an `onChange` that persists; no hardcoded metric card.
If Path A is chosen but an endpoint is missing, implement the profile part and put the toggles in
`## Blocked` with the exact missing contract — do not ship dead toggles.

## Design references
- Settings layout pattern: shadcn https://ui.shadcn.com/blocks (settings) and Forms
  https://ui.shadcn.com/docs/components/form ; MUI equivalent: `Switch`, `TextField`, `Button`.
- Real toggle-with-persistence pattern (optimistic + revert on error).

## Out of scope
Building new backend settings endpoints (that's a backend todo → `## Blocked` if needed).

## Completion test
`todos/completion-tests/todo-004.sh` — either `SettingsPage.jsx` is deleted AND `/settings` route
removed from `App.jsx`, OR `SettingsPage.jsx` contains no `defaultChecked` `Switch` without an
`onChange` and no hardcoded suggestions array; grep confirms the old `settingSuggestions` const is
gone; lint + test green.

## Blocked
