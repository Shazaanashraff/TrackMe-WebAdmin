#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
! grep -Eq 'window\.prompt\(' src/pages/OperationsPage.jsx
! grep -Eq 'window\.prompt\(' src/pages/ManagerBusesPage.jsx
grep -Eq 'reviewBusRequest' src/pages/OperationsPage.jsx
grep -Eq 'requestDeleteBus' src/pages/ManagerBusesPage.jsx
npm run lint
npm test
echo "COMPLETION OK: todo-010"
