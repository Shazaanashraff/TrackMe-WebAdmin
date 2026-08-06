# 01 — Design Language — **ATLAS** (LOCKED 2026-07-16)

Chosen by the user on 2026-07-16 from five directions (see `design-options.html` and
`design-options-2.html`; direction **05 — Atlas**).

POV: **Premium calm.** Conventional to operate, considered to look at. The register is
Linear/Stripe restraint plus one structural idea — **the shell floats**. Nothing about the
interaction model is clever or novel; all of the character comes from structure, depth, and a
single petrol accent. This is a fleet-operations tool: legibility and trust first.

## The one structural idea — a floating shell

The app is **not** four flat regions butted together. The sidebar and the content are separate
**inset rounded cards** resting on a tinted canvas:

```
┌─ canvas (tinted, --background) ───────────────────────┐
│  ┌── sidebar card ──┐  ┌── content card ───────────┐  │
│  │  radius 16       │  │  radius 16                │  │
│  │  --surface       │  │  topbar / scroll body     │  │
│  └──────────────────┘  └───────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

- Canvas padding **14px**; gap between the two cards **12px**.
- Both cards: `--surface`, 1px `--border`, radius **16px**, `shadow-float`.
- The canvas is **tinted** (never white) — that contrast is what makes the cards read as
  objects. Do not flatten the canvas to `--surface`.
- Inside the content card, secondary panels are radius **12px** and sit on `--surface-muted`
  or use a 1px rule — they do **not** get their own float shadow. Depth is used once, at the
  shell level. Nested shadows are the failure mode.

## Colour — semantic tokens (never raw hex in components)

CSS variables in `src/index.css`, mapped through `tailwind.config.cjs`. Components use
`bg-surface text-foreground border-border` etc. Accent is **petrol teal** — distinct from the
default SaaS emerald/indigo, and calm enough to sit under data all day.

### Light

| Token | Hex | Use |
|---|---|---|
| `--background` | `#E8EDF1` | **tinted canvas** the shell cards float on |
| `--surface` | `#FFFFFF` | shell cards, panels, dialogs |
| `--surface-muted` | `#F6F8FA` | inset stats, table header, hover fill |
| `--border` | `#E3E8EE` | rules, dividers, inputs |
| `--foreground` | `#0B1220` | primary text |
| `--muted-foreground` | `#5B6875` | secondary text |
| `--primary` | `#0F766E` | petrol — active nav, primary CTA, focus ring |
| `--primary-hover` | `#115E59` | CTA hover |
| `--primary-foreground` | `#FFFFFF` | text on primary |
| `--primary-soft` | `#D6F0EC` | accent badge fill, subtle accent surfaces |
| `--destructive` | `#B91C1C` | delete / revoke / reject |
| `--overlay` | `rgb(11 18 32 / .45)` | dialog / sheet scrim |
| `--ring` | `#0F766E` | focus ring |

### Dark (no pure black; off-white text)

| Token | Hex | Use |
|---|---|---|
| `--background` | `#080C11` | tinted canvas |
| `--surface` | `#111820` | shell cards, panels, dialogs |
| `--surface-muted` | `#0C1219` | inset stats, table header, hover fill |
| `--border` | `#1E2733` | rules, dividers, inputs |
| `--foreground` | `#E8EEF4` | primary text |
| `--muted-foreground` | `#8A97A6` | secondary text |
| `--primary` | `#2DD4BF` | petrol lifted for dark contrast |
| `--primary-hover` | `#5EEAD4` | CTA hover |
| `--primary-foreground` | `#04211D` | text on primary |
| `--primary-soft` | `#0C2E2A` | accent badge fill |
| `--destructive` | `#F87171` | destructive (lifted) |
| `--overlay` | `rgb(0 0 0 / .6)` | dialog / sheet scrim |
| `--ring` | `#2DD4BF` | focus ring |

> In dark, `--surface-muted` is **darker** than `--surface` (inset/sunk), not lighter. Panels
> recede rather than stack — that is what keeps the depth reading correct in both themes.

### Status colours (domain-tied — always label + colour via `StatusBadge`, never colour alone)

`settled` is a true green, deliberately **not** the petrol accent, so "success" never reads as
"branded".

| Variant | Light | Dark | TrackMe domain states |
|---|---|---|---|
| `pending` | `#5B6875` | `#8A97A6` | request `pending`, bus `offline`, route `unnamed` |
| `progress` | `#2563EB` | `#60A5FA` | bus `idle`, request `in review`, change `submitted` |
| `settled` | `#15803D` | `#4ADE80` | bus `online`, request `approved`, manager `active` |
| `warning` | `#B45309` | `#FBBF24` | GPS stale, low battery, expiring credentials, route `private` |
| `danger` | `#B91C1C` | `#F87171` | request `rejected`, manager `suspended`, device fault |

Theme toggle in Topbar; persisted in localStorage; honours `prefers-color-scheme` on first run.
Both themes are designed together and every screen is checked in each.

## Typography

- **Headings / wordmark:** Uber Move (500/700) — self-hosted, keeps TrackMe brand.
  **Super-admin only.** The manager portal runs on a single typeface: `.type-single`
  in `index.css` points `--font-heading` at `--font-sans`, and
  `hooks/use-typography-scope.js` puts that class on `<html>` while a manager is
  signed in (on `<html>`, not a wrapper, so Radix portals inherit it).
- **Body / UI:** Inter (400/500/600/700) — self-hosted via `@fontsource`. 700 exists
  because `font-synthesis: none` means a missing weight renders lighter rather than
  being faked, and manager headings are `font-bold`.
- **Numbers, plates, IDs, room keys, coordinates, money:** Fira Code (500) with
  `tabular-nums`, right-aligned in numeric table columns.
- Scale (px): 12 · 13 · 14(base UI) · 16 · 22 · 26. Body line-height 1.5.
- Headings are tight: `letter-spacing: -0.02em` at 22px+.
- Money via `formatLKR` → `Rs 1,250,000.00`. Dates via `RelativeTime` (Asia/Colombo),
  relative in tables with the absolute on tooltip.

## Radius, spacing & density

- **Radius:** shell cards **16px** (`rounded-2xl`) · panels **12px** (`rounded-xl`) ·
  controls/inputs/buttons **8px** (`rounded-lg`) · badges pill.
- 4/8px spacing system. Table rows `h-11`, cells `px-4 py-3`.
- Canvas padding 14px; shell gap 12px; content-card body padding 22px.
- Forms `max-w-2xl`. Section rhythm 12/18/22/32.

## Elevation

Depth is spent **once**: `shadow-float` on the two shell cards and on overlays
(dialog/sheet/popover/command). Everything inside the content card is flat — separated by
1px `--border` rules and `--surface-muted` fills, never by another shadow.

- `--shadow-float` light: `0 1px 3px rgb(11 18 32 / .06), 0 12px 32px -14px rgb(11 18 32 / .22)`
- `--shadow-float` dark: `0 1px 3px rgb(0 0 0 / .6), 0 12px 32px -14px rgb(0 0 0 / .8)`

## Iconography

**Lucide only**, stroke 1.5, sizes 16 (`h-4 w-4`) / 20 (`h-5 w-5`). No MUI icons, no emoji.
Nav: LayoutDashboard, Users, Activity, Route, Settings / Bus, MapPin, KeyRound,
GitPullRequest, Lock, UserCog.

## Accessibility (priority 1)

- Contrast ≥ 4.5:1 body, ≥ 3:1 large text/glyphs — **both** themes. Petrol `#0F766E` on
  `#FFFFFF` clears 4.5:1; `#2DD4BF` is used on dark surfaces only.
- Visible 2px `--ring` focus ring on every interactive element, offset against the surface.
- Keyboard order = visual order; dialogs trap + restore focus.
- Status = label + colour, never colour alone. `aria-label` on icon-only buttons.
- `prefers-reduced-motion` honoured globally.

## Avoid

No gradients. No glassmorphism (the float is done with shadow + tint, not blur). No second
accent. No nested shadows inside the content card. No decorative illustration. No fabricated
data of any kind. No colour-coded rows. No entrance animations. No giant ghost watermark
headings. No filler cards ("Editing Mode", "Password Policy", "Fleet Scale 70%").
