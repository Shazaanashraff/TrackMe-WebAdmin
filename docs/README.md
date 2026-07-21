# Web Admin Docs Index

The documentation map for web-admin. [`../CLAUDE.md`](../CLAUDE.md) routes you here.
**Modules** = "how does page/feature X work". **Guides** = "how do I do task Y".

> New module docs start from [`guides/_MODULE_TEMPLATE.md`](guides/_MODULE_TEMPLATE.md).
> Every module doc must state **which role** (manager / super-admin) the feature serves.

## Modules (per page/feature)
All currently **stubs** — each names its source files and must be filled in by the next change
touching it:
[AUTH](modules/AUTH.md) · [DASHBOARD](modules/DASHBOARD.md) · [ACCOUNTS](modules/ACCOUNTS.md) ·
[BUSES](modules/BUSES.md) · [ROUTES](modules/ROUTES.md) ·
[PRIVATE_ROUTES](modules/PRIVATE_ROUTES.md) · [ROUTE_APPROVALS](modules/ROUTE_APPROVALS.md) ·
[TRACKING](modules/TRACKING.md) · [OPERATIONS](modules/OPERATIONS.md) · [SETTINGS](modules/SETTINGS.md)

## Guides
- **[guides/ADDING_A_FEATURE.md](guides/ADDING_A_FEATURE.md)** — page → hook → `api.js`, plus role scoping.
- **[guides/ADDING_A_TEST.md](guides/ADDING_A_TEST.md)** — Vitest + Playwright recipes.
- **[guides/RELEASING.md](guides/RELEASING.md)** — ⚠️ deploy target is **undocumented**; read before assuming.
- **[guides/_MODULE_TEMPLATE.md](guides/_MODULE_TEMPLATE.md)** — copy to start a module doc.

## Design
- **[DESIGN_TOKENS.md](DESIGN_TOKENS.md)** — the token set.
- **[redesign/README.md](redesign/README.md)** — the "Atlas" redesign: plan, design language,
  component inventory, page specs, verification checklist, progress.

## Testing
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** — traceability table.
- **[QA_UPDATE_TRIGGERS.md](QA_UPDATE_TRIGGERS.md)** — when to update tests + docs.
- **[testing/README.md](testing/README.md)** — strategy, incl.
  [unit-test strategy](testing/WEB_ADMIN_UNIT_TEST_STRATEGY.md) and
  [helper refactor plan](testing/WEB_ADMIN_HELPER_REFACTOR_PLAN.md).
- **[TEST_PLAN_UNIT.md](TEST_PLAN_UNIT.md)** / **[TEST_PLAN_INTEGRATION.md](TEST_PLAN_INTEGRATION.md)** / **[TEST_PLAN_E2E.md](TEST_PLAN_E2E.md)**

## Status & log
- **[CHANGES.md](CHANGES.md)** — session log (write before every push).
- **[../CHANGELOG.md](../CHANGELOG.md)** · **[PROGRESS.md](PROGRESS.md)** ·
  **[RESTRUCTURE_PLAN.md](RESTRUCTURE_PLAN.md)** · **[SELF_CONTAINED_CHECKLIST.md](SELF_CONTAINED_CHECKLIST.md)**
- **Enforcement:** [`../scripts/check-docs.mjs`](../scripts/check-docs.mjs) + `.githooks/pre-push`.
  Enable with `git config core.hooksPath .githooks`.
