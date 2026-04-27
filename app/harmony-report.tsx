import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  Dimensions, Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { MOCK_SCANS, MOCK_TREATMENTS, type ScanConcern } from '../constants/mockData';
import { useHealthProfile } from '../context/HealthProfileContext';
import type { AnalyzeScanResponse } from '../services/api';

const { width } = Dimensions.get('window');
type Tab = 'overview' | 'concerns' | 'recommendations';

// ─── Scan meta ────────────────────────────────────────────────────
const SCAN_META: Record<string, { gradient: [string, string]; label: string; accentColor: string }> = {
  face:   { gradient: ['#3B0764', '#7C3AED'], label: 'Facial Harmony Report',  accentColor: '#A78BFA' },
  skin:   { gradient: ['#831843', '#DB2777'], label: 'Skin Analysis Report',   accentColor: '#F9A8D4' },
  dental: { gradient: ['#0C4A6E', '#0284C7'], label: 'Dental Health Report',   accentColor: '#7DD3FC' },
};

// ─── Severity config ──────────────────────────────────────────────
const SEV: Record<ScanConcern['severity'], { label: string; color: string; bg: string; dot: string }> = {
  low:    { label: 'Low',    color: '#16A34A', bg: '#F0FDF4', dot: '#22C55E' },
  medium: { label: 'Medium', color: '#B45309', bg: '#FFFBEB', dot: '#F59E0B' },
  high:   { label: 'High',   color: '#B91C1C', bg: '#FFF1F2', dot: '#EF4444' },
};

// ─── Animated score ring ──────────────────────────────────────────
function ScoreRing({ score, color, size = 110 }: { score: number; color: string; size?: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let current = 0;
    const step = Math.ceil(score / 40); // ~40 steps
    const id = setInterval(() => {
      current = Math.min(current + step, score);
      setDisplayed(current);
      if (current >= score) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [score]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background ring */}
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 7, borderColor: color + '28' }} />
      {/* Filled ring — opacity represents score */}
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 7, borderColor: color, opacity: score / 100 }} />
      <Text style={{ fontSize: 28, fontWeight: '900', color }}>{displayed}</Text>
      <Text style={{ fontSize: 11, color: color + 'BB', fontWeight: '700', marginTop: -2 }}>/ 100</Text>
    </View>
  );
}

// ─── Animated horizontal bar ─────────────────────────────────────
function ScoreBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value / 100, duration: 900, delay, useNativeDriver: false }).start();
  }, [value]);
  return (
    <View style={{ height: 6, backgroundColor: color + '18', borderRadius: 3, overflow: 'hidden' }}>
      <Animated.View style={{
        height: '100%',
        width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        backgroundColor: color,
        borderRadius: 3,
      }} />
    </View>
  );
}

// ─── Before / After placeholder ──────────────────────────────────
function BeforeAfterCard({ scanType, accentColor }: { scanType: string; accentColor: string }) {
  const [active, setActive] = useState<'before' | 'after'>('before');
  const sliderAnim = useRef(new Animated.Value(0)).current;

  const toggle = (side: 'before' | 'after') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActive(side);
    Animated.spring(sliderAnim, { toValue: side === 'after' ? 1 : 0, useNativeDriver: true, friction: 7 }).start();
  };

  const icons: Record<string, string> = { face: '😊', skin: '🧖', dental: '🦷' };

  return (
    <View style={ba.container}>
      {/* Toggle */}
      <View style={ba.toggle}>
        <View style={[ba.slider, { left: active === 'after' ? '50%' : 0 }]} />
        <Pressable style={ba.toggleBtn} onPress={() => toggle('before')}>
          <Text style={[ba.toggleText, active === 'before' && ba.toggleTextActive]}>Before</Text>
        </Pressable>
        <Pressable style={ba.toggleBtn} onPress={() => toggle('after')}>
          <Text style={[ba.toggleText, active === 'after' && ba.toggleTextActive]}>After</Text>
        </Pressable>
      </View>

      {/* Image placeholder */}
      <View style={[ba.imagePlaceholder, { borderColor: accentColor + '40' }]}>
        <LinearGradient
          colors={active === 'before' ? ['#1E1B4B', '#312E81'] : ['#14532D', '#166534']}
          style={ba.imageGradient}
        >
          <Text style={{ fontSize: 52 }}>{icons[scanType] ?? '✨'}</Text>
          <Text style={ba.imageLabel}>
            {active === 'before' ? 'Current State' : 'Simulated Outcome'}
          </Text>
          <Text style={ba.imageSubLabel}>
            {active === 'before' ? 'From your scan' : 'AI projection after treatment'}
          </Text>
        </LinearGradient>
      </View>

      {/* Disclaimer */}
      <View style={ba.disclaimer}>
        <Text style={ba.disclaimerIcon}>ℹ️</Text>
        <Text style={ba.disclaimerText}>
          This is a simulated outcome. Actual results may vary based on individual factors, treatment adherence, and biological response. Consult a qualified doctor before proceeding.
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────
export default function HarmonyReportScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ scanId?: string; type?: string; _result?: string }>();
  const scanId    = Array.isArray(rawParams.scanId)   ? rawParams.scanId[0]   : rawParams.scanId;
  const typeParam = Array.isArray(rawParams.type)     ? rawParams.type[0]     : rawParams.type;
  const rawResult = Array.isArray(rawParams._result)  ? rawParams._result[0]  : rawParams._result;

  const [tab, setTab] = useState<Tab>('overview');
  const [apiTreatments, setApiTreatments] = useState<PatientTreatment[] | null>(null);
  const { healthProfile } = useHealthProfile();
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Parse real API result if passed from processing.tsx
  const apiResult: AnalyzeScanResponse | null = (() => {
    if (!rawResult) return null;
    try { return JSON.parse(rawResult) as AnalyzeScanResponse; } catch { return null; }
  })();

  // Unified scan record
  const mockScan = MOCK_SCANS.find((s) => s.id === scanId)
    ?? MOCK_SCANS.find((s) => s.type === typeParam)
    ?? MOCK_SCANS[0];

  const scan = apiResult
    ? {
        id:              apiResult.scanId,
        type:            apiResult.type,
        date:            new Date(apiResult.createdAt),
        scores:          apiResult.scores ?? mockScan.scores,
        findings:        apiResult.concerns.map((c) => c.note ?? c.area),
        concerns:        apiResult.concerns,
        recommendations: apiResult.recommendedTreatments.map((r) => r.name),
        urgency:         apiResult.urgency,
        beforeAfterKey:  mockScan.beforeAfterKey,
      }
    : { ...mockScan, date: new Date(mockScan.date) };

  const meta       = SCAN_META[scan.type]  ?? SCAN_META['face'];
  const scoreColor = scan.scores.overall >= 80 ? Colors.success : scan.scores.overall >= 60 ? Colors.warning : Colors.danger;
  const urgencyTier = scan.urgency === 'high' ? 3 : scan.urgency === 'medium' ? 2 : 1;

  const subScores = [
    scan.scores.symmetry !== undefined && { label: 'Symmetry',     value: scan.scores.symmetry, color: Colors.primary },
    scan.scores.skin     !== undefined && { label: 'Skin Health',  value: scan.scores.skin,     color: Colors.pink    },
    scan.scores.dental   !== undefined && { label: 'Dental',       value: scan.scores.dental,   color: Colors.teal    },
  ].filter(Boolean) as { label: string; value: number; color: string }[];

  // Populate treatments from CF response or fall back to mock
  useEffect(() => {
    if (tab !== 'recommendations' || apiTreatments !== null) return;
    if (apiResult?.recommendedTreatments?.length) {
      setApiTreatments(
        apiResult.recommendedTreatments.map((r) => ({
          id:       r.id,
          name:     r.name,
          status:   'active' as const,
          source:   'doctor' as const,
          reason:   r.reason,
          category: undefined,
        })),
      );
    } else {
      setApiTreatments([]);
    }
  }, [tab]);

  const recommended = apiTreatments !== null && apiTreatments.length > 0
    ? apiTreatments.map((at) => {
        const mock = MOCK_TREATMENTS.find((m) => m.name === at.name);
        return {
          id: at.id, name: at.name,
          tagline: mock?.tagline ?? at.about ?? '',
          gradient: (at.gradient ?? mock?.gradient ?? ['#7C3AED', '#A855F7']) as [string, string],
          icon: at.icon ?? mock?.icon ?? '✨',
          tier: mock?.tier ?? 1, tierLabel: mock?.tierLabel ?? '',
          aiMatchScore: at.aiMatchScore,
        };
      })
    : MOCK_TREATMENTS.filter((t) => scan.recommendations.includes(t.name));

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview',         label: 'Overview' },
    { key: 'concerns',         label: `Concerns${scan.concerns?.length ? ` (${scan.concerns.length})` : ''}` },
    { key: 'recommendations',  label: 'Treatments' },
  ];

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <LinearGradient colors={meta.gradient} style={s.header}>
          <SafeAreaView edges={['top']}>
            <Animated.View style={{ opacity: headerFade }}>
              <View style={s.headerTopRow}>
                <Pressable onPress={() => router.back()} style={s.backBtn} android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}>
                  <Text style={{ fontSize: 24, color: '#fff', lineHeight: 28 }}>‹</Text>
                </Pressable>
                <Text style={s.headerLabel}>{meta.label}</Text>
                <View style={{ width: 40 }} />
              </View>

              {/* Score + date row */}
              <View style={s.scoreRow}>
                <ScoreRing score={scan.scores.overall} color={meta.accentColor} size={108} />
                <View style={s.scoreInfo}>
                  <Text style={s.scoreInfoDate}>
                    {scan.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  <Text style={s.scoreInfoLabel}>Overall Score</Text>
                  <View style={[s.urgencyChip, {
                    backgroundColor: urgencyTier >= 3 ? '#FEE2E2' : urgencyTier === 2 ? '#FEF3C7' : '#D1FAE5',
                  }]}>
                    <View style={[s.urgencyDot, {
                      backgroundColor: urgencyTier >= 3 ? '#EF4444' : urgencyTier === 2 ? '#F59E0B' : '#22C55E',
                    }]} />
                    <Text style={[s.urgencyText, {
                      color: urgencyTier >= 3 ? '#B91C1C' : urgencyTier === 2 ? '#92400E' : '#065F46',
                    }]}>
                      {scan.urgency.charAt(0).toUpperCase() + scan.urgency.slice(1)} Priority
                    </Text>
                  </View>

                  {/* Sub-scores */}
                  {subScores.map((m) => (
                    <View key={m.label} style={s.miniScoreRow}>
                      <Text style={s.miniScoreLabel}>{m.label}</Text>
                      <View style={s.miniBarWrap}>
                        <ScoreBar value={m.value} color={m.color} />
                      </View>
                      <Text style={[s.miniScoreVal, { color: m.color }]}>{m.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>

        {/* ── Urgent Banner ──────────────────────────────────────── */}
        {urgencyTier >= 2 && (
          <View style={[s.urgencyBanner, {
            backgroundColor: urgencyTier >= 3 ? '#FFF1F2' : '#FFFBEB',
            borderColor:     urgencyTier >= 3 ? '#FCA5A5' : '#FDE68A',
          }]}>
            <Text style={[s.urgencyBannerText, { color: urgencyTier >= 3 ? '#B91C1C' : '#92400E' }]}>
              {urgencyTier >= 3
                ? '🚨 Doctor consultation strongly recommended'
                : '⚠️ Professional assessment advised for best results'}
            </Text>
          </View>
        )}

        {/* ── Tab Bar ────────────────────────────────────────────── */}
        <View style={s.tabBar}>
          {tabs.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t.key); }}
              style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
              android_ripple={{ color: 'rgba(124,58,237,0.08)', borderless: true }}
            >
              <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ══════════════ OVERVIEW TAB ═══════════════════════════ */}
        {tab === 'overview' && (
          <View style={s.tabContent}>

            {/* Findings */}
            <Text style={s.sectionLabel}>KEY FINDINGS</Text>
            <View style={s.card}>
              {scan.findings.map((f, i) => (
                <View key={i} style={[s.findingRow, i > 0 && s.rowBorder]}>
                  <View style={[s.findingBullet, { backgroundColor: scoreColor }]} />
                  <Text style={s.findingText}>{f}</Text>
                </View>
              ))}
            </View>

            {/* AI Interpretation */}
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>AI INTERPRETATION</Text>
            <View style={[s.card, s.aiCard]}>
              <View style={s.aiChip}>
                <Text style={s.aiChipText}>🤖 AI Analysis</Text>
              </View>
              <Text style={s.aiText}>
                {scan.type === 'face'
                  ? `Your facial harmony score of ${scan.scores.overall}/100 indicates ${scan.scores.overall >= 80 ? 'excellent' : 'good'} proportions. ${scan.findings.join(' ')}. A few areas of improvement were identified — see the Concerns tab for details.`
                  : scan.type === 'skin'
                  ? `Skin health scored ${scan.scores.overall}/100. Analysis detected ${scan.findings.length} notable observations including hydration, pigmentation, and surface texture patterns. Review the Concerns tab for severity-graded details.`
                  : `Dental health scored ${scan.scores.overall}/100. ${scan.findings.join(' ')}. Overall dental structure appears healthy with minor cosmetic areas noted.`}
              </Text>
            </View>

            {/* Before / After */}
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>BEFORE & AFTER PROJECTION</Text>
            <BeforeAfterCard scanType={scan.type} accentColor={meta.accentColor} />

            {/* Health Context */}
            {healthProfile && (
              <>
                <Text style={[s.sectionLabel, { marginTop: 20 }]}>YOUR HEALTH CONTEXT</Text>
                <View style={s.card}>
                  <Text style={s.healthNote}>
                    The following details from your health profile were considered in this analysis.
                  </Text>
                  {healthProfile.conditions?.length > 0 && !healthProfile.conditions.includes('none') && (
                    <View style={[s.healthRow, s.rowBorder]}>
                      <Text style={s.healthIcon}>🏥</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.healthRowLabel}>Medical Conditions</Text>
                        <Text style={s.healthRowValue}>{healthProfile.conditions.join(', ')}</Text>
                      </View>
                    </View>
                  )}
                  {healthProfile.medications?.length > 0 && !healthProfile.medications.includes('none') && (
                    <View style={[s.healthRow, s.rowBorder]}>
                      <Text style={s.healthIcon}>💊</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.healthRowLabel}>Current Medications</Text>
                        <Text style={s.healthRowValue}>{healthProfile.medications.join(', ')}</Text>
                      </View>
                    </View>
                  )}
                  {(healthProfile.pregnant || healthProfile.onBloodThinners) && (
                    <View style={[s.flagRow, { marginTop: 10 }]}>
                      <Text style={s.flagText}>
                        ⚠️ Active flags: {[
                          healthProfile.pregnant && 'Pregnant',
                          healthProfile.onBloodThinners && 'Blood thinners',
                        ].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* ══════════════ CONCERNS TAB ════════════════════════════ */}
        {tab === 'concerns' && (
          <View style={s.tabContent}>
            {(!scan.concerns || scan.concerns.length === 0) ? (
              <View style={[s.card, { alignItems: 'center', paddingVertical: 40 }]}>
                <Text style={{ fontSize: 44 }}>✅</Text>
                <Text style={s.emptyTitle}>No Concerns Detected</Text>
                <Text style={s.emptySubtitle}>Your scan looks excellent. Keep up your current routine.</Text>
              </View>
            ) : (
              <>
                <Text style={s.sectionLabel}>
                  {scan.concerns.length} AREA{scan.concerns.length > 1 ? 'S' : ''} IDENTIFIED
                </Text>
                {scan.concerns.map((c, i) => {
                  const cfg = SEV[c.severity];
                  return (
                    <View key={i} style={[s.concernCard, { borderLeftColor: cfg.dot }]}>
                      <View style={s.concernHeader}>
                        <Text style={s.concernArea}>{c.area}</Text>
                        <View style={[s.sevChip, { backgroundColor: cfg.bg }]}>
                          <View style={[s.sevDot, { backgroundColor: cfg.dot }]} />
                          <Text style={[s.sevLabel, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      </View>
                      <Text style={s.concernNote}>{c.note}</Text>
                    </View>
                  );
                })}

                {/* Severity legend */}
                <View style={[s.card, { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 }]}>
                  {(['low', 'medium', 'high'] as const).map((sev) => (
                    <View key={sev} style={{ alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: SEV[sev].dot }} />
                      <Text style={{ fontSize: 11, color: Colors.textMuted, fontWeight: '600' }}>
                        {SEV[sev].label}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={s.disclaimerStandalone}>
                  <Text style={s.disclaimerStandaloneText}>
                    ℹ️ These are AI-generated observations. They are not a medical diagnosis. Please consult a qualified doctor before making any treatment decisions.
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ══════════════ RECOMMENDATIONS TAB ════════════════════ */}
        {tab === 'recommendations' && (
          <View style={s.tabContent}>
            <Text style={s.sectionLabel}>RECOMMENDED TREATMENTS</Text>

            {/* Loading state */}
            {apiTreatments === null && apiResult !== null && (
              <View style={[s.card, { alignItems: 'center', paddingVertical: 24 }]}>
                <Text style={{ fontSize: 13, color: Colors.textMuted }}>Loading treatments…</Text>
              </View>
            )}

            {recommended.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/treatment-info', params: { treatmentId: t.id } }); }}
                android_ripple={{ color: 'rgba(124,58,237,0.06)' }}
                style={s.treatCard}
              >
                <LinearGradient colors={t.gradient} style={s.treatGradient}>
                  <Text style={{ fontSize: 34 }}>{t.icon}</Text>
                  {t.tierLabel ? (
                    <View style={[s.tierBadge, { backgroundColor: t.tier === 1 ? '#22C55E' : t.tier === 2 ? '#F59E0B' : '#EF4444' }]}>
                      <Text style={s.tierText}>{t.tierLabel}</Text>
                    </View>
                  ) : null}
                </LinearGradient>
                <View style={s.treatBody}>
                  <Text style={s.treatName}>{t.name}</Text>
                  <Text style={s.treatTagline}>{t.tagline}</Text>
                  {t.aiMatchScore != null && (
                    <View style={s.matchRow}>
                      <View style={[s.matchBar, { width: `${t.aiMatchScore}%` as any }]} />
                      <Text style={s.matchPct}>🤖 {t.aiMatchScore}% match</Text>
                    </View>
                  )}
                  {/* Pricing is ALWAYS locked pre-consultation */}
                  <View style={s.priceLockRow}>
                    <Text style={s.priceLockIcon}>🔒</Text>
                    <Text style={s.priceLockText}>Pricing available after doctor consultation</Text>
                  </View>
                </View>
              </Pressable>
            ))}

            {recommended.length === 0 && apiTreatments !== null && (
              <View style={[s.card, { alignItems: 'center', paddingVertical: 40 }]}>
                <Text style={{ fontSize: 44 }}>✅</Text>
                <Text style={s.emptyTitle}>No Treatments Needed</Text>
                <Text style={s.emptySubtitle}>Your results look great. Maintain your current routine.</Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* ── Fixed CTA ──────────────────────────────────────────────── */}
      <View style={s.bottomCta}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/ai-report', params: { scanId: scan.id, type: scan.type } }); }}
          android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
          style={s.ctaOutlined}
        >
          <Text style={s.ctaOutlinedText}>AI Report</Text>
        </Pressable>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/care/consult-doctor'); }}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}
        >
          <LinearGradient colors={['#5B21B6', '#7C3AED']} style={s.ctaBtn}>
            <Text style={s.ctaText}>Book Consultation</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Before/After styles ─────────────────────────────────────────
const ba = StyleSheet.create({
  container:         { marginHorizontal: 0 },
  toggle:            { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 3, marginBottom: 12, position: 'relative' },
  slider:            { position: 'absolute', top: 3, bottom: 3, width: '50%', backgroundColor: '#fff', borderRadius: 10, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4 }, android: { elevation: 3 } }) },
  toggleBtn:         { flex: 1, paddingVertical: 8, alignItems: 'center' },
  toggleText:        { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  toggleTextActive:  { color: Colors.textPrimary },
  imagePlaceholder:  { borderRadius: 18, overflow: 'hidden', borderWidth: 1.5, marginBottom: 12 },
  imageGradient:     { height: 180, alignItems: 'center', justifyContent: 'center', gap: 8 },
  imageLabel:        { fontSize: 16, fontWeight: '800', color: '#fff' },
  imageSubLabel:     { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  disclaimer:        { flexDirection: 'row', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  disclaimerIcon:    { fontSize: 14, lineHeight: 20 },
  disclaimerText:    { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
});

// ─── Main styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 20 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.92)', flex: 1, textAlign: 'center' },

  // Score row
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  scoreInfo: { flex: 1, gap: 6 },
  scoreInfoDate: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  scoreInfoLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

  urgencyChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  urgencyDot: { width: 7, height: 7, borderRadius: 4 },
  urgencyText: { fontSize: 11, fontWeight: '700' },

  miniScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniScoreLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', width: 72 },
  miniBarWrap: { flex: 1 },
  miniScoreVal: { fontSize: 11, fontWeight: '700', width: 24, textAlign: 'right' },

  // Urgency banner
  urgencyBanner: { marginHorizontal: 16, marginTop: 14, borderRadius: 12, padding: 12, borderWidth: 1 },
  urgencyBannerText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // Tab bar
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: '#E2E8F0', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 2 } }) },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  tabTextActive: { color: '#fff' },

  // Tab content
  tabContent: { padding: 16, gap: 0 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.2, marginBottom: 10, marginTop: 2 },

  // Card
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 4, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },

  // Findings
  findingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  findingBullet: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  findingText: { fontSize: 14, color: '#374151', lineHeight: 20, flex: 1 },

  // AI card
  aiCard: { gap: 10 },
  aiChip: { backgroundColor: '#EDE9FE', borderRadius: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4 },
  aiChipText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  aiText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },

  // Health context
  healthNote: { fontSize: 12, color: Colors.textMuted, lineHeight: 18, marginBottom: 8 },
  healthRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  healthIcon: { fontSize: 18 },
  healthRowLabel: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  healthRowValue: { fontSize: 13, color: Colors.textSecondary },
  flagRow: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10 },
  flagText: { fontSize: 12, color: '#B91C1C', fontWeight: '600' },

  // Concerns
  concernCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderLeftWidth: 4, borderWidth: 1, borderColor: '#E2E8F0', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }, android: { elevation: 2 } }) },
  concernHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  concernArea: { fontSize: 15, fontWeight: '800', color: '#111827', flex: 1 },
  sevChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  sevDot: { width: 7, height: 7, borderRadius: 4 },
  sevLabel: { fontSize: 11, fontWeight: '700' },
  concernNote: { fontSize: 13, color: '#4B5563', lineHeight: 20 },
  disclaimerStandalone: { backgroundColor: '#F0F9FF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BAE6FD', marginTop: 8 },
  disclaimerStandaloneText: { fontSize: 12, color: '#0C4A6E', lineHeight: 18 },

  // Treatments
  treatCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 }, android: { elevation: 3 } }) },
  treatGradient: { height: 88, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  tierBadge: { position: 'absolute', bottom: 10, right: 12, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tierText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  treatBody: { padding: 14, gap: 6 },
  treatName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  treatTagline: { fontSize: 12, color: Colors.textMuted },
  matchRow: { position: 'relative', height: 4, backgroundColor: '#EDE9FE', borderRadius: 2, marginTop: 2 },
  matchBar: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  matchPct: { fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 4 },
  priceLockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  priceLockIcon: { fontSize: 13 },
  priceLockText: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },

  // Empty states
  emptyTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 14 },
  emptySubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 20 },

  // CTA
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(248,247,255,0.97)', paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0', flexDirection: 'row', gap: 10 },
  ctaBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  ctaOutlined: { height: 52, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1.5, borderColor: '#DDD6FE' },
  ctaOutlinedText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
