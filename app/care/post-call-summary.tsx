import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { MOCK_APPOINTMENTS, MOCK_TREATMENTS } from '../../constants/mockData';
import AvatarCircle from '../../components/AvatarCircle';

export default function PostCallSummaryScreen() {
  const router = useRouter();
  const { apptId } = useLocalSearchParams<{ apptId?: string }>();
  const appt = MOCK_APPOINTMENTS.find((a) => a.id === apptId) ?? MOCK_APPOINTMENTS[1];

  const decision = appt.doctorDecision;
  const decisionConfig = {
    approved: { color: Colors.success, bg: '#F0FDF4', emoji: '✅', label: 'Approved' },
    modified: { color: Colors.warning, bg: '#FFFBEB', emoji: '⚠️', label: 'Modified Plan' },
    alternative: { color: Colors.danger, bg: '#FEF2F2', emoji: '❌', label: 'Alternative Suggested' },
  }[decision ?? 'approved'];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Consultation Summary</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Doctor Info */}
        <View style={styles.doctorCard}>
          <AvatarCircle name={appt.doctorName} size={52} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.docName}>{appt.doctorName}</Text>
            <Text style={styles.docSpec}>{appt.doctorSpecialization}</Text>
            <Text style={styles.apptDate}>
              {appt.slotTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Doctor Decision */}
        {decision && (
          <View style={[styles.decisionCard, { backgroundColor: decisionConfig.bg, borderColor: decisionConfig.color + '40' }]}>
            <Text style={styles.decisionEmoji}>{decisionConfig.emoji}</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.decisionLabel, { color: decisionConfig.color }]}>{decisionConfig.label}</Text>
              <Text style={styles.decisionSub}>
                {decision === 'approved' ? 'Your requested treatment has been approved by the doctor.' :
                 decision === 'modified' ? 'The doctor has suggested a modified treatment plan.' :
                 'The doctor recommends an alternative approach.'}
              </Text>
            </View>
          </View>
        )}

        {/* Doctor Notes */}
        {appt.notes && (
          <>
            <Text style={styles.sectionTitle}>Doctor's Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesLabel}>Observations & Recommendations</Text>
              <Text style={styles.notesText}>{appt.notes}</Text>
            </View>
          </>
        )}

        {/* Treatment Info */}
        <Text style={styles.sectionTitle}>Treatment</Text>
        <View style={styles.treatCard}>
          <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.treatGradient}>
            <Text style={{ fontSize: 28 }}>✨</Text>
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.treatName}>{appt.treatmentName}</Text>
            <Text style={styles.treatFee}>₹{appt.fee.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Next Steps */}
        <Text style={styles.sectionTitle}>Next Steps</Text>
        <View style={styles.stepsCard}>
          {[
            { emoji: '📅', text: 'Schedule your next session based on doctor\'s recommendation' },
            { emoji: '💊', text: 'Follow the prescribed aftercare routine diligently' },
            { emoji: '📊', text: 'Complete your next scan in 30 days to track progress' },
          ].map((step, i) => (
            <View key={i} style={[styles.stepRow, i > 0 && styles.stepBorder]}>
              <Text style={styles.stepEmoji}>{step.emoji}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: '/care/rating', params: { apptId: appt.id, doctorId: appt.doctorId } }); }}
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          style={{ borderRadius: 16, overflow: 'hidden', marginTop: 8 }}
        >
          <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.rateBtn}>
            <Text style={styles.rateBtnText}>⭐  Rate Your Experience</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/care/consult-doctor'); }}
          android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
          style={styles.followUpBtn}
        >
          <Text style={styles.followUpBtnText}>Book Follow-up</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.textPrimary },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  doctorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight, marginBottom: 14, ...Colors.shadow.small },
  docName: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  docSpec: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  apptDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  decisionCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 18, padding: 16, borderWidth: 1.5, marginBottom: 4 },
  decisionEmoji: { fontSize: 28, marginTop: 2 },
  decisionLabel: { fontSize: 16, fontWeight: '800' },
  decisionSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginTop: 20, marginBottom: 10 },
  notesCard: { backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight },
  notesLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  notesText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  treatCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight },
  treatGradient: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  treatName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  treatFee: { fontSize: 13, color: Colors.primary, fontWeight: '700', marginTop: 4 },
  stepsCard: { backgroundColor: Colors.cardBg, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.borderLight, overflow: 'hidden' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  stepBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  stepEmoji: { fontSize: 18, marginTop: 1 },
  stepText: { fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
  rateBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  rateBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  followUpBtn: { height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  followUpBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
});
