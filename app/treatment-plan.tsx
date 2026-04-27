import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { MOCK_PLANS, MOCK_TREATMENT_PROGRESS } from '../constants/mockData';
import AvatarCircle from '../components/AvatarCircle';
import { useLivePlan } from '../hooks/useLivePlan';
import { useAuth } from '../hooks/useAuth';

const PHASE_STATUS_CONFIG = {
  completed: { color: Colors.success, bg: '#F0FDF4', icon: '✅', border: Colors.success },
  current: { color: Colors.primary, bg: Colors.primaryBg, icon: '⏳', border: Colors.primary },
  upcoming: { color: Colors.textMuted, bg: '#F9FAFB', icon: '○', border: Colors.borderLight },
};

export default function TreatmentPlanScreen() {
  const router = useRouter();
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  // Live plan from Firestore
  const { user } = useAuth();
  const { plan: livePlan, loading: planLoading } = useLivePlan(user?.uid ?? null);

  const mockPlan = MOCK_PLANS[0];
  const plan = mockPlan; // phases/progress still from mock; header uses live data when available
  const progress = MOCK_TREATMENT_PROGRESS.filter((tp) => tp.status === 'active');

  // Prefer live data for header fields
  const displayPlanName   = livePlan ? `${livePlan.doctorName}'s Plan` : plan.planName;
  const displayDoctorName = livePlan?.doctorName ?? plan.doctorName;
  const displayDoctorSpec = livePlan?.doctorSpec  ?? '';

  const completedPhases = plan.phases.filter((p) => p.status === 'completed').length;
  const totalPhases = plan.phases.length;
  const progressPct = Math.round((completedPhases / totalPhases) * 100);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Treatment Plan</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Plan Header Card */}
        <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.planHeader}>
          <View style={styles.planNameRow}>
            <Text style={styles.planName}>{displayPlanName}</Text>
            {planLoading && <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" style={{ marginLeft: 8 }} />}
          </View>
          <View style={styles.planMeta}>
            <AvatarCircle name={displayDoctorName} size={36} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.prescribedBy}>Prescribed by</Text>
              <Text style={styles.planDoctor}>{displayDoctorName}</Text>
              {!!displayDoctorSpec && <Text style={styles.planDoctorSpec}>{displayDoctorSpec}</Text>}
            </View>
          </View>
          <View style={styles.planProgress}>
            <View style={styles.planProgressHeader}>
              <Text style={styles.planProgressLabel}>{progressPct}% Complete</Text>
              <Text style={styles.planProgressSub}>{completedPhases} of {totalPhases} phases done</Text>
            </View>
            <View style={styles.planProgressBg}>
              <View style={[styles.planProgressFill, { width: `${progressPct}%` }]} />
            </View>
          </View>
        </LinearGradient>

        {/* Active Treatments */}
        {progress.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Active Treatments</Text>
            {progress.map((tp) => (
              <View key={tp.id} style={styles.activeTreatCard}>
                <View style={styles.activeTreatTop}>
                  <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.treatIcon}>
                    <Text style={{ fontSize: 20 }}>✨</Text>
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.treatName}>{tp.treatmentName}</Text>
                    <Text style={styles.treatDoctor}>{tp.doctorName}</Text>
                  </View>
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                </View>
                <View style={styles.sessionRow}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionNum}>{tp.sessionsCompleted}/{tp.sessionsTotal}</Text>
                    <Text style={styles.sessionLabel}>Sessions</Text>
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionNum}>{tp.nextSessionDate}</Text>
                    <Text style={styles.sessionLabel}>Next Session</Text>
                  </View>
                </View>
                <View style={styles.sessionProgressBg}>
                  <View style={[styles.sessionProgressFill, { width: `${(tp.sessionsCompleted / tp.sessionsTotal) * 100}%` }]} />
                </View>
                {tp.notes && <Text style={styles.treatNotes}>"{tp.notes}"</Text>}
              </View>
            ))}
          </>
        )}

        {/* Phases */}
        <Text style={styles.sectionTitle}>Treatment Phases</Text>
        {plan.phases.map((phase) => {
          const config = PHASE_STATUS_CONFIG[phase.status];
          const isExpanded = expandedPhase === phase.id;
          return (
            <Pressable
              key={phase.id}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpandedPhase(isExpanded ? null : phase.id); }}
              android_ripple={{ color: 'rgba(124,58,237,0.06)' }}
              style={[styles.phaseCard, { borderLeftColor: config.border, backgroundColor: config.bg }]}
            >
              <View style={styles.phaseTop}>
                <Text style={styles.phaseIcon}>{config.icon}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.phaseLabel, { color: config.color }]}>{phase.label}</Text>
                  <Text style={styles.phaseDate}>{phase.date}</Text>
                </View>
                <Text style={{ fontSize: 16, color: Colors.textMuted }}>{isExpanded ? '↑' : '↓'}</Text>
              </View>
              {isExpanded && (
                <View style={styles.phaseExpanded}>
                  <Text style={styles.phaseDesc}>{phase.description}</Text>
                  {phase.status === 'current' && (
                    <Pressable
                      onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                      android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
                      style={{ borderRadius: 12, overflow: 'hidden', marginTop: 10 }}
                    >
                      <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.markCompleteBtn}>
                        <Text style={styles.markCompleteBtnText}>Mark as Complete</Text>
                      </LinearGradient>
                    </Pressable>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.textPrimary },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  planHeader: { marginHorizontal: 20, borderRadius: 24, padding: 20, marginBottom: 4 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  planName: { fontSize: 18, fontWeight: '900', color: '#fff' },
  planMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  prescribedBy: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  planDoctor: { fontSize: 13, color: '#fff', fontWeight: '700' },
  planDoctorSpec: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  planProgress: {},
  planProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  planProgressLabel: { fontSize: 14, fontWeight: '800', color: '#fff' },
  planProgressSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  planProgressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  planProgressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  activeTreatCard: { marginHorizontal: 20, backgroundColor: Colors.cardBg, borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: Colors.borderMid, marginBottom: 12, ...Colors.shadow.small },
  activeTreatTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  treatIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  treatName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  treatDoctor: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  activeBadge: { backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  sessionRow: { flexDirection: 'row', gap: 20, marginBottom: 10 },
  sessionInfo: { alignItems: 'flex-start' },
  sessionNum: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  sessionLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginTop: 1 },
  sessionProgressBg: { height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  sessionProgressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  treatNotes: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 18 },
  phaseCard: { marginHorizontal: 20, borderRadius: 18, padding: 16, marginBottom: 10, borderLeftWidth: 4, borderWidth: 1.5, borderColor: Colors.borderLight },
  phaseTop: { flexDirection: 'row', alignItems: 'center' },
  phaseIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  phaseLabel: { fontSize: 14, fontWeight: '800' },
  phaseDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  phaseExpanded: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  phaseDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  markCompleteBtn: { height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  markCompleteBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
