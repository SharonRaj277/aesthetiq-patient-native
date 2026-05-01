/**
 * RecentScansList — minimal vertical list of the patient's last few scans.
 *
 * Per spec: minimal vertical list, score badge right-aligned.
 * Each row: scan type icon + label + relative date | overall score badge.
 * Tap → existing /ai-report route with the original scanId param so the
 * locked / unlocked report logic continues to work unchanged.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Drop, UserCircle, Tooth, ArrowRight, LockSimple, LockSimpleOpen } from 'phosphor-react-native';

import type { LiveScan } from '../../hooks/useLiveScans';
import { colors, palette, spacing, radius, type } from '../../constants/theme';
import { AQText } from '../../constants/typography';

const ICON_BY_TYPE = {
  skin:   { Icon: Drop,        accent: palette.roseGold },
  face:   { Icon: UserCircle,  accent: palette.clay     },
  dental: { Icon: Tooth,       accent: colors.info      },
} as const;

function relativeDate(d: Date | null | undefined): string {
  if (!d) return '—';
  const ms   = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1)    return 'Just now';
  if (mins < 60)   return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return hrs === 1 ? '1 hr ago' : `${hrs} hrs ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)    return days === 1 ? 'Yesterday' : `${days} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function scoreFromScan(scan: LiveScan): number | null {
  const s: any = scan as any;
  return s?.scores?.overall ?? null;
}

interface ScanRowProps {
  scan:    LiveScan;
  onPress: (scan: LiveScan) => void;
}

function ScanRow({ scan, onPress }: ScanRowProps) {
  const meta = ICON_BY_TYPE[scan.type] ?? ICON_BY_TYPE.skin;
  const created = scan.createdAt && typeof (scan.createdAt as any).toDate === 'function'
    ? (scan.createdAt as any).toDate() as Date
    : null;
  const score   = scoreFromScan(scan);
  const unlocked = (scan as any).unlocked === true;

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(scan); }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: palette.blush }]}
    >
      <View style={[styles.icon, { borderColor: meta.accent }]}>
        <meta.Icon size={18} color={meta.accent} weight="regular" />
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.titleLine}>
          <AQText variant="bodyEmphasis" color="primary" style={{ textTransform: 'capitalize' }}>
            {scan.type} scan
          </AQText>
          {unlocked
            ? <LockSimpleOpen size={12} color={colors.accent} weight="regular" />
            : <LockSimple     size={12} color={colors.textMuted} weight="regular" />
          }
        </View>
        <AQText variant="caption" color="muted" style={{ marginTop: 2 }}>
          {relativeDate(created)}
        </AQText>
      </View>

      {score !== null ? (
        <View style={styles.scoreBadge}>
          <AQText style={[type.data, { fontSize: 16, lineHeight: 18, color: colors.textPrimary }]}>
            {score}
          </AQText>
          <AQText variant="micro" color="muted">/ 100</AQText>
        </View>
      ) : (
        <View style={styles.scoreBadge}>
          <AQText variant="caption" color="muted">In progress</AQText>
        </View>
      )}

      <ArrowRight size={16} color={colors.textMuted} weight="regular" />
    </Pressable>
  );
}

export interface RecentScansListProps {
  scans:   LiveScan[];
  loading: boolean;
}

export function RecentScansList({ scans, loading }: RecentScansListProps) {
  const router = useRouter();

  const open = (scan: LiveScan) => {
    router.push({ pathname: '/ai-report', params: { scanId: scan.scanId, type: scan.type } } as any);
  };

  if (loading) {
    return (
      <View style={styles.empty}>
        <AQText variant="caption" color="muted" align="center">Loading…</AQText>
      </View>
    );
  }

  if (scans.length === 0) {
    return (
      <View style={styles.empty}>
        <AQText variant="body" color="secondary" align="center">No scans yet</AQText>
        <AQText variant="caption" color="muted" align="center" style={{ marginTop: 4 }}>
          Pick a scan type above to begin
        </AQText>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {scans.slice(0, 5).map((scan, i) => (
        <View key={scan.id}>
          <ScanRow scan={scan} onPress={open} />
          {i < scans.slice(0, 5).length - 1 && <View style={styles.divider} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: spacing.md,
    gap:             spacing.md,
    borderRadius:    radius.md,
    paddingHorizontal: spacing.sm,
  },
  icon: {
    width: 36, height: 36, borderRadius: radius.full,
    borderWidth: 1.25,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scoreBadge: { alignItems: 'flex-end', gap: 0 },
  divider:   { height: 1, backgroundColor: colors.divider, marginHorizontal: spacing.sm },
  empty:     { paddingVertical: spacing.xl, alignItems: 'center' },
});

export default RecentScansList;
