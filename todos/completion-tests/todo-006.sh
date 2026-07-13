#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
SA=src/pages/DashboardPage.jsx
MG=src/pages/ManagerDashboardPage.jsx
! grep -Eq '\+18%|\+24%|\(\+15%\)|updated 4 min ago|updated 2 hours ago' "$SA"
! grep -Eq 'PERFORMANCE IS PEAKING|peaking this week' "$MG"
npm run lint
npm test
echo "COMPLETION OK: todo-006"
