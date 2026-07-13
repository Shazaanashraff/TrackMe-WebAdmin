#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
test -f src/lib/formatCurrency.js
grep -Eq 'formatLKR' src/lib/formatCurrency.js
# no Indian rupee symbol left anywhere in src
! grep -RqF "₹" src
# no dollar money icon left in the dashboards/operations
! grep -Rq 'AttachMoney' src/pages
npm run lint
npm test
echo "COMPLETION OK: todo-017"
