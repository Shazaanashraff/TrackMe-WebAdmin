#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
F=src/pages/ManagerAccountsPage.jsx
# three password fields incl old + confirm, and visibility toggles + oldPassword sent
grep -Eqi 'old' "$F"
grep -Eqi 'confirm' "$F"
grep -Eq 'Visibility' "$F"
grep -Eq 'oldPassword' "$F"
npm run lint
npm test
echo "COMPLETION OK: todo-019"
