// Halea Visual Identity — colours, typography, spacing
// "Warm, modern, magical — never clinical"
//
// Sep 24: flipped to a full dark theme, every screen — not just splash and
// nav bar. This is a real reversal of the original "porcelain daily screens"
// rule, done at the TOKEN level rather than editing every screen file:
// every screen that already used Surface/Foreground/Colors.porcelain/
// Colors.ink (rather than hardcoded hex) should flip automatically. Any
// screen with a hardcoded hex color instead of a token will NOT flip and
// will need a manual fix — flagging that risk rather than hiding it.

export const Colors = {
  // Core palette — unchanged, these are brand identity colours, not theme
  violet: '#7643AC',
  pink: '#F484B9',
  lavender: '#C38CD9',
  lime: '#D9FF00',
  // Background/text/card roles — FLIPPED for dark theme.
  // porcelain is now the dark base (was the light background).
  // ink is now the light text colour (was the dark text colour).
  porcelain: '#120B2E',   // was '#FFFEF7' — now the dark base background
  ink: '#FFFEF7',         // was '#332463' — now the light text colour
  inkDeep: '#120B2E',     // unchanged — still the deepest tone, same as porcelain now
  muted: '#A79BC4',       // brightened from #8A7FA0 — the old value was too dim on dark
  white: 'rgba(255,255,255,0.07)', // GLASS card fill — translucent so the halo light shows through. Never use as a text colour; use '#FFFFFF'.
  border: 'rgba(255,255,255,0.14)', // glass edge
  dark: '#0c0a15',
  // Functional — unchanged
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  // Gradients (for LinearGradient) — unchanged, already dark-toned
  gradientPrimary: ['#7643AC', '#F484B9'],
  gradientHeader: ['#120B2E', '#332463', '#7643AC'],
  gradientSplash: ['#120B2E', '#2d1854', '#4a2070', '#7643AC'],
  gradientWelcome: ['#120B2E', '#2d1854', '#4a2070', '#7643AC'],
  gradientLime: ['#D9FF00', '#7643AC', '#F484B9'],
  gradientWarm: ['#C38CD9', '#F484B9'],
  // Translucent — unchanged, these tint whatever's behind them and still work
  violetBg: 'rgba(118,67,172,0.06)',
  violetBg2: 'rgba(118,67,172,0.12)',
  violetBg3: 'rgba(118,67,172,0.18)',
  limeBg: 'rgba(217,255,0,0.08)',
};

// ─── Semantic colour tokens ────────────────────────────────────────
// Same roles as before, values flipped for dark.
export const Surface = {
  base: '#120B2E',        // was porcelain — now the dark primary background
  raised: 'rgba(255,255,255,0.07)', // glass card fill
  inset: '#241B4D',       // was a light violet tint — now a slightly-lighter-still inset
  accentSoft: 'rgba(118,67,172,0.14)',  // bumped from 0.06 — needs more presence on dark
  careSoft:   'rgba(244,132,185,0.14)', // bumped from 0.08 — same reason
};

export const Foreground = {
  primary: '#FFFEF7',     // was ink #332463 — now light text on dark
  muted:   '#A79BC4',     // brightened from #8A7FA0 for dark-background legibility
  subtle:  'rgba(255,254,247,0.5)',  // was a dark translucent — now light translucent
  onAccent: '#FFFFFF',    // unchanged — text on violet buttons stays white either theme
};

export const BorderTone = {
  subtle: 'rgba(255,254,247,0.06)',  // was dark translucent — now light translucent
  base:   'rgba(255,254,247,0.14)',  // was solid light lavender — now light translucent
  strong: 'rgba(255,254,247,0.20)',  // was dark translucent — now light translucent
  accent: '#7643AC',                 // unchanged — violet accent border works on dark
};

export const Accent = {
  base:  '#7643AC',
  soft:  'rgba(118,67,172,0.18)',    // bumped from 0.10 for dark-background presence
  bgTint:'rgba(118,67,172,0.08)',    // bumped from 0.04
};

export const Care = {
  base: '#F484B9',
  soft: 'rgba(244,132,185,0.14)',    // bumped from 0.08
};

export const Energy = {
  base: '#D9FF00',
  soft: 'rgba(217,255,0,0.12)',      // bumped from 0.08
};

// ─── Type scale ────────────────────────────────────────────────────
export const Fonts = {
  heading: 'Fraunces_700Bold',
  headingSemi: 'Fraunces_600SemiBold',
  headingMedium: 'Fraunces_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

// NOTE: these colors were hardcoded hex duplicates of the old Colors.ink /
// Colors.muted, not references to the tokens — changing Colors above would
// NOT have cascaded here. Updated directly, same reasoning as the tokens.
export const Type = {
  display: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    letterSpacing: -1,
    lineHeight: 38,
    color: '#FFFEF7',
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 28,
    color: '#FFFEF7',
  },
  headline: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    letterSpacing: -0.2,
    lineHeight: 22,
    color: '#FFFEF7',
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#FFFEF7',
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: '#A79BC4',
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
    color: '#A79BC4',
  },
  index: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 3,
    color: '#A79BC4',
  },
  bodyItalic: {
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic' as const,
    fontSize: 13,
    lineHeight: 19,
    color: '#A79BC4',
  },
};

export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 30,
};

// ─── Spacing scale ─────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

// ─── Elevation / shadow tokens ─────────────────────────────────────
// Drop shadows barely read on a dark background (dark shadow on dark base
// is close to invisible) — dropped opacity way down since separation now
// comes mainly from Surface.raised being a lighter tone than Surface.base,
// not from the shadow itself. Kept the shadows structurally rather than
// removing them, in case some cards sit on a lighter inset and still need it.
export const Shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 6,
    elevation: 2,
  },
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 4,
  },
  cta: {
    shadowColor: '#7643AC',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
};

// ─── Motion tokens ─────────────────────────────────────────────────
export const Motion = {
  fast: 180,
  medium: 280,
  slow: 480,
  springCalm: { damping: 22, stiffness: 220 },
  springTight: { damping: 18, stiffness: 380 },
};

// ─── Touch target floor ────────────────────────────────────────────
export const TouchTarget = {
  min: 44,
};
