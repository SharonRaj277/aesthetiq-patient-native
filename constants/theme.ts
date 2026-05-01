/**
 * AesthetiQ — Luxury Clinical theme
 *
 * Single source of truth for colour, spacing, radius, elevation, typography
 * scale, and motion. Every UI component imports from here. No hex values
 * inline anywhere else in the app.
 *
 * Tone: warm ivory + deep espresso + rose gold. Refined minimalism.
 */

import { Platform, TextStyle, ViewStyle } from 'react-native';

// ══ Palette ══════════════════════════════════════════════════════
// Hex first, then RGB tuple for callers that need rgba(...) compositing.

export const palette = {
  // Primary
  ivory:     '#FAF8F5',   // background — warm white
  espresso:  '#1C1410',   // primary text — deep warm black
  roseGold:  '#C49A7B',   // primary accent
  blush:     '#F2E8E1',   // secondary background, locked overlays
  clay:      '#8B6355',   // secondary accent

  // Functional
  success:   '#4A7C59',   // deep forest green
  warning:   '#C4873A',   // warm amber
  danger:    '#A63D2F',   // deep terracotta
  info:      '#3D6B8A',   // deep teal

  // Surfaces
  surface:           '#FFFFFF',
  surfaceMuted:      '#F2E8E1',
  surfaceDark:       '#1C1410',
  surfaceWarning:    '#FEF6EC',
  surfaceDanger:     '#3D1A14',

  // Greys (warm-tinted, never neutral grey)
  warmBorder:    '#E8DED5',
  warmDivider:   '#EDE5DC',
  warmMuted:     '#A89D92',
  warmSubtle:    '#7A6E63',

  // Translucent overlays — assembled via rgba helper below
  overlayDark:   'rgba(28,20,16,0.55)',
  overlayLight:  'rgba(250,248,245,0.85)',
  blushOverlay:  'rgba(242,232,225,0.90)',
} as const;

export type PaletteKey = keyof typeof palette;

// ── RGB extractor (for rgba composition) ─────────────────────────
// Kept narrow on purpose — only the keys that have a rgba use case.

export const rgb = {
  ivory:     [250, 248, 245] as const,
  espresso:  [ 28,  20,  16] as const,
  roseGold:  [196, 154, 123] as const,
  blush:     [242, 232, 225] as const,
  clay:      [139,  99,  85] as const,
  success:   [ 74, 124,  89] as const,
  warning:   [196, 135,  58] as const,
  danger:    [166,  61,  47] as const,
  info:      [ 61, 107, 138] as const,
} as const;

export const alpha = (
  key: keyof typeof rgb,
  a: number,
): string => `rgba(${rgb[key].join(',')}, ${a})`;

// ══ Semantic colour roles ════════════════════════════════════════
// Components reference these (NOT raw palette values) so dark mode or
// re-skin work later only touches this object.

export const colors = {
  // Backgrounds
  background:       palette.ivory,
  backgroundMuted:  palette.blush,
  surface:          palette.surface,
  surfaceMuted:     palette.surfaceMuted,
  surfaceDark:      palette.espresso,

  // Text
  textPrimary:      palette.espresso,
  textSecondary:    palette.clay,
  textMuted:        palette.warmMuted,
  textSubtle:       palette.warmSubtle,
  textInverse:      palette.ivory,
  textOnAccent:     palette.espresso,

  // Borders / dividers
  border:           palette.warmBorder,
  divider:          palette.warmDivider,
  borderStrong:     palette.clay,

  // Accent / interactive
  accent:           palette.roseGold,
  accentMuted:      palette.blush,
  accentStrong:     palette.clay,

  // Functional roles
  success:          palette.success,
  warning:          palette.warning,
  danger:           palette.danger,
  info:             palette.info,

  // Functional surfaces
  successSurface:   '#E8F0EA',
  warningSurface:   palette.surfaceWarning,
  dangerSurface:    '#F4DDD8',
  infoSurface:      '#DCE7EE',

  // Paywall
  paywallBg:        palette.espresso,
  paywallAccent:    palette.roseGold,
  paywallText:      palette.ivory,
  paywallTextMuted: 'rgba(255,255,255,0.7)',
  paywallTextFaint: 'rgba(255,255,255,0.5)',

  // Locked overlay
  lockedOverlay:    palette.blushOverlay,
  lockedIcon:       palette.roseGold,
} as const;

// ══ Per-scan-type score gradients ════════════════════════════════
// Used by AQScore arc and the corresponding scan-type cards.

export const scoreGradients = {
  skin:   ['#C49A7B', '#E8C4A8'] as [string, string],   // rose gold soft
  face:   ['#8B6355', '#C49A7B'] as [string, string],   // clay → rose gold
  dental: ['#3D6B8A', '#6B9EB5'] as [string, string],   // deep teal soft
} as const;

// ══ Spacing — 8px base grid ══════════════════════════════════════

export const spacing = {
  none:   0,
  xs:     4,    // half-step
  sm:     8,
  md:    16,
  lg:    24,
  xl:    32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
} as const;

export type SpacingKey = keyof typeof spacing;

// ══ Border radius ════════════════════════════════════════════════

export const radius = {
  sm:    8,    // chips, badges
  md:   16,    // cards, inputs
  lg:   24,    // large cards, bottom sheets
  xl:   32,    // hero cards, modal sheets
  full: 999,   // pills, circular
} as const;

// ══ Elevation system ═════════════════════════════════════════════
// iOS uses shadow*; Android uses elevation. We pre-compose ViewStyle
// objects so consumers spread them directly.

const makeElevation = (
  bg: string,
  iosShadowOpacity: number,
  iosShadowRadius: number,
  iosOffsetY: number,
  androidElevation: number,
): ViewStyle => ({
  backgroundColor: bg,
  ...Platform.select({
    ios: {
      shadowColor: palette.espresso,
      shadowOffset: { width: 0, height: iosOffsetY },
      shadowOpacity: iosShadowOpacity,
      shadowRadius: iosShadowRadius,
    },
    android: {
      elevation: androidElevation,
    },
  }),
});

export const elevation = {
  level0: { backgroundColor: palette.ivory } as ViewStyle,            // flat, inline
  level1: makeElevation(palette.surface, 0.06, 8,  2, 2),             // cards
  level2: makeElevation(palette.surface, 0.10, 16, 4, 6),             // featured cards
  level3: makeElevation(palette.surface, 0.14, 32, 8, 12),            // hero, sheets
} as const;

// ══ Typography ═══════════════════════════════════════════════════
// Font *families* are loaded by constants/typography.ts via
// @expo-google-fonts. This file only defines the abstract scale and
// references font-family keys that the loader will register.

export const fontFamily = {
  display:        'CormorantGaramond_300Light',
  displayBold:    'CormorantGaramond_600SemiBold',
  body:           'DMSans_400Regular',
  bodyMedium:     'DMSans_500Medium',
  bodySemiBold:   'DMSans_600SemiBold',
  mono:           'DMMono_500Medium',
} as const;

export type FontFamilyKey = keyof typeof fontFamily;

// Type scale — sizes + recommended line heights + default family.
// Keep these as TextStyle so consumers can spread directly into
// <Text style={[type.h1, …]}>.

export const type = {
  display:  { fontFamily: fontFamily.display,      fontSize: 48, lineHeight: 56 } as TextStyle,
  h1:       { fontFamily: fontFamily.displayBold,  fontSize: 32, lineHeight: 40 } as TextStyle,
  h2:       { fontFamily: fontFamily.displayBold,  fontSize: 24, lineHeight: 32 } as TextStyle,
  h3:       { fontFamily: fontFamily.bodySemiBold, fontSize: 18, lineHeight: 26 } as TextStyle,
  body:     { fontFamily: fontFamily.body,         fontSize: 15, lineHeight: 24 } as TextStyle,
  bodyEmphasis: { fontFamily: fontFamily.bodyMedium, fontSize: 15, lineHeight: 24 } as TextStyle,
  bodyEditorial: { fontFamily: fontFamily.display, fontSize: 17, lineHeight: 28 } as TextStyle, // AI interpretation
  caption:  { fontFamily: fontFamily.body,         fontSize: 12, lineHeight: 18 } as TextStyle,
  micro:    { fontFamily: fontFamily.body,         fontSize: 11, lineHeight: 16 } as TextStyle,
  data:     { fontFamily: fontFamily.mono,         fontSize: 22, lineHeight: 28 } as TextStyle,
  dataLarge:{ fontFamily: fontFamily.mono,         fontSize: 64, lineHeight: 72 } as TextStyle,
  button:   { fontFamily: fontFamily.bodySemiBold, fontSize: 15, lineHeight: 20, letterSpacing: 0.2 } as TextStyle,
} as const;

export type TypeScaleKey = keyof typeof type;

// ══ Motion ═══════════════════════════════════════════════════════

export const motion = {
  duration: {
    fast:    150,    // tab swap
    base:    250,    // hover, press
    slow:    350,    // screen entry
    reveal:  500,    // unlock dissolve
    arc:    1200,    // score draw-in
  },
  // Reanimated-friendly easing names; map to actual Easing in components.
  easing: {
    standard: 'easeOut',
    emphasis: 'spring',
    pulse:    'inOut',
  },
  stagger: {
    card:    80,    // ms between consecutive card entries
    section: 100,   // ms between unlock-reveal sections
  },
} as const;

// ══ Hit targets / control sizes ══════════════════════════════════

export const control = {
  buttonHeight:   52,
  buttonRadius:   26,
  inputHeight:    52,
  tabBarHeight:   72,
  captureButton:  72,
  thumbnailSmall: 52,
} as const;

// ══ Composite — convenient grouped export ════════════════════════
// Encourages a single named import: `import { theme } from '...'`.

export const theme = {
  palette,
  colors,
  scoreGradients,
  spacing,
  radius,
  elevation,
  fontFamily,
  type,
  motion,
  control,
  alpha,
} as const;

export type Theme = typeof theme;
export default theme;
