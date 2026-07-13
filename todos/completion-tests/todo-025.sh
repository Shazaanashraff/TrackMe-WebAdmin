#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
grep -RqiE 'attendance' src/pages
grep -Rq 'attendance' src/api.js
npm run lint
npm test
echo "COMPLETION OK: todo-025"
