# 01 — Design Language

POV: **Refined minimal (Linear/Stripe register)** — the Shabeer design language adapted to
TrackMe. Calm, precise, spacious at the page level, efficient inside tables. Light **and**
dark, designed together. This is a fleet-operations tool: legibility and trust over flourish.

## Color — semantic tokens (never raw hex in components)

CSS variables in `src/index.css`, mapped through Tailwind v4 `@theme inline`. Components use
`bg-surface text-foreground border-border` etc. Emerald stays the brand primary (it's already
`ace-primary` and the user-app accent).

### Light

| Token | Hex | Use |
|---|---|---|
| `--background` | `#F8FAFC` | app canvas |
| `--surface` | `#FFFFFF` | cards, tables, dialogs |
| `--surface-muted` | `#F1F5F9` | table header, hover fill |
| `--border` | `#E2E8F0` | dividers, inputs |
| `--foreground` | `#0F172A` | primary text |
| `--muted-foreground` | `#64748B` | secondary text |
| `--primary` | `#059669` | primary CTA, active nav, focus ring |
| `--primary-hover` | `#047857` | CTA hover |
| `--primary-foreground` | `#FFFFFF` | text on primary |
| `--destructive` | `#DC2626` | delete / revoke / reject |
| `--ring` | `#059669` | focus ring |

### Dark (no pure black; off-white text)

| Token | Hex | Use |
|---|---|---|
| `--background` | `#0B1120` | app canvas |
| `--surface` | `#0F172A` | cards, tables, dialogs |
| `--surface-muted` | `#1E293B` | table header, hover fill |
| `--border` | `#1E293B` | dividers, inputs |
| `--foreground` | `#E2E8F0` | primary text |
| `--muted-foreground` | `#94A3B8` | secondary text |
| `--primary` | `#10B981` | CTA/accent (lifted for contrast) |
| `--primary-hover` | `#34D399` | CTA hover |
| `--primary-foreground` | `#022C22` | text on primary |
| `--destructive` | `#F87171` | destructive (lifted) |
| `--ring` | `#10B981` | focus ring |

### Status colors (domain-tied — always label + color via `StatusBadge`, never color alone)

| Variant | Light / Dark | TrackMe domain states |
|---|---|---|
| `pending` (neutral) | slate-500 / slate-400 | request `pending`, bus `offline`, route `unnamed`, member `invited` |
| `progress` (blue) | blue-600 / blue-400 | bus `idle`/`stopped`, request `in review`, route change `submitted` |
| `settled` (emerald) | emerald-600 / emerald-400 | bus `online`/`active`, request `approved`, manager `active`, route `public` |
| `warning` (amber) | amber-600 / amber-400 | GPS stale, low battery/signal, expiring credentials, route `private` |
| `danger` (red) | red-600 / red-400 | request `rejected`, manager `suspended`, bus `deleted`, member `revoked` |

Theme toggle in Topbar; persist in localStorage; respect `prefers-color-scheme` on first run.

## Typography

- **Headings / wordmark:** Uber Move (500/700) — already self-hosted, keeps TrackMe brand.
- **Body / UI:** Inter (400/500/600) via `@fontsource/inter` — self-hosted, no CDN.
- **Numbers, IDs, plates, room keys, coordinates, money:** Fira Code (500) with
  `tabular-nums`, right-aligned in table columns, via the `Money` / mono utilities.
- Scale (px): 12 · 14 · 16(base) · 18 · 24 · 32. Body line-height 1.5.
- Money: `formatLKR` helper (exists, todo 017) → `Rs 1,250,000.00`.
- Dates: one `formatDate`/`RelativeTime` pair, Asia/Colombo; tables show relative
  ("4 min ago") with absolute on tooltip.

## Spacing & density

4/8px system. Table rows `h-11`, cells `px-4 py-3`. Page gutters 16 → 24 → 32px
(mobile → tablet → desktop). Content max width `max-w-screen-2xl` centered. Forms `max-w-2xl`.
Section rhythm 16/24/32/48. Cards: `rounded-lg` (8px) — no more mixed 8/16px radii.

## Iconography

**Lucide only**, stroke 1.5, sizes 16 (`h-4 w-4`) and 20 (`h-5 w-5`). No MUI icons, no emoji.
Nav: LayoutDashboard, Users, Activity, Route, Settings / Bus, MapPin, KeyRound, GitPullRequest,
Lock, UserCog. Status dots for live tracking get a CSS pulse (disabled under reduced-motion).

## Elevation

Flat-ish: `shadow-sm` on cards, `shadow-md` only on overlays (dialog/sheet/popover/command).
No colored glows, no 3D soft-UI shadows (the current dashboard look is retired).

## Accessibility (priority 1)

- Contrast ≥ 4.5:1 body, ≥ 3:1 large text/glyphs — both themes.
- Visible 2px primary focus ring on every interactive element (`:focus-visible`).
- Keyboard order = visual order; dialogs trap + restore focus.
- Status = label + color, never color alone. `aria-label` on icon-only buttons.
- `prefers-reduced-motion` honored globally (kill pulses/transitions).

## Avoid (this is what makes it professional)

No gradients (the `310deg` dark gradient dies), no glassmorphism, no decorative illustration,
no fake data of any kind, no second accent color, no color-coded rows, no framer-motion
entrance animations, no giant ghost "Dashboard" watermark heading, no filler cards
("Editing Mode", "Password Policy", "Fleet Scale 70%").
