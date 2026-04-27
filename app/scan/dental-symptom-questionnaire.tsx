import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';

const QUESTIONS = [
  { id: 'q1', text: 'Is the pain constant (present even without eating/drinking)?', weight: 2 },
  { id: 'q2', text: 'Does cold food or drink trigger or worsen the pain?', weight: 1 },
  { id: 'q3', text: 'Does hot food or drink trigger or worsen the pain?', weight: 2 },
  { id: 'q4', text: 'Do you feel pain when biting down?', weight: 1 },
  { id: 'q5', text: 'Is there visible swelling around the painful area?', weight: 3 },
  { id: 'q6', text: 'Have you noticed pus or discharge from your gums?', weight: 3 },
  { id: 'q7', text: 'Does the pain radiate to your ear, neck, or jaw?', weight: 2 },
  { id: 'q8', text: 'Have you had fever or chills in the last 24 hours?', weight: 3 },
  { id: 'q9', text: 'Has this pain been present for more than 3 days?', weight: 1 },
];

export default function DentalSymptomQuestionnaireScreen() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});

  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== undefined);
  const urgencyScore = QUESTIONS.reduce((sum, q) => {
    if (answers[q.id] === true) return sum + q.weight;
    return sum;
  }, 0);

  const handleContinue = () => {
    if (!allAnswered) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // High urgency → emergency screen
    if (urgencyScore >= 6) {
      router.push('/scan/emergency-dental');
    } else {
      router.push('/scan/dental-guide');
    }
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={['#0EA5E9', '#7C3AED']} style={styles.hero}>
          <View style={styles.heroTop}>
            <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }} style={styles.backBtn}>
              <Text style={{ fontSize: 22, color: '#fff' }}>‹</Text>
            </Pressable>
            <Text style={styles.heroTitle}>Pain Assessment</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.heroSub}>{answeredCount} of {QUESTIONS.length} answered</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(answeredCount / QUESTIONS.length) * 100}%` }]} />
          </View>
        </LinearGradient>

        <Text style={styles.intro}>Answer honestly — this helps us assess urgency and tailor your scan.</Text>

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

        {allAnswered && urgencyScore >= 6 && (
          <View style={styles.urgentCard}>
            <Text style={styles.urgentTitle}>⚠️ High Urgency Detected</Text>
            <Text style={styles.urgentText}>
              Your symptoms suggest a potentially serious dental condition. We recommend seeing a dentist immediately.
            </Text>
          </View>
        )}

        <Pressable
          onPress={handleContinue}
          disabled={!allAnswered}
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          style={{ borderRadius: 16, overflow: 'hidden', marginTop: 8, opacity: allAnswered ? 1 : 0.5 }}
        >
          <LinearGradient
            colors={allAnswered && urgencyScore >= 6 ? ['#EF4444', '#DC2626'] : ['#0EA5E9', '#A855F7']}
            style={styles.continueBtn}
          >
            <Text style={styles.continueBtnText}>
              {allAnswered && urgencyScore >= 6 ? '⚠️ View Urgent Advice' : 'Continue to Scan →'}
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
  hero: { paddingHorizontal: 20, paddingBottom: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 10 },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  intro: { fontSize: 14, color: Colors.textSecondary, margin: 20, lineHeight: 22 },
  questionCard: { marginHorizontal: 20, marginBottom: 14, backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight },
  questionNum: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  questionText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22, marginBottom: 14 },
  answerRow: { flexDirection: 'row', gap: 10 },
  answerBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  answerBtnYes: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  answerBtnNo: { backgroundColor: Colors.success, borderColor: Colors.success },
  answerBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  urgentCard: { marginHorizontal: 20, backgroundColor: '#FEF2F2', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#FECACA', marginBottom: 8 },
  urgentTitle: { fontSize: 14, fontWeight: '800', color: '#DC2626', marginBottom: 6 },
  urgentText: { fontSize: 12, color: '#7F1D1D', lineHeight: 20 },
  continueBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginHorizontal: 20 },
  continueBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
