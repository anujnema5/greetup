---
name: app-theme-system
description: Where and how the circlo client app's color theme is defined
metadata:
  type: project
---

The circlo client app (Next.js + Tailwind v4 + shadcn/ui + next-themes) defines its
entire color theme as oklch CSS variables in [client/src/app/globals.css](client/src/app/globals.css):
`:root { ... }` is light mode, `.dark { ... }` is dark mode, mapped into Tailwind via the
`@theme inline` block at the top.

Architecture uses a two-accent system: `--primary` (match orbs) and `--secondary` (circle orbs).
Orb/dialog styles later in the file mostly derive from `var(--primary)`/`var(--secondary)`, but the
`.dark .circle-orb-*` rules hardcode their own color and must be edited separately.

As of 2026-06-23 the theme is **"Golden Hour"** (gold), but the two modes are tuned oppositely because
`--primary` is used BOTH as a fill and as a text/icon color (`text-primary` on the Connect button, avatar
`bg from-primary` fills, `--ring`, badges):
- **Dark** (user-supplied palette): light glowing gold `--primary: oklch(88% 0.11 105)` with DARK
  `--primary-foreground` — works because the page is near-black. `--accent` is set to the bright gold
  itself with dark `--accent-foreground`. Warm near-black neutrals (hue 110).
- **Light**: pale gold looked washed/muddy because `--primary` doubles as `text-primary` on white. After
  trying deep-gold, charcoal-neutral, and bright-yellow, the user settled on **warm amber/caramel**:
  `--primary: oklch(60% 0.16 66)` with WHITE foreground, used everywhere (fills + text) — CSS-only, no
  component edits. KEY LESSON: the "mustard/dirty" cast came from HUE ~88 (greenish-olive at medium
  lightness); hue ~66 (orange-amber) at the same lightness reads as clean caramel. Lightness ~0.60 is the
  ceiling for legible `text-primary` on white. Warm-neutral ramp (hue 95).
Success/destructive stay semantic. The `.dark .circle-orb-*` block hardcodes its own gold (retuned from
teal separately).

A bright-yellow light theme was rejected as too invasive: `text-primary` (gold-as-text, not fills) is used
in ~80 spots across ~50 files, and the always-dark room/call UI needs it left alone — so it's not a safe
find-replace.
(Iteration history: violet+gold → indigo+teal → Facebook blue → Calm Azure → this gold.)
