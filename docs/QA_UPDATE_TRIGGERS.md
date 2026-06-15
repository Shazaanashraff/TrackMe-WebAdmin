# Web Admin QA Update Triggers

Use this checklist to keep docs/TESTING_GUIDE.md in sync with web-admin changes.

## Update tests and TESTING_GUIDE when:
- Any adminApi method URL, method, headers, or body changes.
- Auth storage or role gating changes.
- Helper extraction changes validation or payload shaping.
- Operations and dashboard view-model outputs change.
- Screen flow steps change for managers, routes, operations, or tracking.
- Environment variable names change.

## Required actions
- Update docs/TESTING_GUIDE.md rows.
- Update unit and E2E tests covering the changed behavior.
