#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
! grep -Eq 'Editing Mode' src/pages/ManagersPage.jsx
! grep -Eq 'Password Policy' src/pages/ManagerAccountsPage.jsx
! grep -Eq "width: '70%'" src/pages/DashboardPage.jsx
npm run lint
npm test
echo "COMPLETION OK: todo-014"
