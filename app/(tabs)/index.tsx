import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, Easing,
  Dimensions, Image, ScrollView, Platform, Alert,
} from 'react-native';
import ReAnimated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  interpolate,
  Easing as ReEasing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { MOCK_APPOINTMENTS, MOCK_SCANS, MOCK_TREATMENTS } from '../../constants/mockData';
import AvatarCircle from '../../components/AvatarCircle';
import { useTabScroll } from '../../contexts/TabScrollContext';
import { useUser } from '../../contexts/UserContext';
import { getTreatments, FirestoreTreatment, TreatmentDomain } from '../../services/api';
import { getRecommendedTreatments, RecommendedTreatmentItem } from '../../services/recommendation';
import {
  getTreatmentEligibility,
  ELIGIBILITY_BADGE,
  Contraindication,
  EligibilityResult,
} from '../../services/treatmentEligibility';
import { useHealthProfile } from '../../context/HealthProfileContext';

// ─── Greeting helper (computed once on mount) ─────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h <= 21) return 'Good evening';
  return 'Welcome back';
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;
const SNAP       = CARD_WIDTH + 16;

// ─── Score mock data ───────────────────────────────────────────────
const latestScores = {
  aesthetiq:         84,
  facialSymmetry:    88,
  jawlineDefinition: 'defined',
  chinProjection:    'ideal',
  skin:              72,
  acneScore:         65,
  texture:           78,
  pores:             71,
  dental:            91,
  alignment:         88,
  whiteness:         'A2',
  gumHealth:         'Good',
};

// ─── Score helpers ─────────────────────────────────────────────────
const getScoreStatus = (score: number) => {
  if (score >= 91) return { label: 'Excellent',       color: '#22C55E' };
  if (score >= 76) return { label: 'Very Good',       color: '#22C55E' };
  if (score >= 61) return { label: 'Good',            color: '#F59E0B' };
  if (score >= 41) return { label: 'Fair',            color: '#F59E0B' };
  return              { label: 'Needs Attention', color: '#EF4444' };
};

const getMetricColor = (value: number | string, isNumber: boolean) => {
  if (!isNumber) return 'white';
  const n = value as number;
  if (n >= 80) return '#86EFAC';
  if (n >= 60) return '#FDE68A';
  return '#FCA5A5';
};

// ─── Score cards data ──────────────────────────────────────────────
const SCORE_CARDS = [
  {
    id:    'facial',
    label: 'AesthetiQ Score',
    gradient: ['#4C1D95', '#7C3AED'] as [string, string],
    emoji: '✨',
    score: latestScores.aesthetiq,
    noScanLabel: 'Take facial scan',
    metrics: [
      { label: 'Symmetry', value: latestScores.facialSymmetry,    unit: '%' },
      { label: 'Jawline',  value: latestScores.jawlineDefinition, unit: '' },
      { label: 'Chin',     value: latestScores.chinProjection,    unit: '' },
    ],
  },
  {
    id:    'skin',
    label: 'Skin Health Score',
    gradient: ['#EC4899', '#A855F7'] as [string, string],
    emoji: '🧖',
    score: latestScores.skin,
    noScanLabel: 'Take skin scan',
    metrics: [
      { label: 'Acne Score', value: latestScores.acneScore, unit: '' },
      { label: 'Texture',    value: latestScores.texture,   unit: '' },
      { label: 'Pores',      value: latestScores.pores,     unit: '' },
    ],
  },
  {
    id:    'dental',
    label: 'Dental Health Score',
    gradient: ['#0EA5E9', '#0C4A6E'] as [string, string],
    emoji: '🦷',
    score: latestScores.dental,
    noScanLabel: 'Take dental scan',
    metrics: [
      { label: 'Alignment',  value: latestScores.alignment,  unit: '%' },
      { label: 'Whiteness',  value: latestScores.whiteness,  unit: '' },
      { label: 'Gum Health', value: latestScores.gumHealth,  unit: '' },
    ],
  },
];


// ─── Local types (previously imported from api.ts) ────────────────
interface QuickTreatment {
  id: string;
  name: string;
  category: string;
  description?: string;
  emoji?: string;
  gradient?: [string, string];
  /** Optional Firestore-backed contraindications for the eligibility engine */
  contraindications?: Contraindication[];
}

interface MergedRecommendation {
  id: string;
  name: string;
  category: string;
  source: 'doctor' | 'ai';
  reason?: string;
  matchScore?: number;
  icon?: string;
  gradient?: [string, string];
}

// ─── Quick Treatments fallback (Firestore unavailable) ───────────
// NOTE: contraindications below are illustrative defaults so the eligibility
// engine has rules to evaluate when Firestore is unreachable. In production
// these come from the treatments/{id} document and override any local data.
const FALLBACK_QUICK_TREATMENTS: QuickTreatment[] = [
  { id: 'qt1', name: 'Skin Tone',       category: 'skin',   emoji: '✨', gradient: ['#F59E0B', '#EC4899'] },
  {
    id: 'qt2', name: 'Botox', category: 'facial', emoji: '💉', gradient: ['#7C3AED', '#A855F7'],
    contraindications: [
      { field: 'pregnant',        operator: 'equals', value: true, severity: 'critical', action: 'doctor_review_required', message: 'Botox is not recommended during pregnancy.' },
      { field: 'breastfeeding',   operator: 'equals', value: true, severity: 'high',     action: 'doctor_review_required', message: 'Botox is not recommended while breastfeeding.' },
      { field: 'onBloodThinners', operator: 'equals', value: true, severity: 'moderate', action: 'caution',                message: 'Blood thinners may increase bruising risk.' },
    ],
  },
  { id: 'qt3', name: 'Aura Facial', category: 'facial', emoji: '🌸', gradient: ['#EC4899', '#F43F5E'] },
  {
    id: 'qt4', name: 'Fillers', category: 'facial', emoji: '💆', gradient: ['#A855F7', '#7C3AED'],
    contraindications: [
      { field: 'pregnant',        operator: 'equals', value: true, severity: 'critical', action: 'doctor_review_required', message: 'Fillers are not recommended during pregnancy.' },
      { field: 'onBloodThinners', operator: 'equals', value: true, severity: 'moderate', action: 'caution',                message: 'Blood thinners may increase bruising and bleeding risk.' },
      { field: 'hadAdverseReaction', operator: 'equals', value: true, severity: 'high',  action: 'doctor_review_required', message: 'You reported a previous adverse reaction — clinician review recommended.' },
    ],
  },
  {
    id: 'qt5', name: 'Teeth Whitening', category: 'dental', emoji: '🦷', gradient: ['#0EA5E9', '#06B6D4'],
    contraindications: [
      { field: 'pregnant',      operator: 'equals',   value: true,            severity: 'moderate', action: 'caution', message: 'Teeth whitening is generally avoided during pregnancy.' },
      { field: 'breastfeeding', operator: 'equals',   value: true,            severity: 'low',      action: 'caution', message: 'Whitening is typically deferred while breastfeeding.' },
    ],
  },
  { id: 'qt6', name: 'Scaling', category: 'dental', emoji: '🩺', gradient: ['#22C55E', '#16A34A'] },
];

// Gradient palette cycled when backend doesn't supply one
const PILL_GRADIENTS: [string, string][] = [
  ['#F59E0B', '#EC4899'],
  ['#7C3AED', '#A855F7'],
  ['#EC4899', '#F43F5E'],
  ['#A855F7', '#7C3AED'],
  ['#0EA5E9', '#06B6D4'],
  ['#22C55E', '#16A34A'],
];
const PILL_EMOJIS: Record<string, string> = {
  skin: '✨', facial: '🌸', dental: '🦷', hair: '💇', body: '💆',
  laser: '⚡', botox: '💉', filler: '💆', whitening: '🦷',
};

const ROUTINE_ITEMS = [
  { id: 'r1', label: 'Cleanser',    emoji: '🧴' },
  { id: 'r2', label: 'Vitamin C',   emoji: '🍊' },
  { id: 'r3', label: 'Sunscreen',   emoji: '☀️' },
  { id: 'r4', label: 'Moisturizer', emoji: '💧' },
  { id: 'r5', label: 'AHA Serum',   emoji: '✨' },
];

// ─── AnimatedCircle — module level (not inside render) ────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE   = 140;
const RING_STROKE = 10;
const RING_R      = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC   = 2 * Math.PI * RING_R;

// ─── Score Card ───────────────────────────────────────────────────
function ScoreCard({ card, isActive }: { card: typeof SCORE_CARDS[0]; isActive: boolean }) {
  const router = useRouter();

  const arcAnim   = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  const score    = card.score;
  const hasScore = score != null;
  const status   = hasScore ? getScoreStatus(score) : null;

  useEffect(() => {
    if (!isActive || !hasScore) return;

    arcAnim.setValue(0);
    countAnim.setValue(0);
    setDisplayScore(0);

    const id = countAnim.addListener(({ value }) =>
      setDisplayScore(Math.round(value)),
    );

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(arcAnim, {
          toValue:  score,
          duration: 1200,
          easing:   Easing.out(Easing.cubic),
          useNativeDriver: false,        // SVG props cannot use native driver
        }),
        Animated.timing(countAnim, {
          toValue:  score,
          duration: 1200,
          easing:   Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    }, 300);

    return () => {
      countAnim.removeListener(id);
      clearTimeout(t);
    };
  }, [isActive, score]);

  const strokeOffset = arcAnim.interpolate({
    inputRange:  [0, 100],
    outputRange: [RING_CIRC, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: CARD_WIDTH, marginHorizontal: 8, borderRadius: 28, overflow: 'hidden' }}>
      <LinearGradient colors={card.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 22 }}>

        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 18 }}>{card.emoji}</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginLeft: 8, flex: 1 }}>
            {card.label}
          </Text>
          {status && (
            <View style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: status.color, letterSpacing: 0.5 }}>
                {status.label.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Arc ring + score */}
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
              <Circle
                cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                stroke="rgba(255,255,255,0.15)" strokeWidth={RING_STROKE} fill="none"
              />
              {hasScore && (
                <AnimatedCircle
                  cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                  stroke="rgba(255,255,255,0.92)" strokeWidth={RING_STROKE} fill="none"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                />
              )}
            </Svg>

            {hasScore ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 42, fontWeight: '800', color: 'white', letterSpacing: -1 }}>
                  {displayScore}
                </Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: -2 }}>
                  out of 100
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 34, color: 'rgba(255,255,255,0.35)', fontWeight: '700' }}>—</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 4, paddingHorizontal: 8 }}>
                  {card.noScanLabel}
                </Text>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/scan/type-selection'); }}
                  style={{ marginTop: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 5 }}
                >
                  <Text style={{ fontSize: 11, color: 'white', fontWeight: '600' }}>Start Scan →</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* 3 sub-metrics */}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 14, marginTop: 16 }}>
          {card.metrics.map((m, i) => {
            const isNum  = typeof m.value === 'number';
            const display = hasScore
              ? (isNum
                ? `${m.value}${m.unit || ''}`
                : (String(m.value).charAt(0).toUpperCase() + String(m.value).slice(1).replace(/_/g, ' ')))
              : '—';
            return (
              <View key={m.label} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < 2 ? 1 : 0, borderRightColor: 'rgba(255,255,255,0.12)' }}>
                <Text style={{ fontSize: isNum ? 16 : 13, fontWeight: '700', color: hasScore ? getMetricColor(m.value, isNum) : 'rgba(255,255,255,0.3)' }}>
                  {display}
                </Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 3, textAlign: 'center' }}>
                  {m.label}
                </Text>
              </View>
            );
          })}
        </View>

      </LinearGradient>
    </View>
  );
}


// ─── Treatment Pill Card ──────────────────────────────────────────
function TreatmentPill({ item, index }: { item: QuickTreatment; index: number }) {
  const router = useRouter();
  const scale  = useRef(new Animated.Value(1)).current;
  const gradient = (item.gradient as [string, string] | undefined) ?? PILL_GRADIENTS[index % PILL_GRADIENTS.length];
  const emoji    = item.emoji ?? PILL_EMOJIS[item.category?.toLowerCase()] ?? '✨';
  const press  = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 60, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start(() => router.push('/care/consult-doctor'));
  };
  return (
    <Pressable onPress={press} style={{ alignItems: 'center', marginRight: 12 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient colors={gradient} style={styles.treatmentPill}>
          <Text style={{ fontSize: 26 }}>{emoji}</Text>
        </LinearGradient>
        <Text style={styles.treatmentPillLabel} numberOfLines={1}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.treatmentPillSub} numberOfLines={1}>{item.description}</Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

// ─── Recommendation Card ──────────────────────────────────────────
const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  dental:    ['#0EA5E9', '#06B6D4'],
  skin:      ['#F59E0B', '#EC4899'],
  aesthetic: ['#7C3AED', '#A855F7'],
  facial:    ['#EC4899', '#F43F5E'],
  body:      ['#22C55E', '#16A34A'],
};

function RecommendationCard({ rec }: { rec: MergedRecommendation }) {
  const router   = useRouter();
  const isDoctor = rec.source === 'doctor';
  const gradient = rec.gradient ?? CATEGORY_GRADIENTS[rec.category?.toLowerCase()] ?? ['#7C3AED', '#A855F7'];
  const emoji    = rec.icon ?? PILL_EMOJIS[rec.category?.toLowerCase()] ?? '✨';

  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/treatment-info', params: { treatmentId: rec.id } }); }}
      style={styles.recCard}
    >
      {/* Source badge */}
      <View style={[styles.recSourceBadge, isDoctor ? styles.recSourceDoctor : styles.recSourceAI]}>
        <Text style={[styles.recSourceText, { color: isDoctor ? '#059669' : '#7C3AED' }]}>
          {isDoctor ? '👨‍⚕️ Doctor Recommended' : '🤖 Suggested for you'}
        </Text>
      </View>

      <LinearGradient colors={gradient as [string,string]} style={styles.recIconWrap}>
        <Text style={{ fontSize: 24 }}>{emoji}</Text>
      </LinearGradient>
      <Text style={styles.recName} numberOfLines={2}>{rec.name}</Text>

      {rec.reason ? (
        <Text style={styles.recReason} numberOfLines={2}>{rec.reason}</Text>
      ) : null}

      {rec.matchScore != null && (
        <View style={styles.recMatchRow}>
          <Text style={styles.recMatchText}>✦ {rec.matchScore}% match</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Routine Checklist ────────────────────────────────────────────
function RoutineChecklist() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  return (
    <View style={styles.routineCard}>
      <Text style={styles.routineCardTitle}>Today's Routine</Text>
      <Text style={styles.routineCardSub}>{checked.size}/{ROUTINE_ITEMS.length} done</Text>
      {ROUTINE_ITEMS.map((item) => (
        <Pressable key={item.id} onPress={() => toggle(item.id)} style={styles.routineRow}>
          <View style={[styles.routineCheck, checked.has(item.id) && styles.routineCheckDone]}>
            {checked.has(item.id) && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text>}
          </View>
          <Text style={{ fontSize: 14 }}>{item.emoji}</Text>
          <Text style={[styles.routineItemLabel, checked.has(item.id) && { color: Colors.textMuted, textDecorationLine: 'line-through' }]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────
export default function DashboardScreen() {
  const router            = useRouter();
  const { user, loading } = useUser();
  const [activeCard, setActiveCard] = useState(0);
  const [quickTreatments, setQuickTreatments] = useState<QuickTreatment[]>(FALLBACK_QUICK_TREATMENTS);
  const [treatmentsLoading, setTreatmentsLoading] = useState(true);
  const [firestoreTreatments, setFirestoreTreatments] = useState<FirestoreTreatment[]>([]);
  const [firestoreLoading, setFirestoreLoading] = useState(true);
  const [activeDomain, setActiveDomain] = useState<TreatmentDomain>('skin');
  const { healthProfile } = useHealthProfile();
  const nextAppt = MOCK_APPOINTMENTS.find((a) => a.status === 'upcoming');

  // Quick Treatments tap handler — gated by eligibility engine.
  // Only Quick Treatments use this. AI recs and doctor plans are unaffected.
  const handleQuickTreatmentTap = (treatment: { id: string; name: string }, eligibility: EligibilityResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (eligibility.status === 'available') {
      router.push('/care/consult-doctor');
      return;
    }

    if (eligibility.status === 'caution') {
      Alert.alert(
        '⚠️  Proceed with caution',
        `${treatment.name}\n\n${eligibility.reasons.join('\n• ')}`,
        [
          { text: 'Consult Doctor',  onPress: () => router.push('/care/consult-doctor') },
          { text: 'Continue Anyway', style: 'default', onPress: () => router.push('/care/consult-doctor') },
          { text: 'Cancel',          style: 'cancel' },
        ],
      );
      return;
    }

    // doctor_review_required
    Alert.alert(
      '🩺  Doctor review recommended',
      `This treatment may require doctor approval based on your health profile.\n\n• ${eligibility.reasons.join('\n• ')}`,
      [
        { text: 'Consult Specialist', onPress: () => router.push('/care/consult-doctor') },
        { text: 'Continue Request',   style: 'default', onPress: () => router.push('/care/consult-doctor') },
        { text: 'Cancel',             style: 'cancel' },
      ],
    );
  };

  // Merge Firestore contraindications with local fallback rules.
  // Firestore wins when both define rules; local rules act as a safety net.
  // Matching is fuzzy: lowercase + substring match in either direction so
  // small wording differences ("Botox" vs "Botox Treatment") still resolve.
  const fallbackRules = useMemo(() => {
    return FALLBACK_QUICK_TREATMENTS
      .filter((t) => t.contraindications?.length)
      .map((t) => ({ key: t.name.toLowerCase(), rules: t.contraindications! }));
  }, []);

  const findFallbackRules = (name: string): Contraindication[] => {
    const n = name.toLowerCase();
    const hit = fallbackRules.find(({ key }) => n.includes(key) || key.includes(n));
    return hit?.rules ?? [];
  };

  // Redirect to login if unauthenticated (handles forced logout)
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading]);

  // Quick treatments come from FALLBACK_QUICK_TREATMENTS (static local data).
  // Firestore domain-filtered treatments are loaded separately below.
  useEffect(() => { setTreatmentsLoading(false); }, []);

  // Fetch Firestore treatments whenever the active domain tab changes
  useEffect(() => {
    setFirestoreLoading(true);
    getTreatments(activeDomain)
      .then((data) => setFirestoreTreatments(data))
      .catch(() => setFirestoreTreatments([]))
      .finally(() => setFirestoreLoading(false));
  }, [activeDomain]);

  // Greeting computed once on mount
  const greeting  = useMemo(() => getGreeting(), []);
  const firstName = useMemo(() => {
    const name = user?.fullName?.trim();
    if (!name) return 'User';
    return name.split(' ')[0];
  }, [user?.fullName]);

  // ── Avatar animation
  const avatarScale   = useSharedValue(0.8);
  const avatarOpacity = useSharedValue(0);
  const avatarGlow    = useSharedValue(0);

  useEffect(() => {
    avatarOpacity.value = withTiming(1, { duration: 400 });
    avatarScale.value   = withSequence(
      withSpring(1.05, { damping: 10, stiffness: 200 }),
      withSpring(1.0,  { damping: 14, stiffness: 220 }),
    );
    // Subtle glow pulse starts after reveal
    avatarGlow.value = withDelay(
      500,
      withRepeat(withTiming(1, { duration: 2200, easing: ReEasing.inOut(ReEasing.ease) }), -1, true),
    );
  }, []);

  const avatarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
    opacity:   avatarOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity:   interpolate(avatarGlow.value, [0, 1], [0, 0.16]),
    transform: [{ scale: interpolate(avatarGlow.value, [0, 1], [0.88, 1.18]) }],
  }));

  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    avatarScale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withSpring(1.0,  { damping: 12, stiffness: 200 }),
    );
    router.push('/(tabs)/profile');
  };

  // Report scroll to tab bar for blur / float animation
  const { scrollY } = useTabScroll();
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet';
      scrollY.value = e.contentOffset.y;
    },
  });

  const carouselRef = useRef<ScrollView>(null);

  // ── AI concern-based recommendations from Firestore ──────────────
  const [aiRecs, setAiRecs]           = useState<RecommendedTreatmentItem[]>([]);
  const [aiRecsLoading, setAiRecsLoading] = useState(true);

  useEffect(() => {
    const latestScan = MOCK_SCANS[0]; // replace with real scan result when available
    if (!latestScan?.concerns?.length) {
      setAiRecsLoading(false);
      return;
    }
    getRecommendedTreatments(latestScan.concerns)
      .then(setAiRecs)
      .catch(() => setAiRecs([]))
      .finally(() => setAiRecsLoading(false));
  }, []);

  // Merged recs: built from AI recs (Firestore-based) once loaded
  const mergedRecs: MergedRecommendation[] = aiRecs.slice(0, 6).map((r) => ({
    id:         r.id,
    name:       r.name,
    category:   r.category,
    source:     'ai' as const,
    reason:     r.matchedConcern,
    matchScore: r.weight * 33, // convert weight 1-3 → rough 33/66/99% display
  }));
  const recsLoading = aiRecsLoading;

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ReAnimated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: 150 }]}
      >

        {/* ── 1. PAGE GREETING ── */}
        <View style={styles.pageGreetingWrap}>
           <Text style={styles.pageGreetText}>{greeting},</Text>
           <Text style={styles.pageNameText}>{firstName}</Text>
        </View>

        {/* ── 2. SCORE CARDS CAROUSEL ── */}
        <View style={styles.carouselSection}>
          <ScrollView
            ref={carouselRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP}
            decelerationRate="fast"
            snapToAlignment="start"
            contentContainerStyle={{ paddingHorizontal: 24 }}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP);
              setActiveCard(Math.min(idx, SCORE_CARDS.length - 1));
            }}
          >
            {SCORE_CARDS.map((card, i) => (
              <View key={card.id} style={{ marginRight: i < SCORE_CARDS.length - 1 ? 16 : 0 }}>
                <ScoreCard card={card} isActive={activeCard === i} />
              </View>
            ))}
          </ScrollView>

          {/* Dot indicators — tappable */}
          <View style={styles.dotsRow}>
            {SCORE_CARDS.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  carouselRef.current?.scrollTo({ x: i * SNAP, animated: true });
                  setActiveCard(i);
                }}
                style={[
                  styles.dot,
                  { backgroundColor: i === activeCard ? Colors.primary : Colors.borderLight, width: i === activeCard ? 20 : 7 },
                ]}
              />
            ))}
          </View>
        </View>

        {/* ── 3. QUICK TREATMENTS (Firestore) ── */}
        <View style={[styles.section, { paddingHorizontal: 0 }]}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 20 }]}>Quick Treatments</Text>

          {/* Domain filter tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginBottom: 14 }}>
            {(['skin', 'facial', 'dental'] as TreatmentDomain[]).map((d) => (
              <Pressable
                key={d}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveDomain(d); }}
                style={{
                  paddingHorizontal: 16, paddingVertical: 7, borderRadius: 99,
                  backgroundColor: activeDomain === d ? Colors.primary : 'rgba(124,58,237,0.08)',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: activeDomain === d ? '#fff' : Colors.primary, textTransform: 'capitalize' }}>
                  {d === 'skin' ? '✨ Skin' : d === 'facial' ? '🌸 Facial' : '🦷 Dental'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Treatment cards */}
          {firestoreLoading ? (
            /* Skeleton placeholders */
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ width: 120, height: 76, borderRadius: 16, backgroundColor: '#E5E5EA', opacity: 0.4 }} />
              ))}
            </ScrollView>
          ) : firestoreTreatments.length === 0 ? (
            /* Empty fallback */
            <View style={{ paddingHorizontal: 20, paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: Colors.textMuted, textAlign: 'center' }}>
                No treatments found for this category.{'\n'}Check back soon!
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingRight: 32 }}>
              {firestoreTreatments.map((item, i) => {
                const gradient = PILL_GRADIENTS[i % PILL_GRADIENTS.length];
                const emoji    = PILL_EMOJIS[item.category?.toLowerCase()] ?? PILL_EMOJIS[item.domain] ?? '✨';

                // Eligibility check — Quick Treatments only
                const rules       = item.contraindications ?? findFallbackRules(item.name);
                const eligibility = getTreatmentEligibility({ id: item.id, name: item.name, contraindications: rules }, healthProfile);
                const badge       = ELIGIBILITY_BADGE[eligibility.status];

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleQuickTreatmentTap(item, eligibility)}
                    style={{ width: 132, borderRadius: 16, overflow: 'hidden' }}
                  >
                    <LinearGradient colors={gradient} style={{ padding: 12, minHeight: 102, justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 20 }}>{emoji}</Text>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10 }}>{badge.emoji}</Text>
                        </View>
                      </View>
                      <View>
                        <Text numberOfLines={2} style={{ fontSize: 12, fontWeight: '700', color: '#fff', lineHeight: 15 }}>
                          {item.name}
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2, textTransform: 'capitalize' }}>
                          {item.category}
                        </Text>
                        {/* Eligibility status line — visible on every pill */}
                        <Text numberOfLines={1} style={{ fontSize: 9, fontWeight: '700', color: '#fff', marginTop: 4, opacity: 0.95 }}>
                          {badge.label}
                        </Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── 4. AI CONCERN-BASED RECOMMENDATIONS (priority sorted) ── */}
        <View style={[styles.section, { paddingHorizontal: 0 }]}>
          {/* Header row */}
          <View style={[styles.sectionRow, { paddingHorizontal: 20 }]}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            {aiRecs.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: '#FEF3C7', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#92400E', letterSpacing: 0.4 }}>
                  PRIORITY SORTED
                </Text>
              </View>
            )}
          </View>

          {aiRecsLoading ? (
            /* Skeleton */
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ width: 152, height: 106, borderRadius: 18, backgroundColor: '#E5E5EA', opacity: 0.4 }} />
              ))}
            </ScrollView>
          ) : aiRecs.length === 0 ? (
            /* Fallback */
            <View style={{ paddingHorizontal: 20, paddingVertical: 18, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: Colors.textMuted, textAlign: 'center' }}>
                No recommendations yet.{'\n'}Complete a scan to see personalised treatments.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingRight: 32 }}>
              {aiRecs.map((item, i) => {
                // Severity-driven gradient: high → red-ish, medium → amber, low → standard
                const severityGradient: Record<string, [string, string]> = {
                  high:   ['#EF4444', '#B91C1C'],
                  medium: ['#F59E0B', '#D97706'],
                  low:    PILL_GRADIENTS[i % PILL_GRADIENTS.length],
                };
                const severityLabel: Record<string, string> = {
                  high: '🔴 HIGH', medium: '🟡 MEDIUM', low: '🟢 LOW',
                };
                const severityTextColor: Record<string, string> = {
                  high: '#FCA5A5', medium: '#FDE68A', low: 'rgba(255,255,255,0.8)',
                };
                const gradient    = severityGradient[item.severity] ?? PILL_GRADIENTS[i % PILL_GRADIENTS.length];
                const emoji       = PILL_EMOJIS[item.category?.toLowerCase()] ?? PILL_EMOJIS[item.domain?.toLowerCase()] ?? '✨';
                const isTopPick   = i === 0;

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/care/consult-doctor'); }}
                    style={{ width: 152, borderRadius: 18, overflow: 'hidden' }}
                  >
                    <LinearGradient colors={gradient} style={{ padding: 14, minHeight: 106, justifyContent: 'space-between' }}>

                      {/* Top row: emoji + "Top Pick" crown for index 0 */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 18 }}>{emoji}</Text>
                        {isTopPick && (
                          <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>★ TOP PICK</Text>
                          </View>
                        )}
                      </View>

                      {/* Name + category — no price */}
                      <View>
                        <Text numberOfLines={2} style={{ fontSize: 12, fontWeight: '700', color: '#fff', lineHeight: 16 }}>
                          {item.name}
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2, textTransform: 'capitalize' }}>
                          {item.category}
                        </Text>

                        {/* Severity + concern row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: severityTextColor[item.severity], letterSpacing: 0.3 }}>
                            {severityLabel[item.severity]}
                          </Text>
                          <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>·</Text>
                          <Text numberOfLines={1} style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', textTransform: 'capitalize', flex: 1 }}>
                            {item.matchedConcern}
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── 5. NEXT VISIT + ROUTINE (Side by Side) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Visit & Routine</Text>
          <View style={styles.splitRow}>

            {/* Left: Next Visit */}
            <View style={styles.visitCard}>
              {nextAppt ? (
                <>
                  <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.visitAvatarWrap}>
                    <Text style={{ fontSize: 22 }}>👨‍⚕️</Text>
                  </LinearGradient>
                  <Text style={styles.visitDoctor} numberOfLines={1}>{nextAppt.doctorName}</Text>
                  <Text style={styles.visitTreatment} numberOfLines={1}>{nextAppt.treatmentName}</Text>
                  <Text style={styles.visitTime}>{fmtDate(nextAppt.slotTime)}</Text>
                  <View style={styles.visitBtns}>
                    <Pressable
                      onPress={() => router.push('/care/all-appointments')}
                      style={styles.visitBtnLight}
                    >
                      <Text style={styles.visitBtnLightText}>Reschedule</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push({ pathname: '/care/appointment-detail', params: { apptId: nextAppt.id } })}
                      style={styles.visitBtnDark}
                    >
                      <Text style={styles.visitBtnDarkText}>Details</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 32 }}>📅</Text>
                  <Text style={[styles.visitTreatment, { textAlign: 'center', marginTop: 6 }]}>No upcoming visit</Text>
                  <Pressable onPress={() => router.push('/care/consult-doctor')} style={[styles.visitBtnDark, { marginTop: 10 }]}>
                    <Text style={styles.visitBtnDarkText}>Book Now</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Right: Routine */}
            <RoutineChecklist />

          </View>
        </View>

        <View style={{ height: 120 }} />
      </ReAnimated.ScrollView>

      {/* ── 1. HEADER (Moved directly inside SafeAreaView) ── */}
      <View style={styles.header}>
        {/* Glass blur background */}
        <View style={[StyleSheet.absoluteFill, { borderRadius: 40, overflow: 'hidden' }]}>
          <BlurView
            intensity={60}
            tint={Platform.OS === 'ios' ? 'systemChromeMaterialLight' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          {/* Frosted glass overlay */}
          <View style={styles.headerGlassOverlay} />
        </View>

        {/* Border ring */}
        <View style={styles.headerBorderRing} pointerEvents="none" />

        {/* Left: Avatar */}
        <Pressable onPress={handleAvatarPress} style={styles.headerLeft}>
          {/* Avatar with glow */}
          <View style={styles.avatarWrap}>
            <ReAnimated.View style={[styles.avatarGlow, glowStyle]} pointerEvents="none" />
            <ReAnimated.View style={avatarAnimStyle}>
              <AvatarCircle
                name={firstName}
                imageUri={user?.profileImage}
                size={40}
                borderWidth={2}
                borderColor={Colors.primaryLight}
              />
            </ReAnimated.View>
          </View>
        </Pressable>

        {/* Center: Logo — absolutely positioned for true centering */}
        <View style={styles.headerLogoWrap} pointerEvents="none">
          <Image
            source={require('../../assets/images/text logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>

        {/* Right: Bell */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/notifications-centre'); }}
          style={styles.bellWrap}
        >
          <Text style={{ fontSize: 18 }}>🔔</Text>
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      {/* ── 7. FLOATING SOS BUTTON ── */}
      <Pressable
        onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); router.push('/sos/emergency-select'); }}
        style={styles.sosBtn}
      >
        <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.sosBtnInner}>
          <Text style={styles.sosBtnText}>SOS</Text>
        </LinearGradient>
      </Pressable>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const SPLIT_W = (width - 40 - 12) / 2;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 20 },

  // Header
  header: {
    position: 'absolute', top: 65, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 40,
    zIndex: 100,
    shadowColor: '#1E1B4B', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 28, elevation: 20,
  },
  headerGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(250,249,255,0.92)' : 'rgba(255,255,255,0.35)',
  },
  headerBorderRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    zIndex: -1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },

  // Avatar glow ring
  avatarWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  avatarGlow: {
    position: 'absolute',
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
  },

  // Greeting text
  pageGreetingWrap: { paddingHorizontal: 24, marginBottom: 20, marginTop: -32 },
  pageGreetText: { fontSize: 16, color: '#8A8A8A', fontWeight: '600', letterSpacing: 0.5 },
  pageNameText: { fontSize: 32, fontWeight: '900', color: Colors.textPrimary, marginTop: 2, letterSpacing: -0.5 },

  // Logo — absolutely centered regardless of left/right widths
  headerLogoWrap: {
    position: 'absolute', left: 0, right: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  headerLogo: { width: 110, height: 32 },
  bellWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.cardBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.borderLight,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  bellDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.danger, borderWidth: 1.5, borderColor: '#fff',
  },

  // Carousel
  carouselSection: { marginTop: 12 },

  // Dots
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 4 },
  dot: { height: 7, borderRadius: 4 },

  // Section
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginBottom: 14 },
  seeAll: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Treatment Pills
  treatmentPill: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  treatmentPillLabel: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center', width: 72 },
  treatmentPillSub:   { fontSize: 9, color: Colors.textSecondary, textAlign: 'center', width: 72, opacity: 0.6 },

  // Recommendation Cards
  recCard: {
    width: 140, backgroundColor: Colors.cardBg, borderRadius: 20, padding: 14,
    borderWidth: 1.5, borderColor: Colors.borderLight,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 5,
    gap: 6,
  },
  recTag: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  recTagText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  recIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  recName: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, lineHeight: 18 },
  recMatchRow: { backgroundColor: Colors.primaryBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  recMatchText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
  recSourceBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  recSourceDoctor: { backgroundColor: '#D1FAE5' },
  recSourceAI:     { backgroundColor: '#EDE9FE' },
  recSourceText:   { fontSize: 9, fontWeight: '800' },
  recReason:       { fontSize: 11, color: Colors.textSecondary, lineHeight: 15 },
  recEmptyWrap:    { width: 260, paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },
  recEmptyText:    { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Split row
  splitRow: { flexDirection: 'row', gap: 12 },

  // Next Visit Card
  visitCard: {
    width: SPLIT_W, backgroundColor: Colors.cardBg, borderRadius: 20, padding: 14,
    borderWidth: 1.5, borderColor: Colors.borderMid,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5,
  },
  visitAvatarWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  visitDoctor: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  visitTreatment: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  visitTime: { fontSize: 10, color: Colors.textMuted, marginTop: 4, marginBottom: 10 },
  visitBtns: { gap: 6 },
  visitBtnLight: {
    borderWidth: 1.5, borderColor: Colors.borderMid, borderRadius: 10,
    paddingVertical: 6, alignItems: 'center',
  },
  visitBtnLightText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  visitBtnDark: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingVertical: 7, alignItems: 'center',
  },
  visitBtnDarkText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Routine Card
  routineCard: {
    width: SPLIT_W, backgroundColor: Colors.cardBg, borderRadius: 20, padding: 14,
    borderWidth: 1.5, borderColor: Colors.borderMid,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5,
  },
  routineCardTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
  routineCardSub: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginBottom: 10 },
  routineRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  routineCheck: {
    width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  routineCheckDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  routineItemLabel: { fontSize: 11, fontWeight: '600', color: Colors.textPrimary, flex: 1 },

  // SOS
  sosBtn: {
    position: 'absolute', bottom: 106, right: 20,
    width: 58, height: 58, borderRadius: 29,
    zIndex: 999,
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 20,
  },
  sosBtnInner: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  sosBtnText: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
});
