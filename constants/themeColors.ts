/**
 * Dynamic theme tokens consumed via the useThemeColors() hook.
 *
 * Both objects share the SAME shape so any component can swap between
 * them without conditional logic. Only the values differ.
 */

export const lightColors = {
  // Surfaces
  background:        '#FAF8F5',
  bgGradTop:         '#FFFFFF',
  bgGradBot:         '#FAF8F5',
  surface:           '#FFFFFF',
  surfaceElevated:   '#FFFFFF',
  border:            'rgba(28, 20, 16, 0.08)',

  // Text
  textPrimary:       '#1C1410',
  textSecondary:     'rgba(28, 20, 16, 0.65)',
  textMuted:         'rgba(28, 20, 16, 0.45)',
  textSubtle:        'rgba(28, 20, 16, 0.30)',

  // Score gradients (warm coral, cool teal, lavender)
  skinGradient:      ['#FFB89C', '#FF6B6B'] as const,
  skinGlow:          'rgba(255,107,107,0.20)',
  dentalGradient:    ['#7DD3FC', '#0EA5E9'] as const,
  dentalGlow:        'rgba(14,165,233,0.20)',
  faceGradient:      ['#C4B5FD', '#8B5CF6'] as const,
  faceGlow:          'rgba(139,92,246,0.20)',

  // Brand / CTA
  ctaGradient:       ['#EC4899', '#F472B6'] as const,
  brandPurple:       '#8B5CF6',
  brandPurpleAccent: '#A855F7',
  rose:              '#EC4899',
  success:           '#059669',
  fire:              '#EA580C',

  // Score-ring track (background of arc)
  ringTrack:         'rgba(28, 20, 16, 0.08)',

  // Featured card overlay
  featuredOverlay:   ['rgba(0,0,0,0.20)', 'rgba(0,0,0,0.10)', 'rgba(0,0,0,0.45)'] as const,

  // Trend pill
  trendBg:           'rgba(5,150,105,0.12)',
  trendBorder:       'rgba(5,150,105,0.30)',

  // Effects
  cardShadow:        'rgba(28, 20, 16, 0.08)',
  glowOpacity:       0.15,

  // Status bar
  statusBar:         'dark' as const,
};

export const darkColors: typeof lightColors = {
  // Surfaces
  background:        '#0A0617',
  bgGradTop:         '#15082B',
  bgGradBot:         '#0A0617',
  surface:           'rgba(255, 255, 255, 0.04)',
  surfaceElevated:   'rgba(255, 255, 255, 0.06)',
  border:            'rgba(255, 255, 255, 0.08)',

  // Text
  textPrimary:       '#FFFFFF',
  textSecondary:     'rgba(255, 255, 255, 0.78)',
  textMuted:         'rgba(255, 255, 255, 0.55)',
  textSubtle:        'rgba(255, 255, 255, 0.38)',

  // Score gradients — same colors, stronger glow
  skinGradient:      ['#FFB89C', '#FF6B6B'] as const,
  skinGlow:          'rgba(255,107,107,0.55)',
  dentalGradient:    ['#7DD3FC', '#0EA5E9'] as const,
  dentalGlow:        'rgba(14,165,233,0.55)',
  faceGradient:      ['#C4B5FD', '#8B5CF6'] as const,
  faceGlow:          'rgba(139,92,246,0.55)',

  // Brand / CTA
  ctaGradient:       ['#EC4899', '#A855F7'] as const,
  brandPurple:       '#8B5CF6',
  brandPurpleAccent: '#A855F7',
  rose:              '#EC4899',
  success:           '#10B981',
  fire:              '#FB923C',

  // Score-ring track
  ringTrack:         'rgba(255, 255, 255, 0.08)',

  // Featured card overlay
  featuredOverlay:   ['rgba(10,6,23,0.82)', 'rgba(10,6,23,0.55)', 'rgba(10,6,23,0.85)'] as const,

  // Trend pill
  trendBg:           'rgba(16,185,129,0.18)',
  trendBorder:       'rgba(16,185,129,0.35)',

  // Effects
  cardShadow:        'rgba(0, 0, 0, 0.5)',
  glowOpacity:       0.6,

  // Status bar
  statusBar:         'light' as const,
};

export type ThemeColors = typeof darkColors;
