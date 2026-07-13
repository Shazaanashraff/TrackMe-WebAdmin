#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# an alerts view/component referencing overspeed exists
grep -RqiE 'overspeed|speed alert|speed limit' src
npm run lint
npm test
echo "COMPLETION OK: todo-024"
