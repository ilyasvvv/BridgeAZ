# BridgeAZ Brand Colors

## Core Tokens

| Token | Value | Usage |
|-------|-------|-------|
| **sand** | `#1B1F23` | Primary text, dark buttons, headings |
| **mist** | `#586069` | Secondary text, metadata, placeholders |
| **charcoal** | `#F0F2F5` | Page backgrounds, card fills |
| **coral** | `#D4763C` | Warm CTAs (soft treatment) |
| **accent** | `rgb(29, 29, 68)` | Deep navy/indigo — small text accents only (labels, links) |
| **accent-soft** | `rgb(95, 96, 116)` | Muted navy for subtle decorative elements |

## Button Tiers

| Tier | Classes | Look |
|------|---------|------|
| Primary | `bg-sand text-white` | Dark solid |
| Secondary | `border-border text-sand` | Outlined |
| Warm CTA | `border-coral/30 bg-coral/8 text-coral/90` | Soft coral |

## Active States (tabs, pills, liked/saved)

`border-sand/30 bg-sand/5 text-sand` — never accent blue.

## Hover Patterns

- Default: `hover:border-sand/30`
- Landing CTAs: `-translate-y-0.5` + `shadow-md` + underline reveal animation

## CSS Custom Properties

```css
:root {
  --accent: 29 29 68;
  --accent-soft: 95 96 116;
}
```

Used via Tailwind as `rgb(var(--accent) / <alpha>)`.
