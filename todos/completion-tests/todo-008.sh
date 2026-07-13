#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
F=src/pages/OperationsPage.jsx
! grep -Eq '#0f172a|#0b1220' "$F"
npm run lint
npm test
echo "COMPLETION OK: todo-008"
