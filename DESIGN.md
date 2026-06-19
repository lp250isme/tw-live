# TW Live — DESIGN.md

> Source-aware design spec, extracted from **Linear (linear.app)** via the
> brand-to-design-md method, adapted for the TW Live open-data console.

## Essence
Calm, precise, dark-first. Near-black canvas, immaculate type, a single restrained
indigo accent, hairline borders, generous breathing room. **No neon glow, no
ambient animation** — the data is the hero. (Replaces the prior cyberpunk look.)

## Color tokens
**Dark (default)**
- `--bg #08090a` canvas · `--card #0e0f11` surface · `--muted #16181c`
- `--fg #ECEEF1` primary · `--muted-fg #8A8F98` secondary · tertiary `#62666d`
- `--border rgba(255,255,255,.08)` hairline · `--input rgba(255,255,255,.05)`
- `--accent #7C7DFF` indigo (per-source `accent` overrides on its page)

**Light**
- `--bg #FBFBFC` · `--card #FFFFFF` · `--muted #F4F5F7`
- `--fg #1C1D21` · `--muted-fg #6B7280` · `--border rgba(0,0,0,.08)`
- `--accent #5E6AD2`

Tier colors stay per-source (green→amber→orange→red…) but rendered flat (dot +
arc + label), never as glow.

## Typography
- Family: **Inter** (`Inter Variable`) + `Noto Sans TC`, `system-ui` fallback.
- Headings: weight 600, letter-spacing **-0.02em**; hero 28–32px.
- Body 14–15px / line-height 1.5; labels 12–13px `--muted-fg`.
- Numbers/data: tabular figures.

## Surfaces & shape
- Radius: cards 12px, controls 8px, pills 999px.
- Borders: 1px hairline `--border`; hover lifts border to ~.14 alpha + a hair
  of background, **no shadow except overlays** (modal: soft 0 16px 40px /.4).
- Spacing scale 4/8/12/16/24/32; cards padded 16–20.

## Components
- **Header**: sticky, `bg` at 72% + blur(12px), 1px bottom hairline. Solid logo
  text (no shimmer). Nav = quiet pills, active = subtle `--muted` fill + `--fg`.
- **Gauge**: clean **radial ring** — thin track + accent/tier progress arc for %
  metrics, full ring for counts; big tabular number + small unit; tier label
  below. (No liquid/wave/bubble/gyro.)
- **Card**: surface + hairline, tier as a small dot in the badge; hover = border
  brighten + 1px lift. No animated gradient border.
- **Inputs/Select**: `--input` bg, hairline, focus ring = accent at low alpha.
- **Map markers**: tier-colored dots (flat), user location = accent dot.

## Motion
150–200ms ease-out, transform/opacity only. A single subtle status pulse for the
"live" dot. Everything off under `prefers-reduced-motion`.

## Background
Flat `--bg` with one faint top radial accent glow (~6% alpha) on the overview;
no canvas, no particles, no grid.

## Don't
Neon glows · animated borders/shimmer · saturated cyan everywhere · heavy shadows
· skeuomorphic gauges · motion for decoration.
