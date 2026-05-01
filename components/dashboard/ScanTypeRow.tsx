/**
 * ScanTypeRow — horizontal scroll of the three scan entry-points.
 *
 * Per spec:
 *   Each card 160×200, radius 24, level 2 elevation
 *     skin   — blush bg,        rose-gold accent line top
 *     face   — warm-grey bg,    clay accent
 *     dental — light teal-white bg, info accent
 *
 * Icons come from phosphor-react-native (Drop, UserCircle, Tooth).
 *
 * Tap any card → navigates to the existing scan precheck route, preserving
 * the data flow built in earlier phases.
 */

import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Drop, UserCircle, Tooth } from 'phosphor-react-native';

import { AQCard } from '../aq/AQCard';
import { AQText } from '../../constants/typography';
import { colors, palette, spacing, radius } from '../../constants/theme';

type ScanType = 'skin' | 'face' | 'dental';

interface CardSpec {
  type:    ScanType;
  title:   string;
  caption: string;
  bg:      string;
  accent:  string;
  Icon:    React.ComponentType<any>;
  route:   string;
}

const CARDS: CardSpec[] = [
  {
    type: 'skin',
    title: 'Skin',
    caption: 'Multi-light analysis',
    bg: palette.blush,
    accent: palette.roseGold,
    Icon: Drop,
    route: '/scan/skin-precheck',
  },
  {
    type: 'face',
    title: 'Facial',
    caption: 'Aesthetic + LiDAR contour',
    bg: '#ECE6E0',                    // warm grey
    accent: palette.clay,
    Icon: UserCircle,
    route: '/scan/face-guide',
  },
  {
    type: 'dental',
    title: 'Dental',
    caption: 'Whiteness & alignment',
    bg: '#E8F0F4',                    // light teal-white
    accent: colors.info,
    Icon: Tooth,
    route: '/scan/dental-precheck',
  },
];

export function ScanTypeRow() {
  const router = useRouter();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CARDS.map((c) => (
        <AQCard
          key={c.type}
          level={2}
          padding="none"
          radiusSize="lg"
          accentBar="top"
          accentColor={c.accent}
          onPress={() => router.push(c.route as any)}
          style={[styles.card, { backgroundColor: c.bg }]}
        >
          <View style={styles.cardInner}>
            <View style={styles.iconWrap}>
              <c.Icon size={28} color={c.accent} weight="regular" />
            </View>

            <View style={{ flex: 1 }} />

            <AQText variant="h2" color="primary" style={{ fontSize: 22, lineHeight: 28 }}>
              {c.title}
            </AQText>
            <AQText variant="caption" color="secondary" style={{ marginTop: 4 }}>
              {c.caption}
            </AQText>
          </View>
        </AQCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    gap:               spacing.md,
  },
  card: {
    width:  160,
    height: 200,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.md,
    paddingTop:        spacing.md + 4,    // breathing room below 4px accent strip
  },
  iconWrap: {
    width: 44, height: 44,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScanTypeRow;
