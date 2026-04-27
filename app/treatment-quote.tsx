/**
 * Treatment Quote Screen
 *
 * Shown AFTER doctor consultation — pricing is revealed here.
 * Patient reviews prescribed treatments, costs, and pays / books.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Alert, Animated, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────

type TreatmentLine = {
  id:              string;
  displayName:     string;
  sessions:        number;
  pricePerSession: number; // in INR
  isPremium?:      boolean;
  icon:            string;
};

type TreatmentQuote = {
  quoteId:      string;
  doctorName:   string;
  doctorSpec:   string;
  validUntil:   string;
  treatments:   TreatmentLine[];
  discountPct:  number;   // 0–100
  discountNote: string;
};

// ─── Mock backend fetch (POST /treatment-plan) ────────────────────

async function fetchTreatmentQuote(_consultationId: string): Promise<TreatmentQuote> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          quoteId:     'quote_042',
          doctorName:  'Dr. Priya Sharma',
          doctorSpec:  'Aesthetic Dermatologist',
          validUntil:  '9 Apr 2026',
          treatments: [
            { id: 'treat1', displayName: 'RF Microneedling',  sessions: 3, pricePerSession: 8000, isPremium: true, icon: '✨' },
            { id: 'treat2', displayName: 'Peptide Infusion',  sessions: 4, pricePerSession: 4500, isPremium: false, icon: '💧' },
            { id: 'treat5', displayName: 'Aura Facial',       sessions: 2, pricePerSession: 3500, isPremium: false, icon: '🌿' },
          ],
          discountPct:  15,
          discountNote: 'Loyalty discount — returning patient',
        }),
      1000,
    ),
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

const fmt = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

// ─── Sub-components ───────────────────────────────────────────────

function TreatmentRow({ item, index, total }: { item: TreatmentLine; index: number; total: number }) {
  const subtotal = item.sessions * item.pricePerSession;

  return (
    <View style={[styles.treatRow, index < total - 1 && styles.treatRowBorder]}>
      {/* Icon + name */}
      <View style={styles.treatLeft}>
        <View style={[styles.treatIconBox, item.isPremium && styles.treatIconBoxPremium]}>
          <Text style={styles.treatIcon}>{item.icon}</Text>
          {item.isPremium && (
            <View style={styles.premiumDot} />
          )}
        </View>
        <View style={styles.treatMeta}>
          <View style={styles.treatNameRow}>
            <Text style={styles.treatName}>{item.displayName}</Text>
            {item.isPremium && (
              <View style={styles.premiumPill}>
                <Ionicons name="star" size={9} color="#B45309" />
                <Text style={styles.premiumPillText}>Premium</Text>
              </View>
            )}
          </View>
          <Text style={styles.treatSessions}>
            {item.sessions} session{item.sessions > 1 ? 's' : ''} · {fmt(item.pricePerSession)} each
          </Text>
        </View>
      </View>

      {/* Subtotal */}
      <Text style={styles.treatSubtotal}>{fmt(subtotal)}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────

export default function TreatmentQuoteScreen() {
  const router = useRouter();
  const { consultationId } = useLocalSearchParams<{ consultationId?: string }>();

  const [quote, setQuote]     = useState<TreatmentQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  // Subtle entrance animation
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    fetchTreatmentQuote(consultationId ?? '')
      .then((data) => {
        setQuote(data);
        Animated.parallel([
          Animated.timing(fadeAnim,  { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, friction: 9,   useNativeDriver: true }),
        ]).start();
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [consultationId]);

  // ── Loading ──
  if (loading) {
    return (
      <LinearGradient colors={['#1A1235', '#2D1E5F']} style={styles.centeredFill}>
        <ActivityIndicator size="large" color="#A78BFA" />
        <Text style={styles.loadingText}>Fetching your quote…</Text>
      </LinearGradient>
    );
  }

  // ── Error ──
  if (error || !quote) {
    return (
      <SafeAreaView style={styles.centeredFill} edges={['top']}>
        <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
        <Text style={styles.errorText}>Could not load treatment quote.</Text>
        <Pressable onPress={() => router.back()} style={styles.errorBackBtn}>
          <Text style={styles.errorBackText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Calculations ──
  const grossTotal    = quote.treatments.reduce((s, t) => s + t.sessions * t.pricePerSession, 0);
  const discountAmt   = Math.round(grossTotal * (quote.discountPct / 100));
  const finalPrice    = grossTotal - discountAmt;
  const totalSessions = quote.treatments.reduce((s, t) => s + t.sessions, 0);

  const handlePayNow = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Confirm Payment',
      `Pay ${fmt(finalPrice)} for your treatment plan?\n\nYou will be redirected to the payment gateway.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Pay ${fmt(finalPrice)}`,
          onPress: () => {
            // TODO: integrate payment gateway (Razorpay / Stripe)
            Alert.alert('Payment Initiated', 'Redirecting to payment gateway…');
          },
        },
      ],
    );
  };

  const handleBookSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/care/consult-doctor');
  };

  const handleStartTreatment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/doctor-treatment-plan');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ═══════════════════════════════════════
            HERO
        ═══════════════════════════════════════ */}
        <LinearGradient
          colors={['#0E0A1F', '#1A1235', '#2D1E5F']}
          locations={[0, 0.4, 1]}
          style={styles.hero}
        >
          {/* Back */}
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={21} color="rgba(255,255,255,0.6)" />
          </Pressable>

          <Text style={styles.heroEyebrow}>Treatment Quote</Text>

          {/* Doctor Approved badge */}
          <View style={styles.approvedBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#22C55E" />
            <Text style={styles.approvedText}>Doctor Approved Plan</Text>
          </View>

          {/* Doctor row */}
          <View style={styles.doctorRow}>
            <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.docAvatar}>
              <Text style={{ fontSize: 18 }}>👩‍⚕️</Text>
            </LinearGradient>
            <View style={styles.docInfo}>
              <Text style={styles.docName}>{quote.doctorName}</Text>
              <Text style={styles.docSpec}>{quote.doctorSpec}</Text>
            </View>
            <View style={styles.validPill}>
              <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.45)" />
              <Text style={styles.validText}>Valid till {quote.validUntil}</Text>
            </View>
          </View>

          {/* Hero stat row */}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{quote.treatments.length}</Text>
              <Text style={styles.heroStatLabel}>Treatments</Text>
            </View>
            <View style={[styles.heroStat, styles.heroStatCenter]}>
              <Text style={[styles.heroStatNum, { color: '#FCD34D' }]}>{fmt(finalPrice)}</Text>
              <Text style={styles.heroStatLabel}>Final Price</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{totalSessions}</Text>
              <Text style={styles.heroStatLabel}>Sessions</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ═══════════════════════════════════════
            BODY
        ═══════════════════════════════════════ */}
        <Animated.View
          style={[styles.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >

          {/* ── Treatment List ── */}
          <Text style={styles.sectionLabel}>Prescribed Treatments</Text>
          <View style={styles.card}>
            {quote.treatments.map((t, i) => (
              <TreatmentRow
                key={t.id}
                item={t}
                index={i}
                total={quote.treatments.length}
              />
            ))}
          </View>

          {/* ── Cost Summary ── */}
          <Text style={styles.sectionLabel}>Cost Summary</Text>
          <View style={styles.summaryCard}>
            {/* Gross */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Subtotal</Text>
              <Text style={styles.summaryVal}>{fmt(grossTotal)}</Text>
            </View>

            <View style={styles.summaryDivider} />

            {/* Discount */}
            <View style={styles.summaryRow}>
              <View style={styles.discountLabelRow}>
                <Text style={styles.summaryKey}>Discount</Text>
                <View style={styles.discountPill}>
                  <Text style={styles.discountPillText}>–{quote.discountPct}%</Text>
                </View>
              </View>
              <Text style={styles.discountVal}>–{fmt(discountAmt)}</Text>
            </View>

            {quote.discountNote ? (
              <Text style={styles.discountNote}>{quote.discountNote}</Text>
            ) : null}

            <View style={styles.summaryDividerThick} />

            {/* Final */}
            <View style={[styles.summaryRow, styles.finalRow]}>
              <Text style={styles.finalLabel}>Total Payable</Text>
              <View style={styles.finalPriceWrap}>
                <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.finalPriceGrad}>
                  <Text style={styles.finalPrice}>{fmt(finalPrice)}</Text>
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* ── Trust indicators ── */}
          <View style={styles.trustRow}>
            {[
              { icon: 'lock-closed-outline', text: 'Secure Payment' },
              { icon: 'shield-checkmark-outline', text: 'Doctor Verified' },
              { icon: 'refresh-outline', text: 'Easy Reschedule' },
            ].map((item) => (
              <View key={item.text} style={styles.trustItem}>
                <Ionicons name={item.icon as any} size={14} color="#7C3AED" />
                <Text style={styles.trustText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* ── CTAs ── */}
          <View style={styles.ctaStack}>
            {/* Primary — Pay Now */}
            <Pressable
              onPress={handlePayNow}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              style={({ pressed }) => [styles.payBtnWrap, pressed && { opacity: 0.88 }]}
            >
              <LinearGradient
                colors={['#4C1D95', '#7C3AED', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.payBtn}
              >
                <Ionicons name="card-outline" size={19} color="#fff" />
                <Text style={styles.payBtnText}>Pay {fmt(finalPrice)}</Text>
                <View style={styles.payArrow}>
                  <Ionicons name="arrow-forward" size={14} color="#A78BFA" />
                </View>
              </LinearGradient>
            </Pressable>

            {/* Secondary row */}
            <View style={styles.secondaryRow}>
              <Pressable
                onPress={handleStartTreatment}
                android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
                style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.75 }]}
              >
                <Ionicons name="flash-outline" size={16} color="#7C3AED" />
                <Text style={styles.secondaryBtnText}>Start Treatment</Text>
              </Pressable>

              <Pressable
                onPress={handleBookSession}
                android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
                style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.75 }]}
              >
                <Ionicons name="calendar-outline" size={16} color="#7C3AED" />
                <Text style={styles.secondaryBtnText}>Book Session</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.legalNote}>
            By proceeding, you agree to our Treatment Terms & Cancellation Policy.
          </Text>

          <View style={{ height: 48 }} />
        </Animated.View>
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
  ios:     { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 14 },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F2F2F7' },
  scroll:       { flexGrow: 1 },
  centeredFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#F2F2F7' },
  loadingText:  { fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  errorText:    { fontSize: 15, color: '#6B7280', textAlign: 'center', marginTop: 12 },
  errorBackBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, backgroundColor: '#EDE9FE', borderRadius: 14 },
  errorBackText: { fontSize: 14, fontWeight: '700', color: '#7C3AED' },

  // ── Hero ──
  hero: { paddingTop: 16, paddingBottom: 30, paddingHorizontal: 20 },
  backBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  heroEyebrow: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.38)',
    textTransform: 'uppercase', letterSpacing: 1.3, marginBottom: 10,
  },
  approvedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    marginBottom: 18,
  },
  approvedText: { fontSize: 12, fontWeight: '700', color: '#22C55E' },

  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  docAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  docInfo: { flex: 1 },
  docName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  docSpec: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  validPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  validText: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },

  heroStats: { flexDirection: 'row', gap: 10 },
  heroStat: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18, paddingVertical: 13, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
  },
  heroStatCenter: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroStatNum: {
    fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 3,
  },
  heroStatLabel: {
    fontSize: 9, color: 'rgba(255,255,255,0.4)',
    fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6,
  },

  // ── Body ──
  body: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: '#F2F2F7' },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#8E8E93',
    textTransform: 'uppercase', letterSpacing: 0.9,
    marginTop: 22, marginBottom: 10,
  },

  // ── Treatment list card ──
  card: {
    backgroundColor: '#fff', borderRadius: 20,
    overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0',
    ...CARD_SHADOW,
  },
  treatRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  treatRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(60,60,67,0.1)' },
  treatLeft:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  treatIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    position: 'relative',
  },
  treatIconBoxPremium: { backgroundColor: '#FFFBEB' },
  treatIcon:   { fontSize: 18 },
  premiumDot: {
    position: 'absolute', top: -2, right: -2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#F59E0B', borderWidth: 1.5, borderColor: '#fff',
  },
  treatMeta:   { flex: 1 },
  treatNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  treatName:   { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  premiumPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFBEB', borderRadius: 20,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  premiumPillText: { fontSize: 9, fontWeight: '800', color: '#B45309' },
  treatSessions:   { fontSize: 12, color: '#9CA3AF' },
  treatSubtotal:   { fontSize: 15, fontWeight: '800', color: '#1E1B4B' },

  // ── Summary card ──
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#EDE9FE', ...PURPLE_SHADOW,
  },
  summaryRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryKey:   { fontSize: 15, color: '#374151', fontWeight: '500' },
  summaryVal:   { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60,60,67,0.1)', marginVertical: 14,
  },
  summaryDividerThick: {
    height: 1.5, backgroundColor: '#EDE9FE', marginVertical: 16,
  },
  discountLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discountPill: {
    backgroundColor: '#F0FDF4', borderRadius: 20,
    paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  discountPillText: { fontSize: 11, fontWeight: '800', color: '#16A34A' },
  discountVal:      { fontSize: 15, fontWeight: '600', color: '#16A34A' },
  discountNote:     { fontSize: 11, color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' },

  finalRow:      { marginTop: 2 },
  finalLabel:    { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
  finalPriceWrap: {},
  finalPriceGrad: {
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8,
  },
  finalPrice:    { fontSize: 18, fontWeight: '900', color: '#fff' },

  // ── Trust row ──
  trustRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 18, paddingHorizontal: 4,
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  // ── CTAs ──
  ctaStack:    { marginTop: 24, gap: 12 },
  payBtnWrap:  { borderRadius: 18, overflow: 'hidden' },
  payBtn: {
    height: 58, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingHorizontal: 24,
  },
  payBtnText:  { flex: 1, fontSize: 17, fontWeight: '900', color: '#fff', textAlign: 'center' },
  payArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  secondaryRow: { flexDirection: 'row', gap: 12 },
  secondaryBtn: {
    flex: 1, height: 50, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#DDD6FE',
    ...CARD_SHADOW,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },

  legalNote: {
    fontSize: 11, color: '#C7C7CC', textAlign: 'center',
    marginTop: 16, lineHeight: 17,
  },
});
