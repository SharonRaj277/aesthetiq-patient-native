import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';

const QUESTIONS = [
  { id: 'q1', text: 'Do you have any open wounds or active bleeding on your face?', risk: true },
  { id: 'q2', text: 'Do you have an active skin infection (impetigo, cellulitis, cold sore)?', risk: true },
  { id: 'q3', text: 'Have you applied heavy makeup or sunscreen in the last hour?', risk: false },
  { id: 'q4', text: 'Are you in direct sunlight right now?', risk: false },
];

export default function SkinPrecheckScreen() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});

  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== undefined);
  const hasRisk = QUESTIONS.some((q) => q.risk && answers[q.id] === true);

  const handleContinue = () => {
    if (!allAnswered) { Alert.alert('Please Answer All', 'Answer all questions before continuing.'); return; }
    if (hasRisk) {
      Alert.alert(
        '⚠️ Caution',
        'One or more responses may affect your scan accuracy. Do you wish to continue anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue Anyway', onPress: () => router.push('/scan/skin-environment') },
        ],
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/scan/skin-environment');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={['#EC4899', '#A855F7']} style={styles.heroHeader}>
          <View style={styles.heroTop}>
            <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }} style={styles.backBtn}>
              <Text style={{ fontSize: 22, color: '#fff' }}>‹</Text>
            </Pressable>
            <Text style={styles.heroTitle}>🧖 Skin Scan</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.heroSub}>Pre-scan safety check</Text>
        </LinearGradient>

        <Text style={styles.intro}>
          Please answer honestly to ensure safe and accurate skin analysis.
        </Text>

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
          onPress={handleContinue}
          disabled={!allAnswered}
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          style={{ borderRadius: 16, overflow: 'hidden', marginTop: 8, opacity: allAnswered ? 1 : 0.5 }}
        >
          <LinearGradient colors={['#EC4899', '#A855F7']} style={styles.continueBtn}>
            <Text style={styles.continueBtnText}>Continue →</Text>
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
  heroHeader: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 0 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 8 },
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
  continueBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  continueBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
