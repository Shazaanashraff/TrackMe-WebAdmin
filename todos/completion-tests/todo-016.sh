#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
SHELL_F=$(ls src/layout/AppShell.jsx 2>/dev/null || ls src/layout/ManagerLayout.jsx)
# a temporary/responsive drawer + a menu toggle exist in the shell
grep -Eq "variant=\"temporary\"|temporary" "$SHELL_F"
grep -Eq 'aria-label' "$SHELL_F"
npm run lint
npm test
echo "COMPLETION OK: todo-016"
