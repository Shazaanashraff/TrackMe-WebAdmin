#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# no source file imports the retired custom button, and the file is gone
! grep -Rqs "components/ui/button" src
! test -f src/components/ui/button.jsx
grep -Eqs 'Button' docs/DESIGN_TOKENS.md
npm run lint
npm test
echo "COMPLETION OK: todo-002"
