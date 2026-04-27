import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';

const SYMPTOMS = [
  { id: 'c1', emoji: '😬', label: 'Tooth Pain or Sensitivity', hasPain: true },
  { id: 'c2', emoji: '🩸', label: 'Bleeding Gums', hasPain: false },
  { id: 'c3', emoji: '💧', label: 'Dry Mouth', hasPain: false },
  { id: 'c4', emoji: '😮', label: 'Mouth Sores or Ulcers', hasPain: false },
  { id: 'c5', emoji: '🦷', label: 'Loose or Broken Tooth', hasPain: false },
  { id: 'c6', emoji: '😷', label: 'Bad Breath (Persistent)', hasPain: false },
  { id: 'c7', emoji: '🫦', label: 'Swollen Jaw or Face', hasPain: true },
  { id: 'c8', emoji: '✅', label: 'No symptoms — routine check', hasPain: false },
];

export default function DentalPrecheckScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => {
      const next = new Set(prev);
      if (id === 'c8') {
        // Routine check: deselect everything else
        return new Set(['c8']);
      }
      // If selecting something else, remove 'no symptoms'
      next.delete('c8');
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasPainSymptom = SYMPTOMS.some((s) => s.hasPain && selected.has(s.id));
  const hasSwelling = selected.has('c7');

  const handleContinue = () => {
    if (selected.size === 0) {
      Alert.alert('Select Symptoms', 'Please select at least one option to continue.');
      return;
    }
    if (hasSwelling) {
      Alert.alert(
        '⚠️ Urgent Concern',
        'Swollen jaw or face may require immediate dental attention. Consider visiting a dentist in person.',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Continue Scan', onPress: () => router.push('/scan/emergency-dental') },
        ],
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (hasPainSymptom) {
      router.push('/scan/dental-pain-locator');
    } else {
      router.push('/scan/dental-guide');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={['#0EA5E9', '#A855F7']} style={styles.hero}>
          <View style={styles.heroTop}>
            <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }} style={styles.backBtn}>
              <Text style={{ fontSize: 22, color: '#fff' }}>‹</Text>
            </Pressable>
            <Text style={styles.heroTitle}>🦷 Dental Scan</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.heroSub}>Tell us about any current symptoms</Text>
        </LinearGradient>

        <Text style={styles.intro}>Select all that apply right now:</Text>

        {SYMPTOMS.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => toggle(s.id)}
            android_ripple={{ color: 'rgba(14,165,233,0.08)' }}
            style={[styles.symptomItem, selected.has(s.id) && styles.symptomItemActive]}
          >
            <View style={[styles.checkbox, selected.has(s.id) && styles.checkboxActive]}>
              {selected.has(s.id) && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
            </View>
            <Text style={styles.symptomEmoji}>{s.emoji}</Text>
            <Text style={[styles.symptomLabel, selected.has(s.id) && styles.symptomLabelActive]}>
              {s.label}
            </Text>
            {s.hasPain && (
              <View style={styles.urgentTag}>
                <Text style={styles.urgentTagText}>Pain</Text>
              </View>
            )}
          </Pressable>
        ))}

        {hasPainSymptom && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📍 Pain Location Needed</Text>
            <Text style={styles.infoText}>
              Since you reported pain, we'll ask you to locate it on a jaw diagram next.
            </Text>
          </View>
        )}

        <Pressable
          onPress={handleContinue}
          disabled={selected.size === 0}
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          style={{ borderRadius: 16, overflow: 'hidden', marginTop: 8, opacity: selected.size > 0 ? 1 : 0.5 }}
        >
          <LinearGradient colors={['#0EA5E9', '#A855F7']} style={styles.continueBtn}>
            <Text style={styles.continueBtnText}>
              {hasPainSymptom ? 'Locate Pain →' : 'Continue →'}
            </Text>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 20 },
  hero: { paddingHorizontal: 20, paddingBottom: 24 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  intro: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginHorizontal: 20, marginTop: 20, marginBottom: 12 },
  symptomItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1.5, borderColor: Colors.borderLight },
  symptomItemActive: { borderColor: '#0EA5E9', backgroundColor: '#F0F9FF' },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  symptomEmoji: { fontSize: 20 },
  symptomLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  symptomLabelActive: { color: '#0369A1', fontWeight: '700' },
  urgentTag: { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  urgentTagText: { fontSize: 10, fontWeight: '800', color: '#DC2626' },
  infoCard: { marginHorizontal: 20, backgroundColor: '#EFF6FF', borderRadius: 16, padding: 14, marginTop: 4, marginBottom: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  infoTitle: { fontSize: 13, fontWeight: '800', color: '#1D4ED8', marginBottom: 4 },
  infoText: { fontSize: 12, color: '#3B82F6', lineHeight: 18 },
  continueBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginHorizontal: 20 },
  continueBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
