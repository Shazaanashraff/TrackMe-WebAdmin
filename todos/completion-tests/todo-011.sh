#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
F=src/pages/ManagerSettingsPage.jsx
# stub gone: either page removed, or it no longer contains the "next increment" placeholder
if test -f "$F"; then
  ! grep -Eq 'next increment' "$F"
else
  ! grep -Eq 'ManagerSettingsPage' src/App.jsx
fi
npm run lint
npm test
echo "COMPLETION OK: todo-011"
