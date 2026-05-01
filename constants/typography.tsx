/**
 * AesthetiQ — typography
 *
 * Loads Cormorant Garamond, DM Sans, DM Mono via @expo-google-fonts and
 * provides:
 *   • useAQFonts()   — hook returning [loaded, error] tuple
 *   • AQ_FONT_MAP    — object form for direct use with expo-font's useFonts
 *   • <AQText variant="...">  — pre-configured Text per type-scale level
 *
 * The font-family keys here MUST match the strings declared in
 * constants/theme.ts → fontFamily. If you change one, change both.
 */

import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useFonts } from 'expo-font';

import {
  CormorantGaramond_300Light,
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';

import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';

import { DMMono_500Medium } from '@expo-google-fonts/dm-mono';

import { type as typeScale, colors, type TypeScaleKey } from './theme';

// ─── Font map for expo-font ───────────────────────────────────────

export const AQ_FONT_MAP = {
  CormorantGaramond_300Light,
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMMono_500Medium,
} as const;

// ─── Hook ─────────────────────────────────────────────────────────

/**
 * Loads all AesthetiQ fonts. Use at the root of the app (e.g. _layout.tsx).
 *
 *   const [fontsLoaded] = useAQFonts();
 *   if (!fontsLoaded) return null;
 */
export function useAQFonts() {
  return useFonts(AQ_FONT_MAP);
}

// ─── AQText component ─────────────────────────────────────────────

type AQTextColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'subtle'
  | 'inverse'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

const TEXT_COLOR_MAP: Record<AQTextColor, string> = {
  primary:   colors.textPrimary,
  secondary: colors.textSecondary,
  muted:     colors.textMuted,
  subtle:    colors.textSubtle,
  inverse:   colors.textInverse,
  accent:    colors.accent,
  success:   colors.success,
  warning:   colors.warning,
  danger:    colors.danger,
  info:      colors.info,
};

export interface AQTextProps extends TextProps {
  /** Type-scale variant — maps to the `type` object in theme.ts */
  variant?: TypeScaleKey;
  /** Semantic colour role */
  color?: AQTextColor;
  /** Convenience alignment shortcut */
  align?: TextStyle['textAlign'];
}

/**
 * Pre-configured Text component. Resolves font + size + line-height from
 * the type scale and the colour from the semantic palette.
 *
 *   <AQText variant="h1" color="primary">Welcome</AQText>
 *   <AQText variant="body" color="muted">Tap to continue</AQText>
 */
export function AQText({
  variant = 'body',
  color = 'primary',
  align,
  style,
  children,
  ...rest
}: AQTextProps) {
  const base: TextStyle = typeScale[variant];
  const composed: TextStyle = {
    ...base,
    color: TEXT_COLOR_MAP[color],
    ...(align ? { textAlign: align } : null),
  };
  return (
    <Text {...rest} style={[composed, style]}>
      {children}
    </Text>
  );
}

export default AQText;
