import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { MOCK_SCANS } from '../constants/mockData';

const SCAN_META = {
  face:   { label: 'Facial Harmony', emoji: '✨', gradient: ['#4C1D95', '#7C3AED'] as [string, string], color: Colors.primary },
  skin:   { label: 'Skin Analysis',  emoji: '🧴', gradient: ['#831843', '#EC4899'] as [string, string], color: Colors.pink   },
  dental: { label: 'Dental Health',  emoji: '🦷', gradient: ['#0C4A6E', '#0EA5E9'] as [string, string], color: Colors.teal   },
};

const FILTERS = ['All', 'Facial', 'Skin', 'Dental'] as const;
type Filter = typeof FILTERS[number];

const fmtDate = (d: Date) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtTime = (d: Date) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

export default function ScanHistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = MOCK_SCANS.filter((s) => {
    if (filter === 'All')    return true;
    if (filter === 'Facial') return s.type === 'face';
    if (filter === 'Skin')   return s.type === 'skin';
    if (filter === 'Dental') return s.type === 'dental';
    return true;
  });

  const avgScore = MOCK_SCANS.length
    ? Math.round(MOCK_SCANS.reduce((sum, s) => sum + s.scores.overall, 0) / MOCK_SCANS.length)
    : 0;
  const bestScore = MOCK_SCANS.length ? Math.max(...MOCK_SCANS.map((s) => s.scores.overall)) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={['#1E1B4B', '#4C1D95']} style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
              android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
              style={styles.backBtn}
            >
              <Text style={styles.backArrow}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Scan History</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSub}>{MOCK_SCANS.length} scans completed</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statNum}>{MOCK_SCANS.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statNum}>{avgScore}</Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statNum}>{bestScore}</Text>
              <Text style={styles.statLabel}>Best</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter(f); }}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Scan cards */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 44 }}>🔬</Text>
            <Text style={styles.emptyText}>No scans found</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {filtered.map((scan) => {
              const meta = SCAN_META[scan.type];
              const scoreColor = scan.scores.overall >= 80 ? Colors.success : scan.scores.overall >= 60 ? Colors.warning : Colors.danger;
              return (
                <Pressable
                  key={scan.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: '/harmony-report', params: { scanId: scan.id, type: scan.type } });
                  }}
                  android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
                  style={styles.card}
                >
                  {/* Icon */}
                  <LinearGradient colors={meta.gradient} style={styles.cardIcon}>
                    <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
                  </LinearGradient>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{meta.label}</Text>
                    <View style={styles.cardMeta}>
                      <Text style={styles.cardDate}>📅 {fmtDate(scan.date)}</Text>
                      <Text style={styles.cardDot}>·</Text>
                      <Text style={styles.cardDate}>🕐 {fmtTime(scan.date)}</Text>
                    </View>
                    <Text style={styles.cardFinding} numberOfLines={1}>{scan.findings[0]}</Text>

                    {/* Urgency badge */}
                    <View style={[styles.urgencyBadge, {
                      backgroundColor: scan.urgency === 'high' ? '#FEF2F2' : scan.urgency === 'medium' ? '#FFFBEB' : '#F0FDF4',
                      borderColor: scan.urgency === 'high' ? Colors.danger : scan.urgency === 'medium' ? Colors.warning : Colors.success,
                    }]}>
                      <Text style={[styles.urgencyText, {
                        color: scan.urgency === 'high' ? Colors.danger : scan.urgency === 'medium' ? Colors.warning : Colors.success,
                      }]}>
                        {scan.urgency === 'high' ? '🔴 High' : scan.urgency === 'medium' ? '🟡 Medium' : '🟢 Low'} urgency
                      </Text>
                    </View>
                  </View>

                  {/* Score */}
                  <View style={styles.scoreWrap}>
                    <Text style={[styles.scoreNum, { color: scoreColor }]}>{scan.scores.overall}</Text>
                    <Text style={styles.scoreUnit}>/100</Text>
                    {!scan.isUnlocked && (
                      <View style={styles.lockBadge}>
                        <Text style={styles.lockBadgeText}>🔒</Text>
                      </View>
                    )}
                    <Text style={styles.cardArrow}>›</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* New scan CTA */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/scan/type-selection' as any); }}
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          style={{ marginHorizontal: 20, marginTop: 8, borderRadius: 16, overflow: 'hidden' }}
        >
          <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.newScanBtn}>
            <Text style={styles.newScanBtnText}>+ Start New Scan</Text>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 20 },

  header:    { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 6 },
  backBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 16 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statPill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statNum:  { fontSize: 22, fontWeight: '900', color: '#fff' },
  statLabel:{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 },

  filterRow:            { paddingHorizontal: 20, gap: 8, marginTop: 20, marginBottom: 16 },
  filterChip:           { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: Colors.cardBg },
  filterChipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText:       { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  filterChipTextActive: { color: '#fff' },

  cardList: { paddingHorizontal: 20, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: Colors.cardBg, borderRadius: 20, padding: 16,
    borderWidth: 1.5, borderColor: Colors.borderLight,
    ...Colors.shadow.small,
  },
  cardIcon:    { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle:   { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  cardDate:    { fontSize: 11, color: Colors.textMuted },
  cardDot:     { fontSize: 11, color: Colors.textMuted },
  cardFinding: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 17 },
  urgencyBadge:{ alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  urgencyText: { fontSize: 10, fontWeight: '700' },

  scoreWrap: { alignItems: 'center' },
  scoreNum:  { fontSize: 26, fontWeight: '900' },
  scoreUnit: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginTop: -2 },
  cardArrow: { fontSize: 20, color: Colors.textMuted, marginTop: 6 },

  lockBadge:     { backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, borderWidth: 1, borderColor: '#FDE68A' },
  lockBadgeText: { fontSize: 10 },

  empty:     { alignItems: 'center', paddingVertical: 56, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },

  newScanBtn:     { height: 52, alignItems: 'center', justifyContent: 'center' },
  newScanBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
