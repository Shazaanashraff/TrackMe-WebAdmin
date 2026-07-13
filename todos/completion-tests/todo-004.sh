#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# Path B (page removed) OR Path A (no fake toggles / suggestions remain)
if test -f src/pages/SettingsPage.jsx; then
  ! grep -Eq 'settingSuggestions' src/pages/SettingsPage.jsx
  ! grep -Eq 'defaultChecked' src/pages/SettingsPage.jsx
else
  ! grep -Eq "'/settings'" src/App.jsx
fi
npm run lint
npm test
echo "COMPLETION OK: todo-004"
