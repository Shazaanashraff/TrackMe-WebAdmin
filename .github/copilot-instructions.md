# Copilot Instructions — web-admin

## Before you start

Check claude-mem for prior context before reading files or exploring the codebase.
This avoids re-analyzing files already covered in a previous session and saves tokens.

```
/mem-search <topic>
get_observations([IDs])
```

Only read files directly when claude-mem has no relevant context, or to verify a memory is still current.

---

## Project

React 18 + Vite + MUI admin portal.

---

## Rules
- All HTTP calls go through src/api.js.
- Keep auth refresh and redirect behavior consistent.

---

## Testing policy (no untested code)
- Any feature or behavior change must add unit tests for new or changed helpers and components.
- Any backend contract change requires updated integration tests and a new row in docs/TESTING_GUIDE.md.
- Keep test:unit and test:e2e green before marking work done.
