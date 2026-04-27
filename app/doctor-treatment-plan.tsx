/**
 * Doctor Treatment Plan Screen
 *
 * Phase 1 — ai_only:      AI suggestions shown, nudge to consult
 * Phase 2 — plan_pending: Full doctor plan shown, Accept / Reject
 * Phase 3 — plan_accepted: Session tracker per treatment
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Alert, Animated, Platform, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLivePlan, type LiveTreatmentPlan } from '../hooks/useLivePlan';
import { useAuth } from '../hooks/useAuth';
import { assignDoctorToPatient, type DoctorDomain } from '../services/doctorAssignment';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────

type Phase = 'ai_only' | 'plan_pending' | 'plan_accepted';
type DoctorAction = 'approved_ai' | 'modified' | 'custom';

type AISuggestion = {
  id:           string;
  name:         string;
  matchPercent: number;
  icon:         string;
};

type ProtocolItem = {
  id:       string;
  name:     string;
  sessions: number;
};

type Medication = {
  name:         string;
  dosage:       string;
  instructions: string;
};

type SessionProgress = {
  treatmentId:       string;
  sessionsTotal:     number;
  sessionsCompleted: number;
};

type TreatmentPlan = {
  planId:       string;
  doctorName:   string;
  doctorSpec:   string;
  doctorAction: DoctorAction;
  protocol:     ProtocolItem[];
  medications:  Medication[];
  labTests:     string[];
  notes:        string;
};

// ─── Mock data (replace with real fetch) ─────────────────────────

const MOCK_AI_SUGGESTIONS: AISuggestion[] = [
  { id: 'treat1', name: 'RF Microneedling',  matchPercent: 94, icon: '✨' },
  { id: 'treat2', name: 'Peptide Infusion',  matchPercent: 88, icon: '💧' },
  { id: 'treat5', name: 'Aura Facial',       matchPercent: 72, icon: '🌿' },
];

const MOCK_PLAN: TreatmentPlan = {
  planId:       'plan_001',
  doctorName:   'Dr. Priya Sharma',
  doctorSpec:   'Aesthetic Dermatologist',
  doctorAction: 'modified',
  protocol: [
    { id: 'treat1', name: 'RF Microneedling', sessions: 3 },
    { id: 'treat2', name: 'Peptide Infusion', sessions: 4 },
  ],
  medications: [
    { name: 'Tretinoin 0.025%',  dosage: 'Pea-sized amount',   instructions: 'Every night before sleep. Avoid eye area.' },
    { name: 'Sunscreen SPF 50+', dosage: 'Generous layer',      instructions: 'Every morning. Reapply every 2 hours outdoors.' },
    { name: 'Vitamin C Serum',   dosage: '3–4 drops',           instructions: 'Morning, after cleansing, before sunscreen.' },
  ],
  labTests: [
    'CBC (Complete Blood Count)',
    'Fasting Blood Sugar',
    'Thyroid Function Test (TSH)',
  ],
  notes:
    'Avoid direct sun for 72 hrs after each RF session. ' +
    'Discontinue retinoids 5 days before treatment. ' +
    'Follow-up in 4 weeks. Report any unusual redness immediately.',
};

// ─── Doctor action config ─────────────────────────────────────────

const ACTION_CFG: Record<DoctorAction, { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  approved_ai: { label: 'Approved by Doctor',  color: '#16A34A', bg: '#F0FDF4', icon: 'checkmark-circle'  },
  modified:    { label: 'Modified by Doctor',  color: '#D97706', bg: '#FFFBEB', icon: 'create-outline'    },
  custom:      { label: 'Prescribed by Doctor',color: '#7C3AED', bg: '#EDE9FE', icon: 'medical-outline'   },
};

// ─── Async storage key ────────────────────────────────────────────

const STORAGE_KEY = 'treatment_plan_state_v1';

// ─── Sub-components ───────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function MatchBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#22C55E' : pct >= 65 ? '#F59E0B' : '#94A3B8';
  return (
    <View style={styles.matchTrack}>
      <View style={[styles.matchFill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function SessionDots({ total, done }: { total: number; done: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < done
              ? styles.dotDone
              : i === done
              ? styles.dotCurrent
              : styles.dotFuture,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────

export default function DoctorTreatmentPlanScreen() {
  const router = useRouter();
  const { scanId, type: typeParam } = useLocalSearchParams<{ scanId?: string; type?: string }>();
  const domain = ((Array.isArray(typeParam) ? typeParam[0] : typeParam) ?? 'face') as DoctorDomain;

  // ── Auth + live plan ──────────────────────────────────────────
  const { user } = useAuth();
  const { plan: livePlan, loading: planLoading } = useLivePlan(user?.uid ?? null);

  // Derive effective plan: Firestore first, fallback to MOCK_PLAN for dev
  const activePlan: LiveTreatmentPlan | typeof MOCK_PLAN = livePlan ?? MOCK_PLAN;

  const [phase, setPhase]               = useState<Phase>('ai_only');
  const [sessionProgress, setProgress]  = useState<SessionProgress[]>([]);
  const [loadingPlan, setLoadingPlan]   = useState(false);
  const [consulting, setConsulting]     = useState(false);
  // Track whether we've already transitioned due to a live plan arriving
  const liveTransitioned = useRef(false);

  // Fade-in on phase change
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 9,   useNativeDriver: true }),
    ]).start();
  };

  // Restore persisted state (runs once on mount)
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) { animateIn(); return; }
      try {
        const saved = JSON.parse(raw);
        setPhase(saved.phase ?? 'ai_only');
        setProgress(saved.sessionProgress ?? []);
      } catch (_) {}
      animateIn();
    });
  }, []);

  // Real-time: when Firestore plan arrives, auto-transition to plan_pending
  useEffect(() => {
    if (!livePlan) return;
    if (liveTransitioned.current) return; // already handled

    // If patient already accepted/rejected, honour their stored state
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      let storedPhase: Phase = 'ai_only';
      try { storedPhase = JSON.parse(raw ?? '{}').phase ?? 'ai_only'; } catch (_) {}

      // Only auto-advance if they haven't yet acted on this plan
      if (storedPhase === 'ai_only' || storedPhase === 'plan_pending') {
        const targetPhase: Phase =
          livePlan.status === 'accepted' ? 'plan_accepted' : 'plan_pending';

        if (targetPhase !== phase) {
          const initial = (livePlan.protocol ?? []).map((t) => ({
            treatmentId:       t.id,
            sessionsTotal:     t.sessions,
            sessionsCompleted: 0,
          }));
          setPhase(targetPhase);
          setProgress(initial);
          persist(targetPhase, initial);
          animateIn();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
      liveTransitioned.current = true;
    });
  }, [livePlan]);

  const persist = (p: Phase, sp: SessionProgress[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ phase: p, sessionProgress: sp }));
  };

  // Simulate fetching doctor plan
  const handleFetchPlan = () => {
    setLoadingPlan(true);
    setTimeout(() => {
      setLoadingPlan(false);
      const initial = activePlan.protocol.map((t) => ({
        treatmentId:       t.id,
        sessionsTotal:     t.sessions,
        sessionsCompleted: 0,
      }));
      setPhase('plan_pending');
      setProgress(initial);
      persist('plan_pending', initial);
      animateIn();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1200);
  };

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase('plan_accepted');
    persist('plan_accepted', sessionProgress);
    animateIn();
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Plan?',
      'Your doctor will be notified. You can request a revised plan in your next consultation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setPhase('ai_only');
            persist('ai_only', []);
            animateIn();
          },
        },
      ],
    );
  };

  const handleMarkSession = (treatmentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setProgress((prev) => {
      const updated = prev.map((s) => {
        if (s.treatmentId !== treatmentId) return s;
        if (s.sessionsCompleted >= s.sessionsTotal) return s;
        return { ...s, sessionsCompleted: s.sessionsCompleted + 1 };
      });
      persist('plan_accepted', updated);
      return updated;
    });
  };

  // ── Auto-assign doctor on "Book a Consultation" tap ──────────
  const handleConsult = async () => {
    if (!user?.uid) {
      Alert.alert('Sign in required', 'Please sign in to book a consultation.');
      return;
    }

    setConsulting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await assignDoctorToPatient(
        user.uid,
        (Array.isArray(scanId) ? scanId[0] : scanId) ?? '',
        domain,
      );

      if (!result) {
        Alert.alert(
          'No Doctors Available',
          'All doctors in this specialty are currently at capacity. Please try again shortly or choose a different consultation time.',
          [{ text: 'OK' }],
        );
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Doctor Assigned! 🎉',
        `${result.doctor.name} has been assigned to your case.\n\nBooking ID: ${result.bookingId.slice(0, 8).toUpperCase()}\n\nYou'll receive your treatment plan shortly.`,
        [{ text: 'Great, thanks!' }],
      );
    } finally {
      setConsulting(false);
    }
  };

  const cfg = ACTION_CFG[(activePlan as LiveTreatmentPlan).doctorAction ?? 'modified'];

  // ── PHASE: AI ONLY ────────────────────────────────────────────
  if (phase === 'ai_only') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#1E1B4B" />
            </Pressable>
            <Text style={styles.headerTitle}>Treatment Plan</Text>
            {planLoading
              ? <ActivityIndicator size="small" color="#7C3AED" style={{ width: 36 }} />
              : <View style={{ width: 36 }} />
            }
          </View>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* AI Suggestions */}
            <View style={styles.sectionWrap}>
              <View style={styles.aiLabelRow}>
                <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.aiPill}>
                  <Ionicons name="sparkles" size={11} color="#fff" />
                  <Text style={styles.aiPillText}>AI Recommended</Text>
                </LinearGradient>
                <Text style={styles.aiSubLabel}>Based on your scan results</Text>
              </View>

              {MOCK_AI_SUGGESTIONS.map((s, i) => (
                <View
                  key={s.id}
                  style={[styles.aiRow, i < MOCK_AI_SUGGESTIONS.length - 1 && styles.aiRowBorder]}
                >
                  <View style={styles.aiIconBox}>
                    <Text style={{ fontSize: 18 }}>{s.icon}</Text>
                  </View>
                  <View style={styles.aiRowMid}>
                    <Text style={styles.aiTreatName}>{s.name}</Text>
                    <MatchBar pct={s.matchPercent} />
                  </View>
                  <Text style={[
                    styles.aiMatchNum,
                    { color: s.matchPercent >= 80 ? '#22C55E' : s.matchPercent >= 65 ? '#F59E0B' : '#94A3B8' },
                  ]}>
                    {s.matchPercent}%
                  </Text>
                </View>
              ))}
            </View>

            {/* Consult nudge card */}
            <View style={styles.consultCard}>
              <LinearGradient colors={['#EDE9FE', '#F5F3FF']} style={styles.consultCardGradient}>
                <View style={styles.consultIconCircle}>
                  <Ionicons name="people-outline" size={26} color="#7C3AED" />
                </View>
                <Text style={styles.consultHeading}>Get Your Personalised Plan</Text>
                <Text style={styles.consultBody}>
                  Consult a doctor to get your personalized treatment plan — combining AI insights with expert clinical judgment.
                </Text>
                <Pressable
                  onPress={handleConsult}
                  disabled={consulting}
                  android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
                  style={({ pressed }) => [styles.consultBtn, (pressed || consulting) && { opacity: 0.75 }]}
                >
                  <LinearGradient colors={['#5B21B6', '#7C3AED']} style={styles.consultBtnGrad}>
                    {consulting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                          <Text style={styles.consultBtnText}>Book a Consultation</Text>
                          <Ionicons name="arrow-forward" size={15} color="#fff" />
                        </>
                    }
                  </LinearGradient>
                </Pressable>
              </LinearGradient>
            </View>

            {/* Dev helper — simulate receiving plan */}
            <Pressable
              onPress={handleFetchPlan}
              disabled={loadingPlan}
              style={[styles.devBtn, loadingPlan && { opacity: 0.5 }]}
            >
              <Ionicons name="cloud-download-outline" size={14} color="#9CA3AF" />
              <Text style={styles.devBtnText}>
                {loadingPlan ? 'Loading plan…' : 'Simulate: Doctor sent plan'}
              </Text>
            </Pressable>

          </Animated.View>
          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── PHASE: PLAN PENDING (Accept / Reject) ─────────────────────
  if (phase === 'plan_pending') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Dark Hero */}
          <LinearGradient
            colors={['#0E0A1F', '#1A1235', '#2D1E5F']}
            locations={[0, 0.5, 1]}
            style={styles.planHero}
          >
            <Pressable onPress={() => router.back()} style={styles.backBtnLight}>
              <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.65)" />
            </Pressable>

            <Text style={styles.planHeroEyebrow}>Treatment Plan</Text>

            <View style={styles.doctorRow}>
              <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.docAvatar}>
                <Text style={{ fontSize: 20 }}>👩‍⚕️</Text>
              </LinearGradient>
              <View style={styles.docMeta}>
                <Text style={styles.docName}>{activePlan.doctorName}</Text>
                <Text style={styles.docSpec}>{activePlan.doctorSpec}</Text>
              </View>
              <View style={[styles.actionBadge, { backgroundColor: cfg.color + '28', borderColor: cfg.color + '55' }]}>
                <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                <Text style={[styles.actionBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </View>
          </LinearGradient>

          <Animated.View style={[styles.planBody, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* AI Suggestions (lighter weight) */}
            <SectionLabel title="AI Recommendations" />
            <View style={styles.aiCardLight}>
              {MOCK_AI_SUGGESTIONS.map((s, i) => (
                <View
                  key={s.id}
                  style={[styles.aiRowLight, i < MOCK_AI_SUGGESTIONS.length - 1 && styles.aiRowBorder]}
                >
                  <Text style={styles.aiIconSmall}>{s.icon}</Text>
                  <Text style={styles.aiNameLight}>{s.name}</Text>
                  <View style={styles.aiPctChip}>
                    <Text style={styles.aiPctChipText}>{s.matchPercent}%</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Final Protocol */}
            <SectionLabel title="Doctor's Protocol" />
            {activePlan.protocol.map((t) => (
              <View key={t.id} style={styles.treatCard}>
                <View style={[styles.treatStrip, { backgroundColor: cfg.color }]} />
                <View style={styles.treatContent}>
                  <Text style={styles.treatName}>{t.name}</Text>
                  <View style={styles.treatMetaRow}>
                    <View style={styles.treatMetaChip}>
                      <Ionicons name="repeat-outline" size={12} color="#6B7280" />
                      <Text style={styles.treatMetaText}>{t.sessions} sessions</Text>
                    </View>
                    <View style={[styles.treatStatusPill, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon} size={11} color={cfg.color} />
                      <Text style={[styles.treatStatusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {/* Medications */}
            {activePlan.medications.length > 0 && (
              <>
                <SectionLabel title="Medications" />
                <View style={styles.listCard}>
                  {activePlan.medications.map((m, i) => (
                    <View
                      key={m.name}
                      style={[styles.medRow, i < activePlan.medications.length - 1 && styles.medRowBorder]}
                    >
                      <View style={styles.medIconBox}>
                        <Ionicons name="medical" size={14} color="#7C3AED" />
                      </View>
                      <View style={styles.medTextWrap}>
                        <View style={styles.medTopRow}>
                          <Text style={styles.medName}>{m.name}</Text>
                          <View style={styles.dosagePill}>
                            <Text style={styles.dosageText}>{m.dosage}</Text>
                          </View>
                        </View>
                        <Text style={styles.medInstr}>{m.instructions}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Lab Tests */}
            {activePlan.labTests.length > 0 && (
              <>
                <SectionLabel title="Lab Tests Required" />
                <View style={styles.listCard}>
                  <View style={styles.labWrap}>
                    {activePlan.labTests.map((t) => (
                      <View key={t} style={styles.labChip}>
                        <Ionicons name="flask-outline" size={12} color="#0284C7" />
                        <Text style={styles.labChipText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* Notes */}
            {!!activePlan.notes && (
              <>
                <SectionLabel title="Doctor's Notes" />
                <View style={styles.notesCard}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#A78BFA" style={{ marginBottom: 8 }} />
                  <Text style={styles.notesText}>"{activePlan.notes}"</Text>
                  <Text style={styles.notesSig}>— {activePlan.doctorName}</Text>
                </View>
              </>
            )}

            {/* Accept / Reject */}
            <View style={styles.decisionRow}>
              <Pressable
                onPress={handleReject}
                android_ripple={{ color: 'rgba(239,68,68,0.08)' }}
                style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.75 }]}
              >
                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.rejectText}>Reject Plan</Text>
              </Pressable>

              <Pressable
                onPress={handleAccept}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                style={({ pressed }) => [styles.acceptBtnWrap, pressed && { opacity: 0.88 }]}
              >
                <LinearGradient
                  colors={['#4C1D95', '#7C3AED', '#A855F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.acceptBtn}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={styles.acceptText}>Accept Plan</Text>
                </LinearGradient>
              </Pressable>
            </View>

          </Animated.View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── PHASE: PLAN ACCEPTED — Session Tracking ───────────────────
  const allDone = sessionProgress.every((s) => s.sessionsCompleted >= s.sessionsTotal);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Accepted hero */}
        <LinearGradient colors={['#064E3B', '#065F46', '#047857']} style={styles.acceptedHero}>
          <Pressable onPress={() => router.back()} style={styles.backBtnLight}>
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.65)" />
          </Pressable>
          <View style={styles.acceptedBadge}>
            <Ionicons name="checkmark-circle" size={32} color="#fff" />
          </View>
          <Text style={styles.acceptedTitle}>
            {allDone ? 'Treatment Complete! 🎉' : 'Plan Accepted'}
          </Text>
          <Text style={styles.acceptedSub}>
            {allDone
              ? 'All sessions completed. Schedule a follow-up with your doctor.'
              : `${activePlan.doctorName} · ${activePlan.doctorSpec}`}
          </Text>
        </LinearGradient>

        <Animated.View style={[styles.planBody, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* Session Trackers */}
          <SectionLabel title="Session Progress" />
          {sessionProgress.map((sp) => {
            const treat = activePlan.protocol.find((p) => p.id === sp.treatmentId);
            const pct   = sp.sessionsTotal > 0
              ? Math.round((sp.sessionsCompleted / sp.sessionsTotal) * 100)
              : 0;
            const done  = sp.sessionsCompleted >= sp.sessionsTotal;

            return (
              <View key={sp.treatmentId} style={styles.trackerCard}>
                {/* Top row */}
                <View style={styles.trackerTop}>
                  <Text style={styles.trackerName}>{treat?.name ?? sp.treatmentId}</Text>
                  {done ? (
                    <View style={styles.completeBadge}>
                      <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                      <Text style={styles.completeBadgeText}>Complete</Text>
                    </View>
                  ) : (
                    <Text style={styles.trackerCount}>
                      {sp.sessionsCompleted} / {sp.sessionsTotal}
                    </Text>
                  )}
                </View>

                {/* Progress bar */}
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      { width: `${pct}%` as any, backgroundColor: done ? '#22C55E' : '#7C3AED' },
                    ]}
                  />
                </View>

                {/* Session dots */}
                <SessionDots total={sp.sessionsTotal} done={sp.sessionsCompleted} />

                {/* Mark session button */}
                {!done && (
                  <Pressable
                    onPress={() => handleMarkSession(sp.treatmentId)}
                    android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
                    style={({ pressed }) => [styles.markBtn, pressed && { opacity: 0.75 }]}
                  >
                    <Ionicons name="add-circle-outline" size={16} color="#7C3AED" />
                    <Text style={styles.markBtnText}>Mark Session Done</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {/* Medications summary */}
          {activePlan.medications.length > 0 && (
            <>
              <SectionLabel title="Medications" />
              <View style={styles.listCard}>
                {activePlan.medications.map((m, i) => (
                  <View
                    key={m.name}
                    style={[styles.medRow, i < activePlan.medications.length - 1 && styles.medRowBorder]}
                  >
                    <View style={styles.medIconBox}>
                      <Ionicons name="medical" size={14} color="#7C3AED" />
                    </View>
                    <View style={styles.medTextWrap}>
                      <View style={styles.medTopRow}>
                        <Text style={styles.medName}>{m.name}</Text>
                        <View style={styles.dosagePill}>
                          <Text style={styles.dosageText}>{m.dosage}</Text>
                        </View>
                      </View>
                      <Text style={styles.medInstr}>{m.instructions}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Notes */}
          {!!activePlan.notes && (
            <>
              <SectionLabel title="Doctor's Notes" />
              <View style={styles.notesCard}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#A78BFA" style={{ marginBottom: 8 }} />
                <Text style={styles.notesText}>"{activePlan.notes}"</Text>
                <Text style={styles.notesSig}>— {activePlan.doctorName}</Text>
              </View>
            </>
          )}

          {/* Book session CTA */}
          {!allDone && (
            <Pressable
              onPress={() => router.push('/care/consult-doctor')}
              android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
              style={({ pressed }) => [styles.bookBtn, pressed && { opacity: 0.78 }]}
            >
              <Ionicons name="calendar-outline" size={17} color="#7C3AED" />
              <Text style={styles.bookBtnText}>Book Next Session</Text>
            </Pressable>
          )}

          {allDone && (
            <Pressable
              onPress={() => router.push('/care/consult-doctor')}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              style={({ pressed }) => [styles.followUpBtnWrap, pressed && { opacity: 0.88 }]}
            >
              <LinearGradient colors={['#065F46', '#047857']} style={styles.followUpBtn}>
                <Ionicons name="star-outline" size={17} color="#fff" />
                <Text style={styles.followUpBtnText}>Book Follow-Up Consultation</Text>
              </LinearGradient>
            </Pressable>
          )}

        </Animated.View>
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
});
const PURPLE_SHADOW = Platform.select({
  ios:     { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 12 },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F2F2F7' },
  scroll: { flexGrow: 1 },

  // ── Shared header ──
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    backgroundColor: '#F2F2F7',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EEECF9',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E1B4B' },
  backBtnLight: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },

  // ── Section label ──
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#8E8E93',
    textTransform: 'uppercase', letterSpacing: 0.9,
    marginTop: 22, marginBottom: 10,
  },

  // ── AI Suggestions (phase 1) ──
  sectionWrap: {
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1, borderColor: '#EDE9FE',
    overflow: 'hidden', ...PURPLE_SHADOW,
  },
  aiLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  aiPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  aiPillText:  { fontSize: 11, fontWeight: '800', color: '#fff' },
  aiSubLabel:  { fontSize: 12, color: '#9CA3AF' },

  aiRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, gap: 12,
  },
  aiRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(60,60,67,0.1)' },
  aiIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  aiRowMid:    { flex: 1, gap: 6 },
  aiTreatName: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  matchTrack:  { height: 5, borderRadius: 3, backgroundColor: '#F1F0FB', overflow: 'hidden' },
  matchFill:   { height: '100%', borderRadius: 3 },
  aiMatchNum:  { fontSize: 16, fontWeight: '900', width: 42, textAlign: 'right' },

  // ── Consult card ──
  consultCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 24, overflow: 'hidden', ...PURPLE_SHADOW },
  consultCardGradient: { padding: 24, alignItems: 'center' },
  consultIconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(124,58,237,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  consultHeading: { fontSize: 17, fontWeight: '800', color: '#1E1B4B', textAlign: 'center', marginBottom: 8 },
  consultBody:    { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  consultBtn:     { width: '100%', borderRadius: 16, overflow: 'hidden' },
  consultBtnGrad: {
    height: 50, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  consultBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Dev helper
  devBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 24, marginHorizontal: 16,
    paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed',
  },
  devBtnText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  // ── Plan hero ──
  planHero: { paddingTop: 16, paddingBottom: 28, paddingHorizontal: 20 },
  planHeroEyebrow: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14,
  },
  doctorRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  docMeta:   { flex: 1 },
  docName:   { fontSize: 15, fontWeight: '800', color: '#fff' },
  docSpec:   { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  actionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  actionBadgeText: { fontSize: 10, fontWeight: '700' },

  // ── Plan body ──
  planBody: { paddingHorizontal: 16, paddingTop: 4 },

  // AI card (lighter in plan view)
  aiCardLight: {
    backgroundColor: '#FAFAFE',
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EDE9FE',
  },
  aiRowLight: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11, gap: 10,
  },
  aiIconSmall: { fontSize: 16, width: 24, textAlign: 'center' },
  aiNameLight: { flex: 1, fontSize: 13, fontWeight: '500', color: '#6B7280' },
  aiPctChip: {
    backgroundColor: '#EDE9FE', borderRadius: 20,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  aiPctChipText: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },

  // Treatment cards
  treatCard: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 16, overflow: 'hidden', marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0', ...CARD_SHADOW,
  },
  treatStrip:    { width: 4 },
  treatContent:  { flex: 1, padding: 14 },
  treatName:     { fontSize: 15, fontWeight: '700', color: '#1C1C1E', marginBottom: 8 },
  treatMetaRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  treatMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  treatMetaText: { fontSize: 12, color: '#6B7280' },
  treatStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4,
  },
  treatStatusText: { fontSize: 10, fontWeight: '700' },

  // Shared list card
  listCard: {
    backgroundColor: '#fff', borderRadius: 18,
    overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', ...CARD_SHADOW,
  },
  medRow:     { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  medRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(60,60,67,0.1)' },
  medIconBox: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: '#EDE9FE',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  medTextWrap: { flex: 1 },
  medTopRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  medName:     { flex: 1, fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  dosagePill: {
    backgroundColor: '#F5F3FF', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  dosageText:  { fontSize: 11, color: '#7C3AED', fontWeight: '700' },
  medInstr:    { fontSize: 12, color: '#6B7280', lineHeight: 18 },

  labWrap: { padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  labChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EFF6FF', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  labChipText: { fontSize: 12, color: '#0284C7', fontWeight: '600' },

  notesCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#EDE9FE',
    borderLeftWidth: 4, borderLeftColor: '#A78BFA', ...PURPLE_SHADOW,
  },
  notesText:  { fontSize: 13, color: '#374151', lineHeight: 21, fontStyle: 'italic' },
  notesSig:   { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 10 },

  // ── Accept / Reject ──
  decisionRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  rejectBtn: {
    flex: 1, height: 52, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#EF4444',
    ...CARD_SHADOW,
  },
  rejectText:     { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  acceptBtnWrap:  { flex: 2, borderRadius: 16, overflow: 'hidden' },
  acceptBtn: {
    height: 52, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  acceptText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // ── Accepted hero ──
  acceptedHero: { paddingTop: 16, paddingBottom: 32, paddingHorizontal: 20, alignItems: 'center' },
  acceptedBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  acceptedTitle: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 6 },
  acceptedSub:   { fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },

  // ── Session tracker ──
  trackerCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...CARD_SHADOW,
  },
  trackerTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  trackerName:  { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  trackerCount: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  completeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0FDF4', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  completeBadgeText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },

  progressTrack: {
    height: 6, borderRadius: 3, backgroundColor: '#F1F0FB',
    overflow: 'hidden', marginBottom: 14,
  },
  progressFill:  { height: '100%', borderRadius: 3 },

  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dotDone:    { backgroundColor: '#7C3AED' },
  dotCurrent: { backgroundColor: '#DDD6FE', borderWidth: 2, borderColor: '#7C3AED' },
  dotFuture:  { backgroundColor: '#F1F0FB' },

  markBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 40, borderRadius: 12,
    backgroundColor: '#F5F3FF',
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  markBtnText: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },

  bookBtn: {
    height: 52, borderRadius: 16, marginTop: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DDD6FE', ...PURPLE_SHADOW,
  },
  bookBtnText:        { fontSize: 15, fontWeight: '700', color: '#7C3AED' },
  followUpBtnWrap:    { marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  followUpBtn: {
    height: 54, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  followUpBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
