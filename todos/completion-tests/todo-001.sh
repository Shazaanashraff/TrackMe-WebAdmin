#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
grep -Eq 'createTheme' src/theme.js
grep -Eq 'ThemeProvider' src/main.jsx
grep -Eq 'CssBaseline' src/main.jsx
test -f docs/DESIGN_TOKENS.md
npm run lint
npm test
echo "COMPLETION OK: todo-001"
