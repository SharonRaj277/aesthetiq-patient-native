import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';

const POSITIONS = [
  { id: 'front', icon: '😁', label: 'Front View', desc: 'Show all front teeth, smile naturally' },
  { id: 'left', icon: '↙️', label: 'Left Side', desc: 'Turn your head slightly to the right' },
  { id: 'right', icon: '↘️', label: 'Right Side', desc: 'Turn your head slightly to the left' },
  { id: 'top', icon: '⬆️', label: 'Upper Teeth', desc: 'Tilt head back, show upper arch' },
  { id: 'bottom', icon: '⬇️', label: 'Lower Teeth', desc: 'Tilt chin up, show lower arch' },
  { id: 'bite', icon: '🤐', label: 'Bite View', desc: 'Close teeth together naturally' },
];

const PREP_STEPS = [
  { icon: '🪥', text: 'Brush and floss before scanning' },
  { icon: '💧', text: 'Rinse mouth with water' },
  { icon: '☀️', text: 'Scan in bright, natural light' },
  { icon: '📱', text: 'Hold phone steady at mouth level' },
];

export default function DentalScanGuideScreen() {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const allChecked = checked.size === PREP_STEPS.length;

  const toggle = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = new Set(checked);
    next.has(i) ? next.delete(i) : next.add(i);
    setChecked(next);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backBtn} android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Dental Scan Guide</Text>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/scan/camera', params: { type: 'dental' } }); }} android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 20 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.hero}>
          <Text style={{ fontSize: 48, marginBottom: 10 }}>🦷</Text>
          <Text style={styles.heroTitle}>Dental Analysis</Text>
          <Text style={styles.heroSubtitle}>We'll capture 6 angles for a complete oral health picture</Text>
        </LinearGradient>

        {/* Prep Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Before You Start</Text>
          <View style={{ gap: 8 }}>
            {PREP_STEPS.map((s, i) => (
              <Pressable key={i} onPress={() => toggle(i)} style={[styles.checkItem, checked.has(i) && styles.checkItemDone]} android_ripple={{ color: 'rgba(34,197,94,0.1)' }}>
                <View style={[styles.checkbox, checked.has(i) && styles.checkboxDone]}>
                  {checked.has(i) && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
                </View>
                <Text style={{ fontSize: 18, marginRight: 4 }}>{s.icon}</Text>
                <Text style={[styles.checkText, checked.has(i) && styles.checkTextDone]}>{s.text}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Capture Positions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6 Capture Positions</Text>
          <View style={styles.positionsGrid}>
            {POSITIONS.map((p) => (
              <View key={p.id} style={styles.positionCard}>
                <Text style={styles.positionIcon}>{p.icon}</Text>
                <Text style={styles.positionLabel}>{p.label}</Text>
                <Text style={styles.positionDesc}>{p.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: '/scan/camera', params: { type: 'dental' } }); }}
          android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
        >
          <LinearGradient colors={allChecked ? ['#22C55E', '#16A34A'] : ['#7C3AED', '#A855F7']} style={styles.ctaBtn}>
            <Text style={styles.ctaText}>🦷 Start Dental Scan</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  backIcon: { fontSize: 20, color: Colors.textPrimary, fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  skipText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  hero: { borderRadius: 24, padding: 24, alignItems: 'center', ...Colors.shadow.medium },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 8 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 20 },
  section: {},
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.cardBg, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: Colors.borderLight },
  checkItemDone: { borderColor: Colors.success, backgroundColor: Colors.successBg },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  checkText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  checkTextDone: { color: Colors.success, textDecorationLine: 'line-through' },
  positionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  positionCard: { width: '47%', backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.borderLight, alignItems: 'center', gap: 4 },
  positionIcon: { fontSize: 28, marginBottom: 4 },
  positionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  positionDesc: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', lineHeight: 14 },
  ctaBtn: { borderRadius: 18, height: 56, alignItems: 'center', justifyContent: 'center', ...Colors.shadow.medium },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
