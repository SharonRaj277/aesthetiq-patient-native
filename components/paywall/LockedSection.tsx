/**
 * LockedSection — wraps content that requires the ₹99 unlock.
 *
 * When unlocked: renders children unchanged.
 * When locked: renders the children blurred + non-interactive, with a frosted
 * overlay, a lock icon, and a CTA. Tapping the overlay scrolls the parent
 * to the unlock card via the optional onTapLocked callback.
 *
 * The teaser is intentional — users can see the *shape* of the data (charts,
 * cards, colours) but not read the values. This is the conversion engine.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

interface Props {
  unlocked:     boolean;
  children:     React.ReactNode;
  onTapLocked?: () => void;
  /**
   * Hide the entire section when locked instead of teasing it.
   * Used for sections where the teaser would be misleading (e.g. PDF export).
   */
  hideWhenLocked?: boolean;
  /** Override the default lock CTA copy */
  ctaText?: string;
}

export function LockedSection({
  unlocked,
  children,
  onTapLocked,
  hideWhenLocked = false,
  ctaText = 'Unlock full report',
}: Props) {
  if (unlocked) return <>{children}</>;
  if (hideWhenLocked) return null;

  return (
    <View style={styles.wrap}>
      {/* Real content rendered behind, dimmed */}
      <View style={styles.dimmed} pointerEvents="none">
        {children}
      </View>

      {/* Frosted glass overlay */}
      <Pressable
        onPress={onTapLocked}
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel={ctaText}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidFallback]} />
        )}

        <View style={styles.cta}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.ctaText}>{ctaText}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { position: 'relative', overflow: 'hidden', borderRadius: 18 },
  dimmed:  { opacity: 0.30 },
  androidFallback: { backgroundColor: 'rgba(255,255,255,0.85)' },

  cta: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  lockIcon: { fontSize: 30, marginBottom: 6 },
  ctaText:  { fontSize: 14, fontWeight: '700', color: '#7C3AED' },
});
