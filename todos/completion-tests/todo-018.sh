#!/usr/bin/env bash
set -euo pipefail
# Backend todo: assertions run against ../../../backend
cd "$(dirname "$0")/../../../backend"
grep -Eq 'totalDistanceKm' src/controllers/managerController.js
grep -Eq 'distance|Distance' docs/TESTING_GUIDE.md
npm run test:integration
echo "COMPLETION OK: todo-018"
