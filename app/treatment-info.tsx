import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { MOCK_TREATMENTS, MOCK_DOCTORS } from '../constants/mockData';
import AvatarCircle from '../components/AvatarCircle';

const TIER_CONFIG: Record<number, { label: string; color: string; emoji: string }> = {
  1: { label: 'Generally Safe', color: Colors.success, emoji: '🟢' },
  2: { label: 'Assessment Required', color: Colors.warning, emoji: '🟡' },
  3: { label: 'Doctor Only', color: Colors.danger, emoji: '🔴' },
};

export default function TreatmentInfoScreen() {
  const router = useRouter();
  const { treatmentId } = useLocalSearchParams<{ treatmentId?: string }>();
  const [expanded, setExpanded] = useState(false);

  const treatment = MOCK_TREATMENTS.find((t) => t.id === treatmentId) ?? MOCK_TREATMENTS[0];
  const tier = TIER_CONFIG[treatment.tier];
  const specialists = MOCK_DOCTORS.filter((d) => treatment.specialists.includes(d.id));

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Gradient Hero */}
        <LinearGradient colors={treatment.gradient} style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <View style={styles.heroTop}>
              <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }} style={styles.backBtn}>
                <Text style={{ fontSize: 22, color: '#fff' }}>‹</Text>
              </Pressable>
              <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
                <Text style={styles.tierBadgeText}>{tier.emoji} {tier.label}</Text>
              </View>
            </View>
            <Text style={styles.heroEmoji}>{treatment.icon}</Text>
            <Text style={styles.heroName}>{treatment.name}</Text>
            <Text style={styles.heroTagline}>{treatment.tagline}</Text>
          </SafeAreaView>
        </LinearGradient>

        {/* AI Match Banner */}
        {treatment.aiMatchScore && (
          <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.matchBanner}>
            <Text style={styles.matchText}>🤖  AI Match: {treatment.aiMatchScore}%</Text>
            <Text style={styles.matchSub}>Based on your latest scan results</Text>
          </LinearGradient>
        )}

        <View style={styles.content}>
          {/* About */}
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <Text style={styles.aboutText} numberOfLines={expanded ? undefined : 3}>
              {treatment.about}
            </Text>
            <Pressable onPress={() => setExpanded(!expanded)} android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}>
              <Text style={styles.showMore}>{expanded ? 'Show less ↑' : 'Show more ↓'}</Text>
            </Pressable>
          </View>

          {/* What to Expect */}
          <Text style={styles.sectionTitle}>What to Expect</Text>
          <View style={styles.card}>
            {[
              { label: 'Duration', value: treatment.duration, icon: '⏱️' },
              { label: 'Sessions', value: `${treatment.sessions} sessions recommended`, icon: '🔄' },
              { label: 'Results', value: treatment.results, icon: '✨' },
              { label: 'Pricing', value: 'Available after doctor consultation', icon: '🔒' },
            ].map((item, i) => (
              <View key={item.label} style={[styles.expectRow, i > 0 && styles.expectBorder]}>
                <Text style={styles.expectIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expectLabel}>{item.label}</Text>
                  <Text style={styles.expectValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Suitable For */}
          <Text style={styles.sectionTitle}>Suitable For</Text>
          <View style={styles.chipWrap}>
            {treatment.suitableFor.map((s) => (
              <View key={s} style={styles.greenChip}>
                <Text style={styles.greenChipText}>✓  {s}</Text>
              </View>
            ))}
          </View>

          {/* Not Suitable If */}
          <Text style={styles.sectionTitle}>Not Suitable If</Text>
          <View style={styles.chipWrap}>
            {treatment.notSuitableIf.map((s) => (
              <View key={s} style={styles.amberChip}>
                <Text style={styles.amberChipText}>⚠  {s}</Text>
              </View>
            ))}
          </View>

          {/* Side Effects */}
          <Text style={styles.sectionTitle}>Possible Side Effects</Text>
          <View style={styles.card}>
            {treatment.sideEffects.map((s, i) => (
              <View key={i} style={[styles.sideEffectRow, i > 0 && styles.expectBorder]}>
                <View style={styles.sideEffectDot} />
                <Text style={styles.sideEffectText}>{s}</Text>
              </View>
            ))}
          </View>

          {/* Aftercare */}
          <Text style={styles.sectionTitle}>Aftercare</Text>
          <View style={styles.card}>
            {treatment.aftercare.map((a, i) => (
              <View key={i} style={[styles.sideEffectRow, i > 0 && styles.expectBorder]}>
                <Text style={{ fontSize: 14 }}>💧</Text>
                <Text style={styles.sideEffectText}>{a}</Text>
              </View>
            ))}
          </View>

          {/* Specialists */}
          {specialists.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Available Specialists</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {specialists.map((doc) => (
                  <Pressable
                    key={doc.id}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/care/doctor-profile', params: { doctorId: doc.id } }); }}
                    android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
                    style={styles.specialistCard}
                  >
                    <AvatarCircle name={doc.name} size={48} onlineDot={doc.isOnline} />
                    <Text style={styles.specName} numberOfLines={1}>{doc.name}</Text>
                    <Text style={styles.specSpec} numberOfLines={1}>{doc.specialization}</Text>
                    <Text style={styles.specFee}>₹{doc.fee.toLocaleString('en-IN')}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomCta}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: '/suitability-check', params: { treatmentId: treatment.id } }); }}
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={treatment.tier <= 2 ? ['#7C3AED', '#A855F7'] : [Colors.danger, '#F87171']}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnText}>
              {treatment.tier <= 2 ? 'Check My Suitability' : 'Consult a Doctor First'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 32, alignItems: 'center' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tierBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  tierBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  heroEmoji: { fontSize: 56, marginBottom: 8 },
  heroName: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center' },
  heroTagline: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center' },
  matchBanner: { marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 14, alignItems: 'center' },
  matchText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  matchSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight, ...Colors.shadow.small },
  aboutText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  showMore: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 8 },
  expectRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 12 },
  expectBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  expectIcon: { fontSize: 18, marginTop: 1 },
  expectLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  expectValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', marginTop: 2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  greenChip: { backgroundColor: '#F0FDF4', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#BBF7D0' },
  greenChipText: { fontSize: 12, color: '#15803D', fontWeight: '600' },
  amberChip: { backgroundColor: '#FFFBEB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#FDE68A' },
  amberChipText: { fontSize: 12, color: '#B45309', fontWeight: '600' },
  sideEffectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  sideEffectDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.warning, flexShrink: 0 },
  sideEffectText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  specialistCard: { width: 130, backgroundColor: Colors.cardBg, borderRadius: 18, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.borderLight },
  specName: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  specSpec: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  specFee: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(248,247,255,0.95)', padding: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: Colors.borderLight, flexDirection: 'row' },
  ctaBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  ctaBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
