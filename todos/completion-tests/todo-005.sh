#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
F=src/pages/ManagerDashboardPage.jsx
! grep -Eq 'BUS-4021|BUS-8821|BUS-1102|BUS-5531' "$F"
! grep -Eq 'View All Operations' "$F"
npm run lint
npm test
echo "COMPLETION OK: todo-005"
