#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# no deprecated Grid v1 "item" prop left in RoutesPage
! grep -Eq '<Grid item' src/pages/RoutesPage.jsx
npm run lint
npm test
echo "COMPLETION OK: todo-009"
