#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
test -f src/components/ui/EmptyState.jsx
# imported by at least 3 pages
COUNT=$(grep -Rl 'EmptyState' src/pages | wc -l | tr -d ' ')
test "$COUNT" -ge 3
npm run lint
npm test
echo "COMPLETION OK: todo-015"
