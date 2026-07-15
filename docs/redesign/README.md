# web-admin Redesign — shadcn/ui Overhaul

Full visual + component rebuild of the manager and super-admin portals, modeled on the
**Shabeer / Lanka Textiles** project (`S:\Shabeer`) — refined-minimal (Linear/Stripe register),
Tailwind v4 semantic tokens, shadcn/ui primitives, a shared component kit, and first-class
loading / empty / error states on every page.

**Auth pages (Login, Forgot Password x3) are OUT OF SCOPE — already implemented.**

## Documents

| Doc | What it holds |
|---|---|
| [00-REDESIGN-PLAN.md](00-REDESIGN-PLAN.md) | Master plan: stack decisions, migration strategy, phases, checkpoints, todo-backlog mapping |
| [01-DESIGN-LANGUAGE.md](01-DESIGN-LANGUAGE.md) | Tokens (light/dark), typography, spacing, icons, elevation, a11y rules |
| [02-COMPONENT-INVENTORY.md](02-COMPONENT-INVENTORY.md) | Every shadcn primitive + shared kit component + shell component, with props and states |
| [03-PAGE-SPECS.md](03-PAGE-SPECS.md) | Per-page spec for all 12 pages: layout, data, skeleton, empty/error states, interactions |
| [04-VERIFICATION-CHECKLIST.md](04-VERIFICATION-CHECKLIST.md) | Feature-parity + anti-hallucination checklist; the final code-review gate |
| [PROGRESS.md](PROGRESS.md) | Live checkpoint tracker — update after every checkpoint |

## Rules that carry over unchanged

- All HTTP through `src/api.js` (`adminApi.*`) — never `fetch()` in a page/component.
- No fabricated data, ever — honest empty/zero states when a real value is missing.
- Testing policy: no untested code; feature tests + completion tests both green.
- Preserve auth refresh + redirect behavior (`lib/authSession.js` untouched).
