# Tarefe Design System

Reference for the visual language implemented in `src/app/globals.css`, `src/lib/fonts.ts`, and the shared component primitives (`src/components/shared/`). Every value below is the real token already live on the site — this document doesn't introduce anything new, it records what's there and the rule for how to use it.

## Color system — 60/30/10

The palette is intentionally small: one neutral, one brand color, one accent — used in that order of frequency, not equally.

| Role | Color | Hex | Share | Where it shows up |
|---|---|---|---|---|
| **White** | Base neutral | `#FFFFFF` | **60%** | Page background, card surfaces, input fields — the resting state of nearly every screen |
| **Primary** | Purple | `#5D0089` | **30%** | Buttons, links, active nav states, focus rings, icons on brand surfaces — the color that says "this is Tarefe" and "this is interactive" |
| **Secondary** | Gold | `#F7C800` | **10%** | A single accent detail per view at most — never body text, never a large fill. Existing usage: the small badge dot on the logo mark |

This 60/30/10 split is already the working rule, not a new one: `globals.css` documents it directly — *"Palette is fixed by brief: one brand color (purple), one accent (yellow), used sparingly."* Gold earning only 10% is deliberate — it reads as a rare highlight specifically because it's rare. Reaching for it more often is the single fastest way to make the palette feel generic.

### Token reference

```css
--color-white: #ffffff;
--color-purple-600: #5d0089;   /* primary */
--color-yellow-500: #f7c800;   /* secondary accent */
--color-purple-900: #241426;   /* deep purple — headings, hover state on primary buttons */
```

### Supporting neutrals (part of the "white" 60%)

The 60% isn't literally flat white everywhere — it's the neutral family white anchors, used for structure and quiet text within that same visual weight:

| Token | Hex | Use |
|---|---|---|
| `--color-body` | `#4a3a4e` | Default body text |
| `--color-secondary` | `#776a7a` | Meta text, captions, muted labels (darkened from an earlier `#8a7a8e` to clear WCAG AA's 4.5:1 contrast minimum) |
| `--color-tint` | `#faf6fc` | Off-white section backgrounds, hover fills |
| `--color-border` | `#ece2f1` | Default hairline borders |
| `--color-border-strong` | `#ddccE4` | Input borders, emphasized dividers |

### Semantic colors (functional, not brand)

State colors are desaturated utility colors, not a second accent — they signal system status (success/warning/danger), not brand identity, and don't count against the 60/30/10 ratio:

| State | Text | Background |
|---|---|---|
| Success | `#1f7a4d` | `#eaf7f0` |
| Warning | `#a15c00` | `#fdf1de` |
| Danger | `#b3261e` | `#fbeaea` |

## Typography

Two type families, split by script — never mixed within the same run of text:

- **Farsi (default)**: IRANSansX, self-hosted, weights 400/500/600/700/800 — `html[lang="fa"] body` sets this as the base font.
- **Latin / German / Russian**: Inter, via `next/font/google` — `html:not([lang="fa"])` uses this instead.
- **`.font-latin` / `.number-font` utility**: forces Inter for Latin fragments (prices, product codes, numbers) sitting inside otherwise-Farsi copy, with `font-variant-numeric: tabular-nums` for aligned digits. **Never apply this to an input whose placeholder or label is itself Farsi text** — Inter has no Farsi glyphs, so it silently falls back to the browser's own default font instead of IRANSansX (found and fixed 2026-08-31 across `/ops/team`'s form fields).

## Shape & elevation

- **Radius**: pill (`rounded-full`) for every interactive control — buttons, badges, pills. Cards and panels use `rounded-xl`/`rounded-2xl`. One scale, applied consistently — never a sharp button next to a round card.
- **Shadow**: two tokens only, both tinted toward the brand's dark purple rather than pure black:
  ```css
  --shadow-card: 0 1px 2px rgba(36, 20, 38, 0.04), 0 6px 24px -8px rgba(36, 20, 38, 0.10);
  --shadow-card-hover: 0 2px 4px rgba(36, 20, 38, 0.06), 0 12px 32px -8px rgba(36, 20, 38, 0.16);
  ```

## Motion

- **Easing**: `--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1)` for entrances/interactions; `--ease-in-out-strong: cubic-bezier(0.77, 0, 0.175, 1)` for on-screen movement (drawers, sheets).
- **Tactile feedback**: the `.press` utility scales any interactive element to `0.97` on `:active` over 160ms — applied to every button and pressable control sitewide for a consistent "the interface heard you" response.
- **Reduced motion**: `prefers-reduced-motion: reduce` collapses all animation/transition durations to near-zero globally — respected everywhere, not opted into per-component.

## Layout

- **Content width**: `.container-page` caps at `1360px`, centered, with responsive inline padding (`1rem` mobile, `1.5rem` from `640px` up).
- **RTL-first**: Farsi is the default and primary layout direction (`dir="rtl"`); German/Russian pages mirror to `dir="ltr"`. Directional icons (arrows) flip meaning, not just position — see the component-level RTL-arrow convention in the codebase's own history rather than assuming a straight `rotate-180` is always correct.

## Components (quick reference)

- **Buttons** (`Button.tsx`): `primary` (solid purple, white text), `secondary` (bordered, purple text), `danger` (bordered, danger-red text), `ghost` (text-only, secondary color). All pill-shaped, all carry `.press`.
- **Badges** (`Badge.tsx`): `neutral`, `purple`, `success`, `warning`, `danger` — a soft-tint background with matching text color, `rounded-full`, `text-[11px]`. One shared component so every status pill sitewide reads identically.

## Accessibility baseline

- Every text color against its expected background meets WCAG AA (4.5:1 for body text) — `--color-secondary` was darkened specifically to clear this bar; don't lighten it back without rechecking contrast.
- `:focus-visible` gets an explicit 2px purple outline — never remove focus styling for a "cleaner" look.
- Motion respects `prefers-reduced-motion` globally; don't add a one-off animation that bypasses it.
