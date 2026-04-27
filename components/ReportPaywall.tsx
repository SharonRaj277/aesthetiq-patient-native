/**
 * ReportPaywall — per-scan unlock overlay for AI reports.
 *
 * Facial domain: High-conversion teaser showing 1 strength + 1 concern
 *   visible above a blurred/locked section with curiosity-driven CTA.
 *
 * Skin / Dental: Standard blur overlay with score teaser + feature list.
 *
 * CRITICAL: Urgency warnings are rendered ABOVE this component in ai-report.tsx
 *           and are never hidden regardless of unlock state.
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, Easing,
  Platform, Dimensions, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import {
  REPORT_UNLOCK_PRICE,
  REPORT_UNLOCK_CURRENCY,
  type PaymentStatus,
} from '../services/reportUnlockService';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────
export interface FacialTeaserData {
  topStrength: string;   // e.g. "Your facial symmetry is well balanced"
  topConcern: string;    // e.g. "Mild jawline asymmetry detected"
  improvementsCount: number;  // shown in subtext
  scoreLabel: string;    // e.g. "Facial balance: Good"
}

export interface SkinTeaserData {
  overallScore: number;     // e.g. 72
  topIssue: string;         // e.g. "Mild acne detected"
  issueIcon: string;        // e.g. "🔴"
  concernsCount: number;    // drives "We found X key concerns"
}

export interface DentalTeaserData {
  overallScore: number;           // e.g. 58
  urgencyTier: 1 | 2 | 3 | 4;   // 1=Routine 2=Early 3=Active 4=Urgent
  urgencyReason: string;          // e.g. "Possible early-stage decay or gum recession"
}

interface ReportPaywallProps {
  isUnlocked: boolean;
  scanType: 'face' | 'skin' | 'dental';
  overallScore: number;
  findingsCount: number;
  concernsCount: number;
  summarySnippet: string;
  onUnlock: () => Promise<void>;
  paymentStatus: PaymentStatus;
  paymentError?: string;
  /** Facial-only teaser data — enables high-conversion facial teaser UI */
  facialTeaser?: FacialTeaserData;
  /** Skin-only teaser data — enables high-conversion skin teaser UI */
  skinTeaser?: SkinTeaserData;
  /** Dental-only teaser data — enables urgency-driven dental teaser UI */
  dentalTeaser?: DentalTeaserData;
}

// ─── Theme config per domain ──────────────────────────────────────
const DOMAIN_THEME = {
  face:   { gradient: ['#2E1065', '#6D28D9'] as [string, string], accent: '#A78BFA', label: 'Facial Harmony', icon: '✨' },
  skin:   { gradient: ['#6B21A8', '#BE185D'] as [string, string], accent: '#F9A8D4', label: 'Skin Analysis',  icon: '🧬' },
  dental: { gradient: ['#0C4A6E', '#0369A1'] as [string, string], accent: '#7DD3FC', label: 'Dental Health',  icon: '🦷' },
};

const FACIAL_BULLETS = [
  { icon: '⚖️', text: 'Detailed symmetry breakdown across 12 landmarks' },
  { icon: '📐', text: 'Jawline angle, chin projection & proportion analysis' },
  { icon: '🧠', text: 'AI interpretation with clinical measurements' },
  { icon: '💊', text: 'Personalized treatment plan with measurement justification' },
];

const SKIN_BULLETS = [
  { icon: '💡', text: 'Multi-light skin insights (6 light types)' },
  { icon: '🔬', text: 'Acne & pigmentation analysis' },
  { icon: '💊', text: 'Personalised treatment plan' },
];

const DENTAL_BULLETS = [
  { icon: '🦷', text: 'Detailed tooth & gum analysis' },
  { icon: '🩺', text: 'Pain-based diagnosis insights' },
  { icon: '💊', text: 'Treatment recommendations' },
];

// Maps urgency tier → plausible concern count for the dynamic subtext
const DENTAL_CONCERN_COUNT: Record<1 | 2 | 3 | 4, number> = { 1: 1, 2: 2, 3: 3, 4: 4 };

const DENTAL_URGENCY_CFG = {
  1: { label: 'Routine',       bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', icon: '✅', barColor: '#22C55E' },
  2: { label: 'Early Concern', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: '⚠️', barColor: '#F59E0B' },
  3: { label: 'Active Issue',  bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412', icon: '🔶', barColor: '#F97316' },
  4: { label: 'Urgent',        bg: '#FFF1F2', border: '#FECACA', text: '#991B1B', icon: '🚨', barColor: '#EF4444' },
} as const;

const GENERIC_FEATURES = [
  { icon: '📊', text: 'Full clinical measurements & scores' },
  { icon: '🧠', text: 'AI interpretation & analysis' },
  { icon: '💊', text: 'Personalised treatment recommendations' },
  { icon: '📐', text: 'Detailed concern breakdown' },
  { icon: '🔬', text: 'Domain-specific deep analysis' },
];

// ─── Shared animation hook ────────────────────────────────────────
function usePaywallAnims(paymentStatus: PaymentStatus) {
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(24)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });
  return { fadeAnim, slideAnim, shimmerTranslate, pulseAnim };
}

// ─────────────────────────────────────────────────────────────────
// FACIAL TEASER PAYWALL  (high-conversion, curiosity-driven)
// ─────────────────────────────────────────────────────────────────
function FacialPaywall({
  facialTeaser,
  onUnlock,
  paymentStatus,
  paymentError,
}: {
  facialTeaser: FacialTeaserData;
  onUnlock: () => Promise<void>;
  paymentStatus: PaymentStatus;
  paymentError?: string;
}) {
  const { fadeAnim, slideAnim, shimmerTranslate, pulseAnim } = usePaywallAnims(paymentStatus);
  const isProcessing = paymentStatus === 'processing';
  const lockBounce = useRef(new Animated.Value(0)).current;

  // Gentle lock bounce on mount
  useEffect(() => {
    Animated.sequence([
      Animated.delay(600),
      Animated.spring(lockBounce, { toValue: -8, useNativeDriver: true, speed: 14, bounciness: 10 }),
      Animated.spring(lockBounce, { toValue: 0,  useNativeDriver: true, speed: 10, bounciness: 8  }),
    ]).start();
  }, []);

  return (
    <>
      {/* ── VISIBLE FREE SECTION ────────────────────────────── */}
      {/* Score label */}
      <View style={fp.scoreLabelRow}>
        <View style={fp.scoreLabelBadge}>
          <Text style={fp.scoreLabelText}>{facialTeaser.scoreLabel}</Text>
        </View>
      </View>

      {/* Strength preview */}
      <View style={fp.teaserCard}>
        <View style={fp.teaserCardHeader}>
          <View style={fp.teaserStrengthDot} />
          <Text style={fp.teaserCardLabel}>STRENGTH DETECTED</Text>
        </View>
        <View style={fp.teaserStrengthRow}>
          <Text style={fp.teaserStrengthIcon}>✅</Text>
          <Text style={fp.teaserStrengthText}>{facialTeaser.topStrength}</Text>
        </View>
      </View>

      {/* Concern preview */}
      <View style={[fp.teaserCard, fp.teaserConcernCard]}>
        <View style={fp.teaserCardHeader}>
          <View style={[fp.teaserStrengthDot, { backgroundColor: '#F97316' }]} />
          <Text style={fp.teaserCardLabel}>AREA FOR IMPROVEMENT</Text>
        </View>
        <View style={fp.teaserStrengthRow}>
          <Text style={fp.teaserStrengthIcon}>⚠️</Text>
          <Text style={[fp.teaserStrengthText, { color: '#92400E' }]}>{facialTeaser.topConcern}</Text>
        </View>
      </View>

      {/* ── BLURRED SECTION PREVIEW ─────────────────────────── */}
      {/* These ghost cards simulate blurred content underneath */}
      <View style={fp.blurredZone}>
        <BlurView intensity={Platform.OS === 'ios' ? 18 : 8} style={StyleSheet.absoluteFill} />

        {/* Gradient fade from bottom — deepens the blur visually */}
        <LinearGradient
          colors={['rgba(248,247,255,0)', 'rgba(248,247,255,0.7)', 'rgba(248,247,255,0.97)']}
          style={fp.blurGradient}
          pointerEvents="none"
        />

        {/* Ghost content — adds depth before blur cuts in */}
        <View style={fp.ghostStack} pointerEvents="none">
          {['📐  Clinical Measurements', '⚖️  Symmetry Breakdown', '🔍  Detailed analysis (locked)', '💊  Treatment plan (locked)'].map((item, i) => (
            <View key={i} style={[fp.ghostCard, { opacity: 0.35 - i * 0.06 }]}>
              <Text style={fp.ghostCardText}>{item}</Text>
              <View style={fp.ghostBars}>
                <View style={[fp.ghostBar, { width: '72%' }]} />
                <View style={[fp.ghostBar, { width: '48%' }]} />
              </View>
            </View>
          ))}
        </View>

        {/* ── Lock Overlay CTA ─────────────────────────────── */}
        <Animated.View
          style={[fp.lockOverlay, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Lock icon */}
          <Animated.View style={[fp.lockIconWrap, { transform: [{ translateY: lockBounce }] }]}>
            <LinearGradient colors={['#2E1065', '#7C3AED']} style={fp.lockCircle}>
              <Text style={fp.lockEmoji}>🔒</Text>
            </LinearGradient>
          </Animated.View>

          <Text style={fp.lockTitle}>Unlock Your Facial Insights</Text>
          <Text style={fp.lockSubtext}>
            We found <Text style={fp.lockSubtextBold}>{facialTeaser.improvementsCount} key concerns</Text> in your scan
          </Text>

          {/* Bullet points */}
          <View style={fp.bulletList}>
            {FACIAL_BULLETS.map((b, i) => (
              <View key={i} style={fp.bulletRow}>
                <Text style={fp.bulletIcon}>{b.icon}</Text>
                <Text style={fp.bulletText}>{b.text}</Text>
              </View>
            ))}
          </View>

          {/* Trust + urgency psychology */}
          <View style={fp.psychRow}>
            <Text style={fp.psychIcon}>🏥</Text>
            <Text style={fp.psychText}>Used for professional-level screening</Text>
          </View>
          <View style={[fp.psychRow, fp.urgencyRow]}>
            <Text style={fp.psychIcon}>⏱</Text>
            <Text style={[fp.psychText, fp.urgencyText]}>Early insights lead to better outcomes</Text>
          </View>

          {/* Error */}
          {paymentError && (
            <View style={fp.errorBox}>
              <Text style={fp.errorIcon}>⚠️</Text>
              <Text style={fp.errorText}>{paymentError}</Text>
            </View>
          )}

          {/* CTA */}
          <Animated.View style={[{ width: '100%' }, { transform: [{ scale: isProcessing ? 1 : pulseAnim }] }]}>
            <Pressable
              onPress={async () => { if (!isProcessing) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); await onUnlock(); } }}
              disabled={isProcessing}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              style={fp.ctaBtnWrap}
            >
              <LinearGradient
                colors={isProcessing ? ['#94A3B8', '#64748B'] : ['#2E1065', '#7C3AED']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={fp.ctaBtn}
              >
                {isProcessing ? (
                  <View style={fp.ctaProcessingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={fp.ctaBtnText}>Processing Payment...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={fp.ctaBtnText}>
                      Unlock Full Report — {REPORT_UNLOCK_CURRENCY}{REPORT_UNLOCK_PRICE}
                    </Text>
                    {/* Shimmer */}
                    <Animated.View
                      style={[fp.shimmer, { transform: [{ translateX: shimmerTranslate }] }]}
                      pointerEvents="none"
                    />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Text style={fp.ctaSubText}>One-time access · Instant unlock · Secure payment</Text>

          <View style={fp.safetyNote}>
            <Text style={fp.safetyText}>ℹ️ Urgency warnings are always visible before unlocking</Text>
          </View>
        </Animated.View>
      </View>

    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// SKIN TEASER PAYWALL  (concern + curiosity driven)
// ─────────────────────────────────────────────────────────────────
function SkinPaywall({
  skinTeaser,
  onUnlock,
  paymentStatus,
  paymentError,
}: {
  skinTeaser: SkinTeaserData;
  onUnlock: () => Promise<void>;
  paymentStatus: PaymentStatus;
  paymentError?: string;
}) {
  const { fadeAnim, slideAnim, shimmerTranslate, pulseAnim } = usePaywallAnims(paymentStatus);
  const isProcessing = paymentStatus === 'processing';
  const lockBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(600),
      Animated.spring(lockBounce, { toValue: -8, useNativeDriver: true, speed: 14, bounciness: 10 }),
      Animated.spring(lockBounce, { toValue: 0,  useNativeDriver: true, speed: 10, bounciness: 8  }),
    ]).start();
  }, []);

  // Score colour band
  const scoreColor = skinTeaser.overallScore >= 70 ? '#22C55E' : skinTeaser.overallScore >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <>
      {/* ── VISIBLE FREE SECTION ──────────────────────────────── */}

      {/* Skin score badge */}
      <View style={sp.scoreBadgeRow}>
        <View style={[sp.scoreBadge, { borderColor: scoreColor }]}>
          <Text style={[sp.scoreBadgeNum, { color: scoreColor }]}>{skinTeaser.overallScore}</Text>
          <Text style={[sp.scoreBadgeUnit, { color: scoreColor }]}>/100</Text>
        </View>
        <View style={sp.scoreLabelWrap}>
          <Text style={sp.scoreLabelTop}>🧴 Skin Health Score</Text>
          <Text style={sp.scoreLabelSub}>Based on multi-light AI analysis</Text>
        </View>
      </View>

      {/* Top issue card */}
      <View style={sp.issueCard}>
        <View style={sp.issueCardHeader}>
          <View style={sp.issueDot} />
          <Text style={sp.issueCardLabel}>ISSUE DETECTED</Text>
        </View>
        <View style={sp.issueRow}>
          <Text style={sp.issueIcon}>{skinTeaser.issueIcon}</Text>
          <Text style={sp.issueText}>{skinTeaser.topIssue}</Text>
        </View>
        {/* Psychology line */}
        <View style={sp.earlyInsightRow}>
          <Text style={sp.earlyInsightText}>⏱ Early insights help prevent worsening</Text>
        </View>
      </View>

      {/* ── BLURRED SECTION ───────────────────────────────────── */}
      <View style={sp.blurredZone}>
        <BlurView intensity={Platform.OS === 'ios' ? 18 : 8} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(248,245,255,0)', 'rgba(248,245,255,0.72)', 'rgba(248,245,255,0.97)']}
          style={sp.blurGradient}
          pointerEvents="none"
        />

        {/* Ghost content — multi-light grid, insights, conditions, treatments */}
        <View style={sp.ghostStack} pointerEvents="none">
          {[
            '🔦  Multi-Light Analysis (6 lights)',
            '🔗  Cross-Light Insights',
            '🔍  Detailed analysis (locked)',
            '💊  Treatment plan (locked)',
          ].map((item, i) => (
            <View key={i} style={[sp.ghostCard, { opacity: 0.35 - i * 0.06 }]}>
              <Text style={sp.ghostCardText}>{item}</Text>
              <View style={sp.ghostBars}>
                <View style={[sp.ghostBar, { width: `${72 - i * 8}%` }]} />
                <View style={[sp.ghostBar, { width: `${50 - i * 6}%` }]} />
              </View>
            </View>
          ))}
        </View>

        {/* ── Lock Overlay CTA ─────────────────────────────── */}
        <Animated.View
          style={[sp.lockOverlay, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Animated.View style={[sp.lockIconWrap, { transform: [{ translateY: lockBounce }] }]}>
            <LinearGradient colors={['#6B21A8', '#BE185D']} style={sp.lockCircle}>
              <Text style={sp.lockEmoji}>🔒</Text>
            </LinearGradient>
          </Animated.View>

          <Text style={sp.lockTitle}>Unlock Your Skin Analysis</Text>
          <Text style={sp.lockSubtext}>
            We found <Text style={sp.lockSubtextBold}>{skinTeaser.concernsCount} key concerns</Text> in your scan
          </Text>

          <View style={sp.bulletList}>
            {SKIN_BULLETS.map((b, i) => (
              <View key={i} style={sp.bulletRow}>
                <Text style={sp.bulletIcon}>{b.icon}</Text>
                <Text style={sp.bulletText}>{b.text}</Text>
              </View>
            ))}
          </View>

          {/* Trust + urgency psychology */}
          <View style={sp.psychRow}>
            <Text style={sp.psychIcon}>🏥</Text>
            <Text style={sp.psychText}>Used for professional-level screening</Text>
          </View>
          <View style={[sp.psychRow, sp.urgencyRow]}>
            <Text style={sp.psychIcon}>⏱</Text>
            <Text style={[sp.psychText, sp.urgencyText]}>Early insights lead to better outcomes</Text>
          </View>

          {paymentError && (
            <View style={sp.errorBox}>
              <Text style={sp.errorIcon}>⚠️</Text>
              <Text style={sp.errorText}>{paymentError}</Text>
            </View>
          )}

          <Animated.View style={[{ width: '100%' }, { transform: [{ scale: isProcessing ? 1 : pulseAnim }] }]}>
            <Pressable
              onPress={async () => { if (!isProcessing) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); await onUnlock(); } }}
              disabled={isProcessing}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              style={sp.ctaBtnWrap}
            >
              <LinearGradient
                colors={isProcessing ? ['#94A3B8', '#64748B'] : ['#6B21A8', '#BE185D']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={sp.ctaBtn}
              >
                {isProcessing ? (
                  <View style={sp.ctaProcessingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={sp.ctaBtnText}>Processing Payment...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={sp.ctaBtnText}>
                      Unlock Full Report — {REPORT_UNLOCK_CURRENCY}{REPORT_UNLOCK_PRICE}
                    </Text>
                    <Animated.View
                      style={[sp.shimmer, { transform: [{ translateX: shimmerTranslate }] }]}
                      pointerEvents="none"
                    />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Text style={sp.ctaSubText}>One-time access · Instant unlock · Secure payment</Text>

          <View style={sp.safetyNote}>
            <Text style={sp.safetyText}>ℹ️ Urgency warnings are always visible before unlocking</Text>
          </View>
        </Animated.View>
      </View>

    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// GENERIC PAYWALL  (skin / dental)
// ─────────────────────────────────────────────────────────────────
function GenericPaywall({
  scanType,
  overallScore,
  findingsCount,
  concernsCount,
  summarySnippet,
  onUnlock,
  paymentStatus,
  paymentError,
}: Omit<ReportPaywallProps, 'isUnlocked' | 'facialTeaser'>) {
  const theme = DOMAIN_THEME[scanType];
  const { fadeAnim, slideAnim, shimmerTranslate, pulseAnim } = usePaywallAnims(paymentStatus);
  const isProcessing = paymentStatus === 'processing';

  return (
    <Animated.View style={[s.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Blur + gradient overlay */}
      <View style={s.blurOverlay}>
        <BlurView intensity={Platform.OS === 'ios' ? 45 : 20} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(248,247,255,0.55)', 'rgba(248,247,255,0.92)', 'rgba(248,247,255,0.98)']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={s.content}>
        {/* Lock icon */}
        <View style={s.lockIconWrap}>
          <LinearGradient colors={theme.gradient} style={s.lockCircle}>
            <Text style={s.lockEmoji}>🔒</Text>
          </LinearGradient>
        </View>

        <Text style={s.headingTitle}>Full Report Locked</Text>
        <Text style={s.headingSub}>
          Unlock your complete {theme.label} report with detailed analysis, measurements, and personalised recommendations.
        </Text>

        {/* Score teaser */}
        <View style={s.teaserCard}>
          <LinearGradient colors={theme.gradient} style={s.teaserGradient}>
            <View style={s.teaserScoreRow}>
              <View style={s.teaserScoreCircle}>
                <Text style={s.teaserScoreNum}>{overallScore}</Text>
                <Text style={s.teaserScoreUnit}>/100</Text>
              </View>
              <View style={s.teaserMeta}>
                <View style={s.teaserMetaRow}>
                  <Text style={s.teaserMetaIcon}>{theme.icon}</Text>
                  <Text style={s.teaserMetaLabel}>{theme.label}</Text>
                </View>
                <View style={s.teaserStatsRow}>
                  <View style={s.teaserStat}>
                    <Text style={s.teaserStatNum}>{findingsCount}</Text>
                    <Text style={s.teaserStatLabel}>Findings</Text>
                  </View>
                  <View style={s.teaserStatDivider} />
                  <View style={s.teaserStat}>
                    <Text style={s.teaserStatNum}>{concernsCount}</Text>
                    <Text style={s.teaserStatLabel}>Concerns</Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
          <View style={s.snippetWrap}>
            <Text style={s.snippetLabel}>AI SUMMARY PREVIEW</Text>
            <Text style={s.snippetText} numberOfLines={3}>{summarySnippet}</Text>
            <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']} style={s.snippetFade} />
          </View>
        </View>

        {/* Feature list */}
        <View style={s.featuresCard}>
          <Text style={s.featuresTitle}>Full report includes</Text>
          {GENERIC_FEATURES.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <Text style={s.featureIcon}>{f.icon}</Text>
              <Text style={s.featureText}>{f.text}</Text>
              <Text style={s.featureCheck}>✓</Text>
            </View>
          ))}
        </View>

        {paymentError && (
          <View style={s.errorBox}>
            <Text style={s.errorIcon}>⚠️</Text>
            <Text style={s.errorText}>{paymentError}</Text>
          </View>
        )}

        {/* CTA */}
        <Animated.View style={{ transform: [{ scale: isProcessing ? 1 : pulseAnim }] }}>
          <Pressable
            onPress={async () => { if (!isProcessing) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); await onUnlock(); } }}
            disabled={isProcessing}
            style={({ pressed }) => [s.unlockBtnWrap, pressed && !isProcessing && s.unlockBtnPressed]}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            <LinearGradient
              colors={isProcessing ? ['#94A3B8', '#64748B'] : theme.gradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.unlockBtn}
            >
              {isProcessing ? (
                <View style={s.processingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={s.unlockBtnText}>Processing Payment...</Text>
                </View>
              ) : (
                <>
                  <Text style={s.unlockBtnText}>Unlock Full Report — {REPORT_UNLOCK_CURRENCY}{REPORT_UNLOCK_PRICE}</Text>
                  <Animated.View
                    style={[s.shimmer, { transform: [{ translateX: shimmerTranslate }] }]}
                    pointerEvents="none"
                  />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <View style={s.subTextRow}>
          <Text style={s.subTextIcon}>🔐</Text>
          <Text style={s.subText}>Secure payment · Instant access · One-time unlock</Text>
        </View>
        <View style={s.safetyNote}>
          <Text style={s.safetyIcon}>ℹ️</Text>
          <Text style={s.safetyText}>Urgency warnings and critical health alerts are always visible, even before unlocking.</Text>
        </View>
      </View>

    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────
// DENTAL TEASER PAYWALL  (urgency + trust driven)
// ─────────────────────────────────────────────────────────────────
function DentalPaywall({
  dentalTeaser,
  onUnlock,
  paymentStatus,
  paymentError,
}: {
  dentalTeaser: DentalTeaserData;
  onUnlock: () => Promise<void>;
  paymentStatus: PaymentStatus;
  paymentError?: string;
}) {
  const { fadeAnim, slideAnim, shimmerTranslate, pulseAnim } = usePaywallAnims(paymentStatus);
  const isProcessing = paymentStatus === 'processing';
  const lockBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(600),
      Animated.spring(lockBounce, { toValue: -8, useNativeDriver: true, speed: 14, bounciness: 10 }),
      Animated.spring(lockBounce, { toValue: 0,  useNativeDriver: true, speed: 10, bounciness: 8  }),
    ]).start();
  }, []);

  const tierCfg = DENTAL_URGENCY_CFG[dentalTeaser.urgencyTier];
  const scoreColor = dentalTeaser.overallScore >= 70 ? '#22C55E' : dentalTeaser.overallScore >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <>
      {/* ── VISIBLE FREE SECTION ──────────────────────────────── */}

      {/* Score + urgency tier row */}
      <View style={dp.scoreRow}>
        <View style={[dp.scoreBadge, { borderColor: scoreColor }]}>
          <Text style={[dp.scoreBadgeNum, { color: scoreColor }]}>{dentalTeaser.overallScore}</Text>
          <Text style={[dp.scoreBadgeUnit, { color: scoreColor }]}>/100</Text>
        </View>
        <View style={dp.scoreLabelWrap}>
          <Text style={dp.scoreLabelTop}>🦷 Dental Health Score</Text>
          <Text style={dp.scoreLabelSub}>Visual AI screening</Text>
        </View>
      </View>

      {/* Urgency tier banner — always visible, triggers urgency */}
      <View style={[dp.urgencyCard, { backgroundColor: tierCfg.bg, borderColor: tierCfg.border }]}>
        <View style={dp.urgencyHeader}>
          <Text style={dp.urgencyIcon}>{tierCfg.icon}</Text>
          <View style={dp.urgencyTierPill}>
            <Text style={[dp.urgencyTierText, { color: tierCfg.text }]}>
              Tier {dentalTeaser.urgencyTier} — {tierCfg.label}
            </Text>
          </View>
        </View>
        {/* Tier bar */}
        <View style={dp.tierBarTrack}>
          {([1, 2, 3, 4] as const).map((t) => (
            <View
              key={t}
              style={[
                dp.tierBarSegment,
                { backgroundColor: t <= dentalTeaser.urgencyTier ? tierCfg.barColor : 'rgba(0,0,0,0.08)' },
              ]}
            />
          ))}
        </View>
        <Text style={[dp.urgencyReason, { color: tierCfg.text }]}>{dentalTeaser.urgencyReason}</Text>
      </View>

      {/* ── BLURRED SECTION ───────────────────────────────────── */}
      <View style={dp.blurredZone}>
        <BlurView intensity={Platform.OS === 'ios' ? 18 : 8} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(245,248,255,0)', 'rgba(245,248,255,0.72)', 'rgba(245,248,255,0.97)']}
          style={dp.blurGradient}
          pointerEvents="none"
        />

        {/* Ghost content */}
        <View style={dp.ghostStack} pointerEvents="none">
          {[
            '🔍  Full Visual Findings',
            '🩺  Symptom Correlation',
            '🧠  Detailed analysis (locked)',
            '💊  Treatment plan (locked)',
          ].map((item, i) => (
            <View key={i} style={[dp.ghostCard, { opacity: 0.35 - i * 0.06 }]}>
              <Text style={dp.ghostCardText}>{item}</Text>
              <View style={dp.ghostBars}>
                <View style={[dp.ghostBar, { width: `${70 - i * 8}%` }]} />
                <View style={[dp.ghostBar, { width: `${48 - i * 6}%` }]} />
              </View>
            </View>
          ))}
        </View>

        {/* ── Lock Overlay CTA ─────────────────────────────── */}
        <Animated.View
          style={[dp.lockOverlay, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Animated.View style={[dp.lockIconWrap, { transform: [{ translateY: lockBounce }] }]}>
            <LinearGradient colors={['#0C4A6E', '#0369A1']} style={dp.lockCircle}>
              <Text style={dp.lockEmoji}>🔒</Text>
            </LinearGradient>
          </Animated.View>

          <Text style={dp.lockTitle}>Unlock Your Dental Report</Text>
          <Text style={dp.lockSubtext}>
            We found <Text style={dp.lockSubtextBold}>{DENTAL_CONCERN_COUNT[dentalTeaser.urgencyTier]} key concerns</Text> in your scan
          </Text>

          <View style={dp.bulletList}>
            {DENTAL_BULLETS.map((b, i) => (
              <View key={i} style={dp.bulletRow}>
                <Text style={dp.bulletIcon}>{b.icon}</Text>
                <Text style={dp.bulletText}>{b.text}</Text>
              </View>
            ))}
          </View>

          {/* Trust + urgency psychology */}
          <View style={dp.psychRow}>
            <Text style={dp.psychIcon}>🏥</Text>
            <Text style={dp.psychText}>Used for professional-level screening</Text>
          </View>
          <View style={[dp.psychRow, dp.urgencyRow]}>
            <Text style={dp.psychIcon}>⏱</Text>
            <Text style={[dp.psychText, dp.urgencyText]}>Early insights lead to better outcomes</Text>
          </View>

          {/* Trust element */}
          <View style={dp.trustRow}>
            <Text style={dp.trustIcon}>🔬</Text>
            <Text style={dp.trustText}>Some conditions require deeper analysis beyond visuals</Text>
          </View>

          {paymentError && (
            <View style={dp.errorBox}>
              <Text style={dp.errorIcon}>⚠️</Text>
              <Text style={dp.errorText}>{paymentError}</Text>
            </View>
          )}

          <Animated.View style={[{ width: '100%' }, { transform: [{ scale: isProcessing ? 1 : pulseAnim }] }]}>
            <Pressable
              onPress={async () => { if (!isProcessing) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); await onUnlock(); } }}
              disabled={isProcessing}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              style={dp.ctaBtnWrap}
            >
              <LinearGradient
                colors={isProcessing ? ['#94A3B8', '#64748B'] : ['#0C4A6E', '#0369A1']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={dp.ctaBtn}
              >
                {isProcessing ? (
                  <View style={dp.ctaProcessingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={dp.ctaBtnText}>Processing Payment...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={dp.ctaBtnText}>
                      Unlock Full Report — {REPORT_UNLOCK_CURRENCY}{REPORT_UNLOCK_PRICE}
                    </Text>
                    <Animated.View
                      style={[dp.shimmer, { transform: [{ translateX: shimmerTranslate }] }]}
                      pointerEvents="none"
                    />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Text style={dp.ctaSubText}>One-time access · Instant unlock · Secure payment</Text>

          <View style={dp.safetyNote}>
            <Text style={dp.safetyText}>ℹ️ Urgency warnings are always visible before unlocking</Text>
          </View>
        </Animated.View>
      </View>

    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN EXPORT — routes to correct variant
// ─────────────────────────────────────────────────────────────────
export default function ReportPaywall(props: ReportPaywallProps) {
  if (props.isUnlocked) return null;

  if (props.scanType === 'face' && props.facialTeaser) {
    return (
      <FacialPaywall
        facialTeaser={props.facialTeaser}
        onUnlock={props.onUnlock}
        paymentStatus={props.paymentStatus}
        paymentError={props.paymentError}
      />
    );
  }

  if (props.scanType === 'skin' && props.skinTeaser) {
    return (
      <SkinPaywall
        skinTeaser={props.skinTeaser}
        onUnlock={props.onUnlock}
        paymentStatus={props.paymentStatus}
        paymentError={props.paymentError}
      />
    );
  }

  if (props.scanType === 'dental' && props.dentalTeaser) {
    return (
      <DentalPaywall
        dentalTeaser={props.dentalTeaser}
        onUnlock={props.onUnlock}
        paymentStatus={props.paymentStatus}
        paymentError={props.paymentError}
      />
    );
  }

  return <GenericPaywall {...props} />;
}

// ─────────────────────────────────────────────────────────────────
// FACIAL PAYWALL STYLES  (fp)
// ─────────────────────────────────────────────────────────────────
const fp = StyleSheet.create({
  // Visible teaser section
  scoreLabelRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  scoreLabelBadge: {
    alignSelf: 'flex-start', backgroundColor: '#EDE9FE',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  scoreLabelText: { fontSize: 13, fontWeight: '800', color: '#4C1D95' },

  teaserCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderLeftWidth: 4, borderLeftColor: '#22C55E',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  teaserConcernCard: { borderLeftColor: '#F97316' },
  teaserCardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  teaserStrengthDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  teaserCardLabel:   { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 },
  teaserStrengthRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  teaserStrengthIcon:{ fontSize: 18, lineHeight: 24 },
  teaserStrengthText:{ flex: 1, fontSize: 14, fontWeight: '700', color: '#166534', lineHeight: 22 },

  // Blurred locked section
  blurredZone: {
    minHeight: 560,
    marginTop: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  blurGradient: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 320,
    zIndex: 2,
  },

  // Ghost cards (visible through blur)
  ghostStack: { padding: 16, gap: 12 },
  ghostCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 10,
  },
  ghostCardText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  ghostBars:  { gap: 6 },
  ghostBar:   { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4 },

  // Lock overlay (floats over blurred zone)
  lockOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    zIndex: 10,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 20,
  },
  lockIconWrap: { marginBottom: 14 },
  lockCircle: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  lockEmoji: { fontSize: 30 },

  lockTitle:   { fontSize: 22, fontWeight: '900', color: '#1E1B4B', textAlign: 'center', marginBottom: 6 },
  lockSubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 18 },
  lockSubtextBold: { fontWeight: '800', color: '#4C1D95' },

  bulletList: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, gap: 0 },
  bulletRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F1F5F9' },
  bulletIcon: { fontSize: 16, width: 22, lineHeight: 22 },
  bulletText: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '500', lineHeight: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', width: '100%', marginBottom: 12,
  },
  errorIcon: { fontSize: 14 },
  errorText: { flex: 1, fontSize: 13, color: '#991B1B', fontWeight: '600' },

  ctaBtnWrap: { width: '100%', borderRadius: 18, overflow: 'hidden' },
  ctaBtn: {
    height: 60, alignItems: 'center', justifyContent: 'center',
    borderRadius: 18, overflow: 'hidden',
  },
  ctaBtnText: { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  ctaProcessingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shimmer: {
    position: 'absolute', top: 0, bottom: 0, width: 60,
    backgroundColor: 'rgba(255,255,255,0.18)',
    transform: [{ skewX: '-20deg' }],
  },

  // Psychology rows
  psychRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', backgroundColor: '#F8F7FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#EDE9FE', marginBottom: 8 },
  urgencyRow:  { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  psychIcon:   { fontSize: 14 },
  psychText:   { flex: 1, fontSize: 12, color: '#4C1D95', fontWeight: '700' },
  urgencyText: { color: '#92400E' },

  ctaSubText: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 12, marginBottom: 8 },
  safetyNote: {
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#BBF7D0', width: '100%', alignItems: 'center',
  },
  safetyText: { fontSize: 11, color: '#166534', fontWeight: '500' },
});

// ─────────────────────────────────────────────────────────────────
// DENTAL PAYWALL STYLES  (dp)
// ─────────────────────────────────────────────────────────────────
const dp = StyleSheet.create({
  // Score row
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  scoreBadge: {
    width: 68, height: 68, borderRadius: 34, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  scoreBadgeNum:  { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  scoreBadgeUnit: { fontSize: 9, fontWeight: '700', marginTop: -2 },
  scoreLabelWrap: { flex: 1 },
  scoreLabelTop:  { fontSize: 15, fontWeight: '800', color: '#1E1B4B', marginBottom: 3 },
  scoreLabelSub:  { fontSize: 12, color: '#94A3B8', fontWeight: '500' },

  // Urgency card
  urgencyCard: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 18, padding: 16,
    borderWidth: 1.5,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  urgencyHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  urgencyIcon:     { fontSize: 20 },
  urgencyTierPill: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  urgencyTierText: { fontSize: 13, fontWeight: '800' },
  tierBarTrack:    { flexDirection: 'row', gap: 4, marginBottom: 10 },
  tierBarSegment:  { flex: 1, height: 5, borderRadius: 3 },
  urgencyReason:   { fontSize: 13, fontWeight: '600', lineHeight: 20 },

  // Blurred zone
  blurredZone: { minHeight: 540, marginTop: 6, overflow: 'hidden', position: 'relative' },
  blurGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, zIndex: 2 },

  // Ghost cards
  ghostStack:   { padding: 16, gap: 12 },
  ghostCard:    { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  ghostCardText:{ fontSize: 14, fontWeight: '700', color: '#1E293B' },
  ghostBars:    { gap: 6 },
  ghostBar:     { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4 },

  // Lock overlay
  lockOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    zIndex: 10, alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 28, paddingTop: 20,
  },
  lockIconWrap: { marginBottom: 14 },
  lockCircle: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#0369A1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  lockEmoji: { fontSize: 30 },

  lockTitle:       { fontSize: 22, fontWeight: '900', color: '#1E1B4B', textAlign: 'center', marginBottom: 6 },
  lockSubtext:     { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 18 },
  lockSubtextBold: { fontWeight: '800', color: '#0C4A6E' },

  bulletList: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, gap: 0 },
  bulletRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F1F5F9' },
  bulletIcon: { fontSize: 16, width: 22, lineHeight: 22 },
  bulletText: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '500', lineHeight: 20 },

  // Trust element
  trustRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, width: '100%',
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 16,
  },
  trustIcon: { fontSize: 14, marginTop: 1 },
  trustText: { flex: 1, fontSize: 12, color: '#1E40AF', fontWeight: '600', lineHeight: 18 },

  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA', width: '100%', marginBottom: 12 },
  errorIcon: { fontSize: 14 },
  errorText: { flex: 1, fontSize: 13, color: '#991B1B', fontWeight: '600' },

  ctaBtnWrap:       { width: '100%', borderRadius: 18, overflow: 'hidden' },
  ctaBtn:           { height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 18, overflow: 'hidden' },
  ctaBtnText:       { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  ctaProcessingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shimmer:          { position: 'absolute', top: 0, bottom: 0, width: 60, backgroundColor: 'rgba(255,255,255,0.18)', transform: [{ skewX: '-20deg' }] },

  psychRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 8 },
  urgencyRow:  { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  psychIcon:   { fontSize: 14 },
  psychText:   { flex: 1, fontSize: 12, color: '#1E40AF', fontWeight: '700' },
  urgencyText: { color: '#92400E' },

  ctaSubText: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 12, marginBottom: 8 },
  safetyNote: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BBF7D0', width: '100%', alignItems: 'center' },
  safetyText: { fontSize: 11, color: '#166534', fontWeight: '500' },
});

// ─────────────────────────────────────────────────────────────────
// SKIN PAYWALL STYLES  (sp)
// ─────────────────────────────────────────────────────────────────
const sp = StyleSheet.create({
  // Score row
  scoreBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  scoreBadge: {
    width: 68, height: 68, borderRadius: 34, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  scoreBadgeNum:  { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  scoreBadgeUnit: { fontSize: 9, fontWeight: '700', marginTop: -2 },
  scoreLabelWrap: { flex: 1 },
  scoreLabelTop:  { fontSize: 15, fontWeight: '800', color: '#1E1B4B', marginBottom: 3 },
  scoreLabelSub:  { fontSize: 12, color: '#94A3B8', fontWeight: '500' },

  // Issue card
  issueCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderLeftWidth: 4, borderLeftColor: '#EF4444',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  issueCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  issueDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  issueCardLabel:  { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 },
  issueRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  issueIcon:       { fontSize: 18, lineHeight: 24 },
  issueText:       { flex: 1, fontSize: 14, fontWeight: '700', color: '#7F1D1D', lineHeight: 22 },
  earlyInsightRow: { backgroundColor: '#FFF7ED', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#FED7AA' },
  earlyInsightText:{ fontSize: 12, fontWeight: '700', color: '#92400E' },

  // Blurred zone
  blurredZone: { minHeight: 540, marginTop: 6, overflow: 'hidden', position: 'relative' },
  blurGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, zIndex: 2 },

  // Ghost cards
  ghostStack:   { padding: 16, gap: 12 },
  ghostCard:    { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  ghostCardText:{ fontSize: 14, fontWeight: '700', color: '#1E293B' },
  ghostBars:    { gap: 6 },
  ghostBar:     { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4 },

  // Lock overlay
  lockOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    zIndex: 10, alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 28, paddingTop: 20,
  },
  lockIconWrap: { marginBottom: 14 },
  lockCircle: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#BE185D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  lockEmoji: { fontSize: 30 },

  lockTitle:        { fontSize: 22, fontWeight: '900', color: '#1E1B4B', textAlign: 'center', marginBottom: 6 },
  lockSubtext:      { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 18 },
  lockSubtextBold:  { fontWeight: '800', color: '#7C1D6F' },

  bulletList: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, gap: 0 },
  bulletRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F1F5F9' },
  bulletIcon: { fontSize: 16, width: 22, lineHeight: 22 },
  bulletText: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '500', lineHeight: 20 },

  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA', width: '100%', marginBottom: 12 },
  errorIcon: { fontSize: 14 },
  errorText: { flex: 1, fontSize: 13, color: '#991B1B', fontWeight: '600' },

  ctaBtnWrap:       { width: '100%', borderRadius: 18, overflow: 'hidden' },
  ctaBtn:           { height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 18, overflow: 'hidden' },
  ctaBtnText:       { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  ctaProcessingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shimmer:          { position: 'absolute', top: 0, bottom: 0, width: 60, backgroundColor: 'rgba(255,255,255,0.18)', transform: [{ skewX: '-20deg' }] },

  psychRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', backgroundColor: '#FDF2F8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#F9A8D4', marginBottom: 8 },
  urgencyRow:  { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  psychIcon:   { fontSize: 14 },
  psychText:   { flex: 1, fontSize: 12, color: '#9D174D', fontWeight: '700' },
  urgencyText: { color: '#92400E' },

  ctaSubText: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 12, marginBottom: 8 },
  safetyNote: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BBF7D0', width: '100%', alignItems: 'center' },
  safetyText: { fontSize: 11, color: '#166534', fontWeight: '500' },
});

// ─────────────────────────────────────────────────────────────────
// GENERIC PAYWALL STYLES  (s)
// ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
  },
  blurOverlay: { ...StyleSheet.absoluteFillObject },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 100,
  },

  lockIconWrap: { marginBottom: 16 },
  lockCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 18 },
      android: { elevation: 12 },
    }),
  },
  lockEmoji: { fontSize: 32 },

  headingTitle: { fontSize: 24, fontWeight: '900', color: '#1E1B4B', textAlign: 'center', marginBottom: 8 },
  headingSub:   { fontSize: 14, color: '#6B7280', lineHeight: 21, textAlign: 'center', marginBottom: 24, maxWidth: 320 },

  teaserCard: {
    width: '100%', borderRadius: 22, overflow: 'hidden',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  teaserGradient:    { padding: 18 },
  teaserScoreRow:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  teaserScoreCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)' },
  teaserScoreNum:    { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 34 },
  teaserScoreUnit:   { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginTop: -4 },
  teaserMeta:        { flex: 1 },
  teaserMetaRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  teaserMetaIcon:    { fontSize: 16 },
  teaserMetaLabel:   { fontSize: 15, fontWeight: '800', color: '#fff' },
  teaserStatsRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teaserStat:        { alignItems: 'center' },
  teaserStatNum:     { fontSize: 20, fontWeight: '900', color: '#fff' },
  teaserStatLabel:   { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  teaserStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.25)' },

  snippetWrap:  { padding: 14, position: 'relative' },
  snippetLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 6 },
  snippetText:  { fontSize: 13, color: '#374151', lineHeight: 20 },
  snippetFade:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 40 },

  featuresCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  featuresTitle: { fontSize: 14, fontWeight: '800', color: '#1E1B4B', marginBottom: 12 },
  featureRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F1F5F9' },
  featureIcon:   { fontSize: 16, width: 24 },
  featureText:   { flex: 1, fontSize: 13, color: '#4B5563', fontWeight: '500' },
  featureCheck:  { fontSize: 13, fontWeight: '800', color: '#22C55E' },

  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA', width: '100%', marginBottom: 12 },
  errorIcon: { fontSize: 14 },
  errorText: { flex: 1, fontSize: 13, color: '#991B1B', fontWeight: '600' },

  unlockBtnWrap:   { width: '100%', borderRadius: 18, overflow: 'hidden' },
  unlockBtnPressed:{ opacity: 0.92 },
  unlockBtn:       { height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 18, overflow: 'hidden' },
  unlockBtnText:   { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  processingRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shimmer:         { position: 'absolute', top: 0, bottom: 0, width: 60, backgroundColor: 'rgba(255,255,255,0.15)', transform: [{ skewX: '-20deg' }] },

  subTextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 8 },
  subTextIcon:{ fontSize: 12 },
  subText:    { fontSize: 12, color: '#94A3B8', fontWeight: '600' },

  safetyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BBF7D0', width: '100%', marginTop: 4 },
  safetyIcon: { fontSize: 12, marginTop: 1 },
  safetyText: { flex: 1, fontSize: 11, color: '#166534', lineHeight: 16 },

});
