#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
test -f src/layout/AppShell.jsx
grep -Eq 'AppShell' src/layout/SuperAdminLayout.jsx
grep -Eq 'AppShell' src/layout/ManagerLayout.jsx
# no dead search input placeholder left in the shell
! grep -Rqs 'Type here' src/layout
# notifications bell testid preserved for e2e
grep -Rqs 'notifications-bell' src/layout
npm run lint
npm test
echo "COMPLETION OK: todo-003"
