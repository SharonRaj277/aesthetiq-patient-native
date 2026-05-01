/**
 * DashboardGreeting — sticky header for the home screen.
 *
 * "Good morning, Sharon"  in Cormorant Garamond 28px espresso.
 * Subtitle in DM Sans 13px clay.
 *
 * Time-of-day phrase computed once on mount; nameless visitors get "there".
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, fontFamily } from '../../constants/theme';
import { AQText } from '../../constants/typography';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

export interface GreetingProps {
  fullName?: string | null;
  subtitle?: string;
}

export function DashboardGreeting({ fullName, subtitle }: GreetingProps) {
  const phrase = useMemo(getGreeting, []);
  const first  = (fullName?.trim().split(' ')[0]) ?? 'there';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.wrap}>
        <AQText
          color="primary"
          style={{
            fontFamily: fontFamily.display,           // Cormorant Garamond Light
            fontSize: 28,
            lineHeight: 34,
          }}
        >
          {phrase},{' '}
          <AQText style={{
            fontFamily: fontFamily.displayBold,       // Cormorant Garamond SemiBold
            fontSize: 28,
            lineHeight: 34,
            color: colors.textPrimary,
          }}>
            {first}
          </AQText>
        </AQText>
        {!!subtitle && (
          <AQText variant="caption" color="secondary" style={{ marginTop: 4 }}>
            {subtitle}
          </AQText>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background },
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.sm,
    paddingBottom:     spacing.md,
    backgroundColor:   colors.background,
  },
});

export default DashboardGreeting;
