#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
SA=src/pages/DashboardPage.jsx
# fake pieces stay gone
! grep -Eq '\+18%|\+24%|\(\+15%\)|const barData|const bookingsTrend|const ratingTrend' "$SA"
# real pending-approvals source present
grep -Eq 'getPendingBusRequests' "$SA"
npm run lint
npm test
echo "COMPLETION OK: todo-012"
