# Adding a test — web-admin

Which layer to write, how to run it, and where to register it. This stack is **Vitest + Playwright**
— not Jest, and there is no Maestro here.

Authoritative plans: [`../TEST_PLAN_UNIT.md`](../TEST_PLAN_UNIT.md),
[`../TEST_PLAN_INTEGRATION.md`](../TEST_PLAN_INTEGRATION.md),
[`../TEST_PLAN_E2E.md`](../TEST_PLAN_E2E.md), the strategy docs in
[`../testing/README.md`](../testing/README.md), traceability in
[`../TESTING_GUIDE.md`](../TESTING_GUIDE.md), triggers in
[`../QA_UPDATE_TRIGGERS.md`](../QA_UPDATE_TRIGGERS.md).

**Policy:** no untested code. For this app that includes **role scoping** — assert that a manager
view doesn't render another manager's resources.

## Which layer?

| If you changed… | Write a… |
|---|---|
| a pure helper (`lib/formatCurrency`, `lib/polyline`, `lib/authSession`) | **Vitest unit** test |
| a hook's query key, cache policy, or invalidation (`hooks/use-*.js`) | **Vitest** test with a `QueryClientProvider` wrapper |
| a component's render/interaction (`components/`, `layout/`) | **Vitest + Testing Library** |
| a page's data wiring or empty/error states (`pages/`) | **Vitest** with `api.js` mocked |
| a user journey across pages (login → navigate → act) | **Playwright E2E** |
| anything role-scoped | a test per role — manager **and** super-admin |

## Running

```bash
npm test           # vitest run
npm run test:watch # vitest
npm run test:e2e   # playwright
```

Test setup lives in `src/test/`. Existing suites to copy the pattern from: `src/lib/__tests__/`,
`src/hooks/__tests__/`, `src/components/__tests__/`, `src/pages/__tests__/`,
`src/layout/__tests__/`, `src/theme/__tests__/`.

## Unit / component recipe

1. Mock `src/api.js` — **never** let a test hit the network. It's the single HTTP layer, so one
   mock covers every call the unit makes.
2. For hooks, wrap in a fresh `QueryClient` per test (`retry: false`) so cache state can't leak
   between cases.
3. Assert the contract, not the implementation: query keys, invalidation sets, `enabled` gating,
   and what the user actually sees.
4. Cover the four states every data view has: loading, empty, error, populated.

## Playwright recipe

Specs live alongside the `e2e/` config. Drive real navigation and assert on visible text/roles
rather than internal state. Keep one journey per spec.

---

## Register it (don't skip)

1. Add the row in [`../TESTING_GUIDE.md`](../TESTING_GUIDE.md): behaviour ↔ file ↔ layer ↔ trigger.
2. Add new coverage areas to the matching `TEST_PLAN_*` doc.
3. Keep `lint`, `test`, `test:e2e`, and `build` green before marking work done.
