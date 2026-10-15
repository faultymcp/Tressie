---
name: Halea
version: 2026-10-11
colors:
  base: "#120B2E"          # the dark night every screen sits on
  inset: "#241B4D"         # slightly lifted panels
  glass: "rgba(255,255,255,0.07)"   # card fill, lets the halo light through
  glassEdge: "rgba(255,255,255,0.14)"
  text: "#FFFEF7"          # Porcelain
  textMuted: "#A79BC4"
  textSubtle: "rgba(255,254,247,0.5)"
  primary: "#7643AC"       # Deep Violet: main actions
  accent: "#C38CD9"        # Soft Lavender: highlights, active states, wordmark
  care: "#F484B9"          # Blush Pink: warmth, secondary highlights
  success: "#22c55e"
  warning: "#f59e0b"
  error: "#ef4444"
typography:
  wordmark:   { fontFamily: "Plus Jakarta Sans", fontWeight: 800, use: "the halea logo only" }
  display:    { fontFamily: "Fraunces", fontWeight: 700, fontSize: 32, lineHeight: 38, letterSpacing: -1 }
  title:      { fontFamily: "Fraunces", fontWeight: 700, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 }
  headline:   { fontFamily: "Fraunces", fontWeight: 600, fontSize: 16, lineHeight: 22, letterSpacing: -0.2 }
  emphasis:   { fontFamily: "Fraunces", fontStyle: italic, fontWeight: 400, use: "taglines, names, one word of a heading" }
  label:      { fontFamily: "Sora", fontWeight: 500, fontSize: 12, use: "buttons, chips, tabs, small labels" }
  body:       { fontFamily: "Inter", fontWeight: 400, fontSize: 14, lineHeight: 22 }
  caption:    { fontFamily: "Inter", fontWeight: 400, fontSize: 12, lineHeight: 17 }
spacing:
  scale: [4, 8, 12, 16, 20, 24, 32, 48]
  screenPadding: 20
rounded:
  sm: 8
  md: 12
  lg: 16
  xl: 20
  pill: 999
motion:
  fast: 180
  medium: 280
  slow: 480
  orbSpinMin: 18000        # orbs never turn faster than once every 18s
  orbBreatheMin: 4500
touchTargetMin: 44
sizes:                     # the only font sizes allowed
  fraunces: [14, 16, 22, 32, 44, 64]   # 14 = small italic emphasis; 44/64 = big numbers on moments
  sora: [11, 12, 14, 16]
  inter: [11, 12, 14, 16]              # 11 = tiny tags only
feel:
  press: "every Pressable comes from components/primitives/Pressable (dips to 97%, 4pt extra touch area)"
  haptics: "lib/haptics.ts: tap = main action, select = choosing, success = done, warn/error = refused/failed"
---

# Halea design

The full voice and brand story lives in `BRAND.md`. This file is the short, exact version for anyone (person or agent) building a screen. Values in the header match `constants/theme.ts`. If they ever disagree, fix one so they match.

## Overview

Halea feels like walking into somewhere quietly radiant at night: a dark violet room, a halo of light overhead, soft colour drifting in the background, and a magazine on the table. Editorial and warm, a little magical, never clinical and never "AI".

Two modes:
- **Moments** (splash, intro, chat welcome, quiz results, face scan result) get the full magic: halo, orbs, glow, the sparkle.
- **Everyday screens** (Home, Discover, Shop, Me, Settings) keep the same atmosphere but quieter, so content is what you look at.

## Colors

- Every screen sits on `base`. There is no light mode.
- Cards are glass: `glass` fill + `glassEdge` hairline, ideally over real blur, so the halo light shows through.
- `primary` (violet) is for the one main action on a screen. `accent` (lavender) marks what's active or chosen. `care` (pink) adds warmth, sparingly.
- Electric Lime is retired as of October 2026. Don't bring it back.
- Gradients only on moments: violet to lavender to pink, never on everyday text or cards.

## Typography

- **Fraunces** is the magazine voice: screen titles, card titles, big numbers, and an italic word for emphasis ("Good afternoon, *Cheryy.*"). It was tested against a sans and kept on purpose.
- **Sora** is structure: buttons, chips, tab labels. Normal case. No spaced-out capitals in the nav.
- **Inter** is for reading: body text and captions only.
- **Plus Jakarta Sans** appears in one place: the halea wordmark.
- One heading per screen at `display` or `title`. Don't stack two big serif headings.

## Layout

- 20pt side padding on every screen. Spacing only from the scale (4, 8, 12, 16, 20, 24, 32, 48). No 13s or 18s.
- Content scrolls under a floating glass tab bar; leave about 110pt at the bottom so nothing hides behind it.
- Magazine rhythm: one strong image or heading, then breathing room, then the next section. Fewer, bigger things beat many small tiles.

## Elevation & Depth

- Depth comes from light, not shadows: the halo at the top, orbs behind, glass in front.
- Shadows barely show on dark, so use them only for the main button glow.
- Glass must really blur on Android: `blurMethod="dimezisBlurViewSdk31Plus"` with a `BlurTargetView` around the content.

## Shapes

- The halo ring is Halea's signature shape. It appears in the icon (lowercase h inside the ring), the chat tab, the progress ring on Home and the background.
- Cards: radius `lg` (16) or `xl` (20). Buttons, chips and the tab bar: `pill`.
- Line icons, 1.7 stroke, 22pt. No filled icon sets mixed in.

## Components

- **Primary button:** violet-to-pink gradient pill, white Sora label, soft violet glow. One per screen.
- **Secondary button:** glass pill with a hairline edge.
- **Chip:** glass pill, Sora 14; selected = solid violet with white text.
- **Card:** glass fill, hairline edge, radius 16 to 20, 16 to 20 padding.
- **Tab bar:** floating glass pill, 5 tabs (Home, Discover, Halea, Shop, Me), normal-case labels, a soft lavender pill behind the active tab.
- **Wordmark:** `components/HaleaWordmark.tsx`. Outline draws, lavender fills, a small sparkle catches the last letter.
- **Background:** `HaloBackground` on every screen; `FluidOrb` for drifting colour.

## Feel (touch, haptics, motion)

- Import `Pressable` from `@/components/primitives/Pressable`, never from `react-native`. It gives every touch a visible press (97% scale, slight dim) and a bigger touch area. `Button` and `HaloButton` handle their own press.
- Haptics come only from `lib/haptics.ts`, and only on meaningful moments: `tap` for the main action (send, continue, save), `select` for choosing (quiz answers, chips, toggles, tabs), `success` when something finishes. Rows, links and back buttons get the visual press only.
- One motion speed per kind of thing: `Motion.fast` for presses and toggles, `Motion.medium` for screens and sheets, `Motion.slow` for moments.

## Do's and Don'ts

Do:
- Keep the orbs, halo and stars. They are the personality. Slow them down rather than remove them.
- Show real content (stylists' work, real photos) as the hero wherever possible.
- Show every hair texture equally in imagery and examples: braids, locs, coils, curls, waves, straight.
- Check every screen on a slow Android phone.

Don't:
- No "AI" labels, no sparkle icon meaning "AI", no "AI companion".
- No em dashes, emojis or exclamation marks in copy. No "queen, sis, girl". No "It's not X, it's Y".
- No lime. No light-mode screens. No spaced-capital nav labels.
- No new fonts. No fast-spinning or bouncing decoration.
- Don't guess skin tone from a photo; let people choose their undertone.
