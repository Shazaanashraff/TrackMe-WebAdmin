# web-admin — Admin Portal

React 18 + Vite + MUI admin portal for managers and super-admins.

---

## Session start — check claude-mem first

Before reading files or exploring the codebase, always check claude-mem for prior context on the task at hand.
This avoids re-reading files that were already analyzed in a previous session and saves tokens.

```
/mem-search <topic>
get_observations([IDs])
```

Only read files directly when claude-mem has no relevant prior context, or when you need to verify that a memory is still current.

---

## Architecture

```
src/
  api.js          # adminApi request layer
  pages/          # screen-level pages
  components/     # UI components
  layout/         # layout primitives
  lib/            # utilities
```

---

## Rules
- All HTTP calls go through src/api.js.
- Keep auth refresh and redirect behavior consistent.

---

## Testing policy (no untested code)
- Any feature or behavior change must add unit tests for new or changed helpers and components.
- Any backend contract change requires updated integration tests and a new row in docs/TESTING_GUIDE.md.
- Keep test:unit and test:e2e green before marking work done.
