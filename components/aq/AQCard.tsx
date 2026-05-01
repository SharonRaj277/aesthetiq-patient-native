/**
 * AQCard — surface container for the Luxury Clinical theme.
 *
 * Renders a View with the elevation + bg from constants/theme.ts.
 *   level 0  → flat, ivory bg, no shadow (inline blocks)
 *   level 1  → white surface, soft shadow                (default cards)
 *   level 2  → white surface, medium shadow              (featured cards)
 *   level 3  → white surface, deep shadow                (hero, sheets)
 *
 * Props:
 *   level         elevation tier (0–3)
 *   padding       'none' | 'sm' | 'md' | 'lg'   default 'md' (16px)
 *   accentBar     'none' | 'left' | 'top'        rose-gold accent line
 *   accentColor   override the accent line colour
 *   onPress       optional — turns the card into a Pressable with haptic
 *   radiusSize    override the corner radius ('md' | 'lg' | 'xl')
 */

import React from 'react';
import {
  View, Pressable, StyleSheet, ViewStyle, StyleProp, GestureResponderEvent, ViewProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors, elevation, radius, spacing } from '../../constants/theme';

export type AQCardLevel   = 0 | 1 | 2 | 3;
export type AQCardPadding = 'none' | 'sm' | 'md' | 'lg';
export type AQCardAccent  = 'none' | 'left' | 'top';
export type AQCardRadius  = 'md' | 'lg' | 'xl';

export interface AQCardProps extends ViewProps {
  level?:       AQCardLevel;
  padding?:     AQCardPadding;
  accentBar?:   AQCardAccent;
  accentColor?: string;
  radiusSize?:  AQCardRadius;
  onPress?:     (e?: GestureResponderEvent) => void;
  children?:    React.ReactNode;
  style?:       StyleProp<ViewStyle>;
}

const PADDING_MAP: Record<AQCardPadding, number> = {
  none: 0,
  sm:   spacing.sm,
  md:   spacing.md,
  lg:   spacing.lg,
};

const RADIUS_MAP: Record<AQCardRadius, number> = {
  md: radius.md,
  lg: radius.lg,
  xl: radius.xl,
};

const ELEVATION_MAP = [
  elevation.level0,
  elevation.level1,
  elevation.level2,
  elevation.level3,
] as const;

export function AQCard({
  level = 1,
  padding = 'md',
  accentBar = 'none',
  accentColor,
  radiusSize = 'lg',
  onPress,
  children,
  style,
  ...rest
}: AQCardProps) {
  const baseStyle: ViewStyle = {
    ...ELEVATION_MAP[level],
    borderRadius: RADIUS_MAP[radiusSize],
    padding:      PADDING_MAP[padding],
    overflow:     accentBar === 'none' ? 'visible' : 'hidden',
  };

  const accent = accentColor ?? colors.accent;

  const content = (
    <>
      {accentBar === 'left' && (
        <View style={[styles.accentLeft, { backgroundColor: accent, borderTopLeftRadius: RADIUS_MAP[radiusSize], borderBottomLeftRadius: RADIUS_MAP[radiusSize] }]} />
      )}
      {accentBar === 'top' && (
        <View style={[styles.accentTop, { backgroundColor: accent, borderTopLeftRadius: RADIUS_MAP[radiusSize], borderTopRightRadius: RADIUS_MAP[radiusSize] }]} />
      )}
      <View style={accentBar === 'none' ? null : styles.accentInner}>
        {children}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        {...rest}
        onPress={(e) => {
          Haptics.selectionAsync();
          onPress(e);
        }}
        style={({ pressed }) => [
          baseStyle,
          pressed && { opacity: 0.92 },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View {...rest} style={[baseStyle, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  accentLeft: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: 4,
  },
  accentTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
  },
  accentInner: {
    // Padding is applied on the outer view; the inner view exists only so
    // the accent strip sits visually OUTSIDE the padded content.
  },
});

export default AQCard;
