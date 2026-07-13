#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
F=src/pages/ManagerAccountsPage.jsx
grep -Eq 'registrationExpiry|insuranceExpiry|licenseExpiry' "$F"
npm run lint
npm test
echo "COMPLETION OK: todo-022"
