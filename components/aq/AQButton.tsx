/**
 * AQButton — primary button component for AesthetiQ Luxury Clinical theme.
 *
 * Variants:
 *   primary    — espresso bg, ivory text, rose-gold border on press
 *   secondary  — transparent bg, espresso border + text
 *   ghost      — no border, rose-gold text only
 *   danger     — terracotta bg, ivory text
 *
 * All buttons:
 *   • height 52px (control.buttonHeight)
 *   • radius 26px (control.buttonRadius)
 *   • DM Sans 600 / 15px label
 *   • haptic on press
 *   • `loading` prop swaps label for an ActivityIndicator-style dot
 *   • `iconLeft` / `iconRight` slots take any ReactNode
 *   • full-width by default; `compact` opts into intrinsic width
 */

import React, { useRef } from 'react';
import {
  Pressable, View, StyleSheet, Animated, ViewStyle, StyleProp, GestureResponderEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors, control, radius, spacing, type } from '../../constants/theme';
import { AQText } from '../../constants/typography';

export type AQButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface AQButtonProps {
  label:       string;
  onPress?:    (e?: GestureResponderEvent) => void;
  variant?:    AQButtonVariant;
  disabled?:   boolean;
  loading?:    boolean;
  compact?:    boolean;
  iconLeft?:   React.ReactNode;
  iconRight?:  React.ReactNode;
  style?:      StyleProp<ViewStyle>;
  testID?:     string;
}

interface VariantSpec {
  bg:          string;
  bgPressed:   string;
  text:        string;
  border:      string;
  borderPress: string;
}

const VARIANT: Record<AQButtonVariant, VariantSpec> = {
  primary: {
    bg:          colors.surfaceDark,                  // espresso
    bgPressed:   colors.surfaceDark,
    text:        colors.textInverse,                  // ivory
    border:      'transparent',
    borderPress: colors.accent,                       // rose-gold ring
  },
  secondary: {
    bg:          'transparent',
    bgPressed:   colors.surfaceMuted,                 // blush wash on press
    text:        colors.textPrimary,                  // espresso
    border:      colors.textPrimary,
    borderPress: colors.textPrimary,
  },
  ghost: {
    bg:          'transparent',
    bgPressed:   colors.surfaceMuted,
    text:        colors.accent,                       // rose-gold
    border:      'transparent',
    borderPress: 'transparent',
  },
  danger: {
    bg:          colors.danger,                       // terracotta
    bgPressed:   colors.danger,
    text:        colors.textInverse,
    border:      'transparent',
    borderPress: colors.danger,
  },
};

export function AQButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  compact = false,
  iconLeft,
  iconRight,
  style,
  testID,
}: AQButtonProps) {
  const v = VARIANT[variant];
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled || loading}
      onPressIn={() => {
        Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? v.bgPressed : v.bg,
          borderColor:     pressed ? v.borderPress : v.border,
          alignSelf:       compact ? 'flex-start' : 'stretch',
          paddingHorizontal: compact ? spacing.lg : spacing.xl,
          opacity:         disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.row, { transform: [{ scale }] }]}>
        {iconLeft  && <View style={styles.icon}>{iconLeft}</View>}
        <AQText style={[type.button, { color: v.text }]}>
          {loading ? '…' : label}
        </AQText>
        {iconRight && <View style={styles.icon}>{iconRight}</View>}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height:        control.buttonHeight,
    borderRadius:  control.buttonRadius,
    borderWidth:   1.5,
    alignItems:    'center',
    justifyContent:'center',
    flexDirection: 'row',
  },
  row:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { alignItems: 'center', justifyContent: 'center' },
});

export default AQButton;

// ─── Helpers exported for unit / visual testing ──────────────────
export const AQButton_VARIANT = VARIANT;
export const AQ_BUTTON_VARIANTS: AQButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
