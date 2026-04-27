import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';

const QUESTIONS = [
  { id: 'q1', text: 'Are you currently pregnant or breastfeeding?', blocks: true },
  { id: 'q2', text: 'Do you have any known allergies to topical agents or injectables?', blocks: false },
  { id: 'q3', text: 'Have you had any cosmetic procedures in the last 3 months?', blocks: false },
  { id: 'q4', text: 'Do you have any active skin infections or open wounds in the target area?', blocks: true },
  { id: 'q5', text: 'Are you currently on blood thinners or immunosuppressants?', blocks: false },
];

type Result = 'safe' | 'caution' | 'blocked';

export default function SuitabilityCheckScreen() {
  const router = useRouter();
  const { treatmentId, treatmentName } = useLocalSearchParams<{ treatmentId: string; treatmentName: string }>();
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [result, setResult] = useState<Result | null>(null);

  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== undefined);

  const evaluate = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const blocked = QUESTIONS.some((q) => q.blocks && answers[q.id] === true);
    const caution = QUESTIONS.some((q) => !q.blocks && answers[q.id] === true);
    if (blocked) setResult('blocked');
    else if (caution) setResult('caution');
    else setResult('safe');
  };

  if (result) {
    const configs = {
      safe: {
        gradient: ['#22C55E', '#16A34A'] as [string, string],
        icon: '✅',
        title: 'You\'re Suitable',
        subtitle: 'Based on your answers, you appear to be a good candidate for this treatment.',
        btnLabel: 'Book Consultation →',
        btnAction: () => router.push('/care/consult-doctor'),
      },
      caution: {
        gradient: ['#F59E0B', '#D97706'] as [string, string],
        icon: '⚠️',
        title: 'Proceed with Caution',
        subtitle: 'Some of your responses suggest you should consult a doctor before proceeding.',
        btnLabel: 'Talk to a Doctor →',
        btnAction: () => router.push('/care/consult-doctor'),
      },
      blocked: {
        gradient: ['#EF4444', '#DC2626'] as [string, string],
        icon: '🚫',
        title: 'Not Suitable Right Now',
        subtitle: 'Based on your responses, this treatment is not recommended at this time. Please consult your doctor.',
        btnLabel: 'Go Back',
        btnAction: () => router.back(),
      },
    };
    const cfg = configs[result];

    return (
      <LinearGradient colors={cfg.gradient} style={{ flex: 1 }}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.resultContainer}>
            <Text style={styles.resultIcon}>{cfg.icon}</Text>
            <Text style={styles.resultTitle}>{cfg.title}</Text>
            {treatmentName ? (
              <Text style={styles.treatmentBadge}>{treatmentName}</Text>
            ) : null}
            <Text style={styles.resultSubtitle}>{cfg.subtitle}</Text>

            <Pressable
              onPress={cfg.btnAction}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              style={styles.resultBtn}
            >
              <Text style={[styles.resultBtnText, { color: result === 'blocked' ? '#DC2626' : result === 'caution' ? '#D97706' : '#22C55E' }]}>
                {cfg.btnLabel}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={{ paddingTop: 16 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' }}>← Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.hero}>
          <View style={styles.heroTop}>
            <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }} style={styles.backBtn}>
              <Text style={{ fontSize: 22, color: '#fff' }}>‹</Text>
            </Pressable>
            <Text style={styles.heroTitle}>Suitability Check</Text>
            <View style={{ width: 40 }} />
          </View>
          {treatmentName ? <Text style={styles.heroSub}>For: {treatmentName}</Text> : null}
        </LinearGradient>

        <Text style={styles.intro}>Please answer a few quick questions to check if this treatment is right for you.</Text>

        {QUESTIONS.map((q, i) => (
          <View key={q.id} style={styles.questionCard}>
            <Text style={styles.questionNum}>Q{i + 1}</Text>
            <Text style={styles.questionText}>{q.text}</Text>
            <View style={styles.answerRow}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAnswers((p) => ({ ...p, [q.id]: true })); }}
                android_ripple={{ color: 'rgba(239,68,68,0.1)', borderless: true }}
                style={[styles.answerBtn, answers[q.id] === true && styles.answerBtnYes]}
              >
                <Text style={[styles.answerBtnText, answers[q.id] === true && { color: '#fff' }]}>Yes</Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAnswers((p) => ({ ...p, [q.id]: false })); }}
                android_ripple={{ color: 'rgba(34,197,94,0.1)', borderless: true }}
                style={[styles.answerBtn, answers[q.id] === false && styles.answerBtnNo]}
              >
                <Text style={[styles.answerBtnText, answers[q.id] === false && { color: '#fff' }]}>No</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Pressable
          onPress={evaluate}
          disabled={!allAnswered}
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          style={{ borderRadius: 16, overflow: 'hidden', marginTop: 8, opacity: allAnswered ? 1 : 0.5 }}
        >
          <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.continueBtn}>
            <Text style={styles.continueBtnText}>Check Suitability →</Text>
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
  hero: { paddingHorizontal: 20, paddingBottom: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 6 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  intro: { fontSize: 14, color: Colors.textSecondary, margin: 20, lineHeight: 22 },
  questionCard: { marginHorizontal: 20, marginBottom: 14, backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight },
  questionNum: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  questionText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22, marginBottom: 14 },
  answerRow: { flexDirection: 'row', gap: 10 },
  answerBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  answerBtnYes: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  answerBtnNo: { backgroundColor: Colors.success, borderColor: Colors.success },
  answerBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  continueBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginHorizontal: 20 },
  continueBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  resultContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 40 },
  resultIcon: { fontSize: 72, marginBottom: 20 },
  resultTitle: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 10 },
  treatmentBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 12 },
  resultSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  resultBtn: { width: '100%', backgroundColor: '#fff', borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center' },
  resultBtnText: { fontSize: 16, fontWeight: '800' },
});
