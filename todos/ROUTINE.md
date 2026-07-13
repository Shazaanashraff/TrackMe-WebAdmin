# Web-Admin UI-Overhaul TODO Routine

You are the TODO routine for the **web-admin** portal (TrackMe manager + super-admin UI).
This is an **explicit UI-overhaul track** — unlike the driver/user app tracks, redesign IS the
goal here. Follow this file and `todos/CLAUDE.md` exactly. Do **ONE** todo this run, then stop.
All commands run from `web-admin/`.

Context for every run: read `../docs/ui-audit/WEB_ADMIN_UI_AUDIT.md` first — it is the source of
truth for what is fake/dead/broken and why each todo exists.

1. **Pre-flight:** `git status` clean and up to date with `origin/main` (`git fetch`; work from
   latest `main`). Dirty tree → **stop and report**.

2. **DEDUP FIRST:**
   - `gh pr list --state open --json number,title,headRefName`
   - `git ls-remote --heads origin 'todo/*'`
   - Any todo with an open PR OR an existing `todo/NNN-slug` origin branch is **IN FLIGHT — skip
     it.** Also skip todos already in `todos/complete/` on main.

3. **Pick:** from `todos/todo-list.md`, the FIRST not-skipped, unchecked, non-blocked row whose
   `Dep` are all `[x]`, by priority P1 → P2 → P3 then lowest number. None eligible → report and
   **stop.**

4. **Implement:** branch `todo/NNN-slug` off `main`. Read `todos/active/NNN-slug.md` fully + the
   cited audit section. Implement its *Step-by-step* exactly; honour *Out of scope*.
   Guardrails (CLAUDE.md): **all HTTP stays in `src/api.js`**; never break a working data flow or
   endpoint call while restyling; preserve auth/refresh/redirect behavior; new UI ships with tests.

5. **Blocked by a genuine unknown** (a chart needs a backend history endpoint that doesn't exist;
   a real settings toggle needs an API that doesn't exist): **STOP** — write it into the todo's
   `## Blocked` with the exact missing contract, commit nothing functional, no PR, report. Do NOT
   invent fake data to fill the gap — that is the very thing this track removes.

6. **Verify** (all green; never weaken a test): `npm run lint`, `npm test`,
   `bash todos/completion-tests/todo-NNN.sh`; E2E todos also `npm run test:e2e`.

7. **Close-out ON THE BRANCH:** `git mv todos/active/NNN-slug.md todos/complete/NNN-slug.md`; tick
   the `todo-list.md` row (`[ ]`→`[x]`, add `done: YYYY-MM-DD <sha>`); Conventional Commit
   `feat(ui-todo-NNN): <summary>`.

8. **Push** `todo/NNN-slug`, open PR `ui-todo-NNN: <slug>` confirming lint/test/completion green
   and attaching before/after screenshots. **Do NOT self-merge.**

9. **Stop.** One todo handled. Report the PR link (or blocked / none-eligible reason).
