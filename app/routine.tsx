import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';

const MORNING = [
  { id: 'r1', name: 'Gentle Cleanser', category: 'Cleanser', instructions: 'Use lukewarm water, massage for 60 seconds', tier: 'Essential', frequency: 'Daily' },
  { id: 'r2', name: 'Vitamin C Serum', category: 'Serum', instructions: '3-4 drops, pat gently into skin', tier: 'Essential', frequency: 'Daily' },
  { id: 'r3', name: 'Moisturiser SPF 30', category: 'Moisturiser', instructions: 'Apply generously as last step', tier: 'Essential', frequency: 'Daily' },
  { id: 'r4', name: 'Eye Cream', category: 'Treatment', instructions: 'Gently tap around orbital bone', tier: 'Optional', frequency: 'Daily' },
  { id: 'r5', name: 'Lip Balm SPF', category: 'Other', instructions: 'Apply before going out', tier: 'Optional', frequency: 'Daily' },
];

const EVENING = [
  { id: 'r6', name: 'Oil Cleanser', category: 'Cleanser', instructions: 'Massage onto dry skin to remove makeup/SPF', tier: 'Essential', frequency: 'Daily' },
  { id: 'r7', name: 'Foam Cleanser', category: 'Cleanser', instructions: 'Second cleanse for deep clean', tier: 'Essential', frequency: 'Daily' },
  { id: 'r8', name: 'Niacinamide Serum', category: 'Serum', instructions: '2-3 drops, let absorb fully', tier: 'Essential', frequency: 'Daily' },
  { id: 'r9', name: 'Retinol', category: 'Treatment', instructions: 'Pea-sized amount, avoid eye area', tier: 'Doctor', frequency: '2-3x week', doctorPrescribed: true },
  { id: 'r10', name: 'Night Moisturiser', category: 'Moisturiser', instructions: 'Apply as final step', tier: 'Essential', frequency: 'Daily' },
];

const WEEK_HISTORY = ['complete', 'complete', 'partial', 'missed', 'complete', 'complete', 'today'] as const;
const STREAK = 5;

const TIER_COLOR: Record<string, { bg: string; text: string }> = {
  Essential: { bg: Colors.primaryBg, text: Colors.primary },
  Optional: { bg: '#F3F4F6', text: Colors.textSecondary },
  Doctor: { bg: '#E0F2FE', text: Colors.teal },
};

export default function RoutineScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'morning' | 'evening'>('morning');
  const items = tab === 'morning' ? MORNING : EVENING;
  const [done, setDone] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDone((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const doneCount = items.filter((i) => done[i.id]).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>My Routine</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Streak */}
        <View style={styles.streakCard}>
          <View style={styles.streakLeft}>
            <Text style={styles.streakFire}>🔥</Text>
            <View>
              <Text style={styles.streakCount}>{STREAK}-Day Streak!</Text>
              <Text style={styles.streakSub}>Keep it up</Text>
            </View>
          </View>
          <View style={styles.weekDots}>
            {WEEK_HISTORY.map((day, i) => (
              <View key={i} style={[styles.weekDot, {
                backgroundColor: day === 'complete' ? Colors.success : day === 'partial' ? Colors.warning : day === 'today' ? Colors.primary : '#E5E7EB',
              }]} />
            ))}
          </View>
        </View>

        {/* AM/PM Toggle */}
        <View style={styles.tabToggle}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab('morning'); }}
            android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}
            style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
          >
            {tab === 'morning' ? (
              <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.tabActive}>
                <Text style={styles.tabActiveText}>☀️ Morning</Text>
              </LinearGradient>
            ) : (
              <View style={styles.tabInactive}><Text style={styles.tabInactiveText}>☀️ Morning</Text></View>
            )}
          </Pressable>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab('evening'); }}
            android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}
            style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
          >
            {tab === 'evening' ? (
              <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.tabActive}>
                <Text style={styles.tabActiveText}>🌙 Evening</Text>
              </LinearGradient>
            ) : (
              <View style={styles.tabInactive}><Text style={styles.tabInactiveText}>🌙 Evening</Text></View>
            )}
          </Pressable>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{doneCount} of {items.length} done</Text>
            <Text style={styles.progressPct}>{Math.round(doneCount / items.length * 100)}%</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${(doneCount / items.length) * 100}%` }]} />
          </View>
        </View>

        {/* Items */}
        {items.map((item) => {
          const isDone = !!done[item.id];
          const tierStyle = TIER_COLOR[item.tier];
          return (
            <Pressable
              key={item.id}
              onPress={() => toggle(item.id)}
              android_ripple={{ color: 'rgba(124,58,237,0.06)' }}
              style={[styles.itemCard, isDone && styles.itemCardDone]}
            >
              <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                {isDone && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.itemTop}>
                  <Text style={[styles.itemName, isDone && styles.itemNameDone]}>{item.name}</Text>
                  <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg }]}>
                    <Text style={[styles.tierBadgeText, { color: tierStyle.text }]}>
                      {(item as any).doctorPrescribed ? '💊 ' : ''}{item.tier}
                    </Text>
                  </View>
                </View>
                <Text style={styles.itemInstructions}>{item.instructions}</Text>
                <Text style={styles.itemFreq}>{item.frequency}</Text>
              </View>
            </Pressable>
          );
        })}

        {doneCount === items.length && (
          <View style={styles.completeBanner}>
            <Text style={styles.completeBannerText}>🎉 {tab === 'morning' ? 'Morning' : 'Evening'} routine complete!</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.textPrimary },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  streakCard: { backgroundColor: Colors.cardBg, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderWidth: 1.5, borderColor: Colors.borderMid, ...Colors.shadow.small },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakFire: { fontSize: 28 },
  streakCount: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  streakSub: { fontSize: 11, color: Colors.textMuted },
  weekDots: { flexDirection: 'row', gap: 5 },
  weekDot: { width: 10, height: 10, borderRadius: 5 },
  tabToggle: { flexDirection: 'row', backgroundColor: Colors.cardBg, borderRadius: 16, padding: 4, marginBottom: 16, gap: 4, borderWidth: 1, borderColor: Colors.borderLight },
  tabActive: { height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  tabActiveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  tabInactive: { height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  tabInactiveText: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  progressSection: { marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  progressPct: { fontSize: 13, color: Colors.primary, fontWeight: '800' },
  progressBg: { height: 6, backgroundColor: Colors.borderLight, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  itemCard: { backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1.5, borderColor: Colors.borderLight, ...Colors.shadow.small },
  itemCardDone: { opacity: 0.7, borderColor: Colors.success + '40' },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  checkboxDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  itemName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  itemNameDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  tierBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  tierBadgeText: { fontSize: 10, fontWeight: '700' },
  itemInstructions: { fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  itemFreq: { fontSize: 10, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  completeBanner: { backgroundColor: '#F0FDF4', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#BBF7D0', marginTop: 8 },
  completeBannerText: { fontSize: 14, fontWeight: '700', color: Colors.success },
});
