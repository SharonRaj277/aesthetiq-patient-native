/**
 * AQSectionHeader — title (Cormorant Garamond 22) + optional subtitle (DM Sans 13)
 * + optional right-aligned action node (rose-gold).
 *
 * Used wherever a screen needs a section divider with a title.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import { spacing, type, colors } from '../../constants/theme';
import { AQText } from '../../constants/typography';

export interface AQSectionHeaderProps {
  title:     string;
  subtitle?: string;
  action?:   React.ReactNode;
}

export function AQSectionHeader({ title, subtitle, action }: AQSectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <AQText variant="h2" color="primary" style={{ fontSize: 22, lineHeight: 28 }}>
          {title}
        </AQText>
        {!!subtitle && (
          <AQText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {subtitle}
          </AQText>
        )}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.lg,
    paddingBottom:     spacing.sm,
  },
});

export default AQSectionHeader;
