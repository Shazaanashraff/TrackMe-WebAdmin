#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
MG=src/pages/ManagerDashboardPage.jsx
# fabricated + removed pieces are gone
! grep -Eq 'BUS-4021|const bookingTrend|PERFORMANCE IS PEAKING|Fleet Distribution|Total Revenue' "$MG"
# real sources present: vehicle status (buses) + approvals queue
grep -Eq 'getManagerBuses' "$MG"
grep -Eq 'getManagerCustomRoutes|getRouteChangeRequests' "$MG"
# vehicle-status expand control
grep -Eqi 'show more' "$MG"
# no rupee/dollar literal money glyph
! grep -qF "₹" "$MG"
npm run lint
npm test
echo "COMPLETION OK: todo-013"
