# <MODULE NAME> — TrackMe Passenger App

> **Copy this file to `docs/modules/<NAME>.md` when documenting a module.**
> Delete this quote block and every `<…>` placeholder. Keep the section order —
> `CLAUDE.md` and `docs/README.md` assume it. Match the house style of
> [`modules/AUTH.md`](../modules/AUTH.md): terse, senior-engineer, per-file "one job" tables.

**Status:** `<PLANNED | IN-PROGRESS | SHIPPED | SHIPPED-REGRESSION | DEPRECATED>` — <one line; if not SHIPPED, say what's missing/broken and link the tracking todo or audit>

---

## 1. Purpose

<2–4 sentences: what this module does for the user, and the one hard constraint that
shapes it. If part of it is invisible in the UI (sandbox-only, backend-enforced, release
plumbing), say so here.>

## 2. Key files (one job each)

| File | Responsibility |
|---|---|
| `src/…` | <what this file is for — one line> |

> Include screens, feature components, hooks, api fns, services, lib helpers, and any
> **tests** that are the executable spec for this module. Cross-app contracts (backend
> route, socket event) get their own row pointing at the other repo.

## 3. Data flow

```
Screen → Hook (TanStack Query) → api/*.ts → services/api/client.ts → Backend
```
<Replace with the real flow. Use a mermaid `flowchart` if there are branches. Name the
query keys (`qk.*`) and cache invalidations.>

## 4. Contracts (API / socket / storage)

| Kind | Name | Shape / notes |
|---|---|---|
| REST | `<METHOD> /api/…` | <request → response; where the type lives> |
| Socket | `<event>` | <payload; emitted by / listened in> |
| Storage | `<key>` | <SecureStore / AsyncStorage / server> |

> If a contract changes, this table and the backend doc must both change — see
> [`QA_UPDATE_TRIGGERS.md`](../QA_UPDATE_TRIGGERS.md).

## 5. Not visible in the frontend

<Anything an agent can't learn from the screens: sandbox test-mode behaviour, feature
flags / env, backend-enforced rules (membership checks, rate-limits), OTA/release plumbing,
data-model quirks. Delete the section only if there is genuinely nothing.>

## 6. Known gotchas / regressions

- <sharp edges, footguns, deliberate trade-offs, live regressions with a link>

## 7. Tests covering this module

| Layer | File | What it locks |
|---|---|---|
| Unit | `src/**/__tests__/…` | <…> |
| Integration | `src/__integration__/…` | <…> |
| E2E | `e2e/…` | <Maestro flow> |
| Sandbox | `src/features/sandbox/test-cases.ts` | <in-app case id, if any> |

See [`ADDING_A_TEST.md`](ADDING_A_TEST.md) for how to add one, and the
[`TESTING_GUIDE.md`](../TESTING_GUIDE.md) traceability row that must exist.

## 8. Change protocol

Any change to this module must:
1. Run this module's tests green as a baseline.
2. Implement **screen → hook → api → client** (never add a second axios instance).
3. Add/adjust tests for every changed behaviour (a change with no test is not done).
4. Re-run green (`lint`, `typecheck`, `test`; affected Maestro flow or `--dry-run`).
5. Update **this doc** + the [`TESTING_GUIDE.md`](../TESTING_GUIDE.md) row, and append a
   [`CHANGES.md`](../CHANGES.md) entry before pushing.
