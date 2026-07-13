#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# a Reports page exists and is routed
ls src/pages/ReportsPage.* >/dev/null 2>&1
grep -Eq 'ReportsPage' src/App.jsx
# uses a data grid + an export control, no rupee
! grep -RqF "₹" src/pages/ReportsPage.*
npm run lint
npm test
echo "COMPLETION OK: todo-023"
