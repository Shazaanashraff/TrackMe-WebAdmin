# Adding a feature — web-admin

The one loop for shipping a feature or behaviour change here, so that **every feature lands with
a doc, tests, and a change-log entry**.

> Prerequisite reading: the [module doc](../modules/) for the area you're touching, plus
> [`../DESIGN_TOKENS.md`](../DESIGN_TOKENS.md) and [`../redesign/README.md`](../redesign/README.md)
> if you're adding UI.

---

## 0. Orient

- Find the module via [`CLAUDE.md`](../../CLAUDE.md) → "Where to look". New module? Copy
  [`_MODULE_TEMPLATE.md`](_MODULE_TEMPLATE.md) → `docs/modules/<NAME>.md` and sketch §1–4 first.
- Note **which role** the feature is for — manager, super-admin, or both. That decision drives
  routing, nav, and every test you'll write.
- Baseline green: `npm test`.

## 1. Build in the standard direction

**page → hook → `api.js`.**

| Layer | Where | Rule |
|---|---|---|
| Page | `src/pages/*.jsx` | Route-level composition + empty/error/loading states. Keep data logic in hooks. |
| Layout / nav | `src/layout/` | Add the nav entry with the correct role gate. |
| Component | `src/components/` | `ui/` = Radix+Tailwind primitives, `shared/` = composed pieces. Reuse before adding. |
| Hook | `src/hooks/use-*.js` | TanStack Query. Owns the query key, cache policy, and invalidations. |
| HTTP | `src/api.js` | **The single layer.** Never call `fetch`/`axios` from a page or hook — it bypasses auth refresh + redirect handling. |
| Utils | `src/lib/` | Pure helpers only. |

- **Two UI systems coexist** (MUI and Radix+Tailwind). New UI follows the Radix/Tailwind "Atlas"
  direction; don't add new MUI surfaces without a reason.
- Handle all four data states: loading, empty, error, populated.

## 2. Respect role scoping

- A manager must only ever see **their own** resources. The backend enforces it
  (`managerId === req.user._id`); the UI must not imply otherwise.
- **Hiding a control is not access control.** If a page must be unreachable for a role, gate the
  route — and confirm the backend refuses it too.

## 3. Test every changed behaviour

Follow [`ADDING_A_TEST.md`](ADDING_A_TEST.md): Vitest for helpers/hooks/components/pages,
Playwright for journeys, **and a test per role** for anything role-scoped. Add the traceability
row in [`../TESTING_GUIDE.md`](../TESTING_GUIDE.md).

## 4. Update the docs

- The module doc (`docs/modules/<NAME>.md`): key files, contracts, gotchas, **Status**.
- New module? Add it to [`CLAUDE.md`](../../CLAUDE.md) and [`../README.md`](../README.md).
- Changed a backend contract? Update the matching
  [`backend/docs/modules/*.md`](../../../backend/docs/modules/) in the same change.

## 5. Green gate + log + push

```bash
npm run lint
npm test
npm run test:e2e
npm run build      # dist/ is committed — a stale build ships old code
```
- Append a [`../CHANGES.md`](../CHANGES.md) entry.
- Push. The pre-push check ([`../../scripts/check-docs.mjs`](../../scripts/check-docs.mjs)) warns
  if `src/` changed without a `CHANGES.md` entry or the touched module's doc.

---

### Definition of done
- [ ] Built page → hook → `api.js`; no direct `fetch`/`axios`.
- [ ] Correct role gate, and scoping verified against the backend.
- [ ] Four UI states handled.
- [ ] Vitest coverage (+ Playwright if a journey changed), incl. per-role cases; green.
- [ ] `TESTING_GUIDE.md` row added.
- [ ] Module doc updated (or created) incl. Status.
- [ ] `CHANGES.md` entry appended.
