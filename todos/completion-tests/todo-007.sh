#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
SA=src/pages/DashboardPage.jsx
MG=src/pages/ManagerDashboardPage.jsx
# synthetic series generators removed
! grep -Eq 'const barData|const bookingsTrend|const ratingTrend' "$SA"
! grep -Eq 'const bookingTrend' "$MG"
npm run lint
npm test
echo "COMPLETION OK: todo-007"
