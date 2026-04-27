import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { useHealthProfile } from '../../context/HealthProfileContext';

// ─── Questions ────────────────────────────────────────────────────
const QUESTIONS = [
  { id: 'q1', label: 'Are you currently pregnant?' },
  { id: 'q2', label: 'Are you currently breastfeeding?' },
  { id: 'q3', label: 'Do you have any metal implants or a pacemaker?' },
  { id: 'q4', label: 'Are you on blood thinners or anticoagulants?' },
  { id: 'q5', label: 'Have you been diagnosed with cancer or are on active treatment?' },
] as const;

// ─── Screen ───────────────────────────────────────────────────────
export default function HealthQuickCheckScreen() {
  const router  = useRouter();
  const params  = useLocalSearchParams<{ next?: string; from?: string }>();
  const fromProfile = (Array.isArray(params.from) ? params.from[0] : params.from) === 'profile';
  const destination =
    (Array.isArray(params.next) ? params.next[0] : params.next) || '/scan/type-selection';

  const { healthProfile, updateHealthProfile } = useHealthProfile();
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== undefined);
  const hasHardBlock = QUESTIONS.some((q) => answers[q.id] === true);

  const pick = (id: string, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleConfirm = async () => {
    if (!allAnswered) return;

    // cancer is stored in conditions[] not as a boolean field
    const conditionsList = [...(healthProfile?.conditions ?? [])];
    if (answers['q5'] === true) {
      if (!conditionsList.includes('cancer')) conditionsList.push('cancer');
    } else {
      const i = conditionsList.indexOf('cancer');
      if (i !== -1) conditionsList.splice(i, 1);
    }

    const updatedProfile = {
      ...(healthProfile ?? {}),
      pregnant:           answers['q1'] === true,
      breastfeeding:      answers['q2'] === true,
      hasImplantedDevice: answers['q3'] === true,
      onBloodThinners:    answers['q4'] === true,
      conditions:         conditionsList,
    };

    try {
      await updateHealthProfile(updatedProfile);
    } catch (e) {
      console.error('Health profile save error:', e);
      // Don't block scan on save error
    }

    if (hasHardBlock) {
      Alert.alert(
        '⚠️ Medical Advisory',
        'One or more of your responses indicates a condition that may require medical clearance before scanning. We recommend consulting your doctor first.',
        [
          { text: 'Go Back', style: 'cancel' },
          {
            text: 'Continue Anyway',
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              if (fromProfile) router.back(); else router.push(destination as any);
            },
          },
        ]
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (fromProfile) router.back(); else router.push(destination as any);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero Header ── */}
        <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.heroHeader}>
          <View style={styles.heroTop}>
            <Pressable
              onPress={() => router.back()}
              android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
              style={styles.backBtn}
            >
              <Text style={styles.backArrow}>‹</Text>
            </Pressable>
            <Text style={styles.heroTitle}>🛡️ Quick Health Check</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.heroSub}>A few quick questions before your scan</Text>
        </LinearGradient>

        {/* ── Intro ── */}
        <Text style={styles.intro}>
          Your safety is our priority. Please answer honestly — your responses help us ensure
          the scan is appropriate for your current health status.
        </Text>

        {/* ── Question Cards ── */}
        {QUESTIONS.map((q, i) => (
          <View key={q.id} style={styles.questionCard}>
            <Text style={styles.questionNum}>Q{i + 1}</Text>
            <Text style={styles.questionText}>{q.label}</Text>
            <View style={styles.answerRow}>
              <Pressable
                onPress={() => pick(q.id, true)}
                android_ripple={{ color: 'rgba(239,68,68,0.15)' }}
                style={[
                  styles.answerBtn,
                  answers[q.id] === true && styles.answerBtnYes,
                ]}
              >
                <Text style={[
                  styles.answerBtnText,
                  answers[q.id] === true && styles.answerBtnTextSelected,
                ]}>
                  Yes
                </Text>
              </Pressable>
              <Pressable
                onPress={() => pick(q.id, false)}
                android_ripple={{ color: 'rgba(34,197,94,0.15)' }}
                style={[
                  styles.answerBtn,
                  answers[q.id] === false && styles.answerBtnNo,
                ]}
              >
                <Text style={[
                  styles.answerBtnText,
                  answers[q.id] === false && styles.answerBtnTextSelected,
                ]}>
                  No
                </Text>
              </Pressable>
            </View>
          </View>
        ))}

        {/* ── Continue Button ── */}
        <Pressable
          onPress={handleConfirm}
          disabled={!allAnswered}
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          style={[styles.continuePressable, { opacity: allAnswered ? 1 : 0.45 }]}
        >
          <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.continueBtn}>
            <Text style={styles.continueBtnText}>Confirm & Continue →</Text>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 20 },

  heroHeader: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 0 },
  heroTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 12, marginBottom: 8,
  },
  backBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow:  { fontSize: 28, color: '#fff' },
  heroTitle:  { fontSize: 17, fontWeight: '800', color: '#fff' },
  heroSub:    { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

  intro: {
    fontSize: 14, color: Colors.textSecondary, lineHeight: 22,
    margin: 20, marginBottom: 8,
  },

  questionCard: {
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16,
    borderWidth: 1.5, borderColor: Colors.borderLight,
    ...Colors.shadow.small,
  },
  questionNum: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  questionText: {
    fontSize: 14, fontWeight: '600', color: Colors.textPrimary,
    lineHeight: 22, marginBottom: 14,
  },

  answerRow: { flexDirection: 'row', gap: 10 },
  answerBtn: {
    flex: 1, height: 44, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.cardBg,
  },
  answerBtnYes: { backgroundColor: Colors.danger,  borderColor: Colors.danger  },
  answerBtnNo:  { backgroundColor: Colors.success, borderColor: Colors.success },
  answerBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  answerBtnTextSelected: { color: '#fff' },

  continuePressable: { marginHorizontal: 20, marginTop: 8, borderRadius: 16, overflow: 'hidden' },
  continueBtn:       { height: 52, alignItems: 'center', justifyContent: 'center' },
  continueBtnText:   { fontSize: 16, fontWeight: '800', color: '#fff' },
});
