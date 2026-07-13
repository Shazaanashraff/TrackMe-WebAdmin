#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
F=src/pages/ManagerBusesPage.jsx
! grep -Eq "Booking Enabled|headerName: 'Booking'" "$F"
npm run lint
npm test
echo "COMPLETION OK: todo-020"
