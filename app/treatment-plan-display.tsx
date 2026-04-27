/**
 * Treatment Plan Display — Premium checkout-style screen
 * Feature: "Your Personalized Treatment Plan"
 * Icy white / pearl UI, Glassmorphism, Premium minimal.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Animated, Platform, Alert, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { batchGetTreatmentPrices } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────

type LineItem = {
  id:              string;
  displayName:     string;
  domain?:         'skin' | 'hair' | 'dental' | string;
  sessions?:       number;
  /** Populated from Firestore after plan loads — never from doctor/AI */
  pricePerSession?:number;
  totalPrice:      number;
  isComplimentary: boolean;
  originalPrice?:  number;
  isConsultAdj:    boolean;
  purpose?:        string;
  isCustom:        boolean;
};

type PlanResponse = {
  planId:          string;
  doctorName:      string;
  patientName:     string;
  planDate:        string;
  items:           LineItem[];
};

// ─── Mock POST /treatment-plan ────────────────────────────────────

async function postFetchTreatmentPlan(_body: Record<string, string>): Promise<PlanResponse> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          planId:      'tp_082',
          doctorName:  'Dr. Priya Sharma',
          patientName: 'Sharon Raj',
          planDate:    '4 Apr 2026',
          items: [
            {
              id: 'i1',
              displayName:     'RF Microneedling',
              domain:          'skin',
              sessions:        3,
              pricePerSession: 8000,
              totalPrice:      24000,
              isComplimentary: false,
              isCustom:        false,
              isConsultAdj:    false,
              purpose:         'Targets deep acne scars and improves overall skin texture through collagen stimulation.',
            },
            {
              id: 'i2',
              displayName:     'PRP Therapy',
              domain:          'hair',
              totalPrice:      15000,
              isComplimentary: false,
              isCustom:        false,
              isConsultAdj:    false,
              purpose:         'Stimulates hair follicles to increase hair density and thickness.',
            },
            {
              id: 'i3',
              displayName:     'Custom Recovery Serum',
              totalPrice:      4500,
              isComplimentary: false,
              isCustom:        true,
              isConsultAdj:    false,
              purpose:         'Soothes the skin post-treatment and accelerates the healing process.',
            },
            {
              id: 'i4',
              displayName:     'Scaling & Polishing',
              domain:          'dental',
              totalPrice:      0,
              originalPrice:   1999,
              isComplimentary: true,
              isCustom:        false,
              isConsultAdj:    false,
            },
            {
              id: 'i5',
              displayName:     'Consultation',
              totalPrice:      0,
              originalPrice:   1000,
              isComplimentary: false,
              isCustom:        false,
              isConsultAdj:    true,
            },
          ],
        }),
      900,
    ),
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

const fmt = (n: number) =>
  (n < 0 ? '–' : '') + '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const { width } = Dimensions.get('window');

// ─── Screen ───────────────────────────────────────────────────────

export default function TreatmentPlanDisplayScreen() {
  const router = useRouter();
  const { consultationId } = useLocalSearchParams<{ consultationId?: string }>();

  const [plan, setPlan]       = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [priceError, setPriceError] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await postFetchTreatmentPlan({ consultationId: consultationId ?? '' });

        // Fetch pricePerSession from Firestore for all non-complimentary, non-consult items
        const billableNames = data.items
          .filter((i) => !i.isComplimentary && !i.isConsultAdj)
          .map((i) => i.displayName);

        let priceMap: Record<string, number> = {};
        try {
          priceMap = await batchGetTreatmentPrices(billableNames);
        } catch {
          setPriceError(true);
        }

        // Enrich each item: if Firestore has a price, recalculate totalPrice
        const enriched: PlanResponse = {
          ...data,
          items: data.items.map((item) => {
            if (item.isComplimentary || item.isConsultAdj) return item;
            const fsPrice = priceMap[item.displayName];
            if (fsPrice == null) return item;
            const sessions = item.sessions ?? 1;
            return {
              ...item,
              pricePerSession: fsPrice,
              sessions,
              totalPrice: fsPrice * sessions,
            };
          }),
        };

        setPlan(enriched);
        Animated.parallel([
          Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
        ]).start();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderArea}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loaderText}>Formulating your plan…</Text>
      </View>
    );
  }

  if (!plan) return null;

  // ── Calculations ──────────────────────────────────────────────
  const standardItems    = plan.items.filter((i) => !i.isComplimentary && !i.isConsultAdj);
  const compItems        = plan.items.filter((i) => i.isComplimentary);
  const consultItem      = plan.items.find((i) => i.isConsultAdj);
  
  const grossTotal       = standardItems.reduce((s, i) => s + i.totalPrice, 0);
  const consultDeduction = consultItem?.originalPrice || 0;
  const finalPayable     = grossTotal; // Typically deduction is handled differently. Here, we'll assume grossTotal minus nothing else. Wait, standard items is total. Let's make finalPayable just grossTotal because the consult is 0.

  const handlePayment = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Confirm Payment',
      `Proceed to pay ${fmt(finalPayable)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: `Pay ${fmt(finalPayable)}`, onPress: () => router.push('/') },
      ],
    );
  };

  const handleBookAppointment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Booking', 'Redirecting to calendar...');
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient for Pearl / Icy White effect */}
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC', '#E2E8F0']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Decorative Blur Orbs */}
      <View style={[styles.orb, { top: -100, right: -100, backgroundColor: 'rgba(240, 249, 255, 0.8)' }]} />
      <View style={[styles.orb, { top: 300, left: -150, backgroundColor: 'rgba(248, 250, 252, 0.9)' }]} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header Nav */}
        <View style={styles.headerNav}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.titleText}>Your Personalized{'\n'}Treatment Plan</Text>
              <Text style={styles.subText}>Carefully designed by your doctor</Text>
            </View>

            {/* Glassmorphic Treatments Content */}
            <View style={styles.cardsWrap}>
              
              {/* Normal / Custom Treatments */}
              {standardItems.map((item, idx) => (
                <BlurView intensity={80} tint="light" style={styles.treatmentCard} key={item.id}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Text style={styles.itemName}>{item.displayName}</Text>
                      {item.domain && (
                        <View style={styles.domainTag}>
                          <Text style={styles.domainTagText}>{item.domain.toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemPrice}>{fmt(item.totalPrice)}</Text>
                  </View>

                  {item.sessions != null && item.pricePerSession != null ? (
                    <View style={styles.sessionRow}>
                      <Text style={styles.sessionText}>
                        {item.sessions} {item.sessions === 1 ? 'Session' : 'Sessions'} × {fmt(item.pricePerSession)} / session
                      </Text>
                    </View>
                  ) : null}

                  {item.purpose && (
                    <View style={styles.purposeBox}>
                      <Text style={styles.purposeLabel}>Why this treatment?</Text>
                      <Text style={styles.purposeText}>"{item.purpose}"</Text>
                    </View>
                  )}
                </BlurView>
              ))}

              {/* Complimentary Items */}
              {compItems.map((item) => (
                <BlurView intensity={80} tint="light" style={[styles.treatmentCard, styles.compCard]} key={item.id}>
                   <View style={styles.cardHeader}>
                    <Text style={styles.itemName}>{item.displayName}</Text>
                    <View style={styles.priceStrikeWrap}>
                      <Text style={styles.originalPriceStrike}>{fmt(item.originalPrice ?? 0)}</Text>
                      <Text style={styles.freePrice}>₹0</Text>
                    </View>
                  </View>
                  <View style={styles.includedRow}>
                    <Ionicons name="checkmark-sharp" size={14} color="#059669" />
                    <Text style={styles.includedText}>Included in your treatment</Text>
                  </View>
                </BlurView>
              ))}

              {/* Consultation Adjusted */}
              {consultItem && (
                <BlurView intensity={80} tint="light" style={[styles.treatmentCard, styles.consultCard]} key={consultItem.id}>
                   <View style={styles.cardHeader}>
                    <Text style={styles.itemName}>{consultItem.displayName}</Text>
                    <View style={styles.priceStrikeWrap}>
                      <Text style={styles.originalPriceStrike}>{fmt(consultItem.originalPrice ?? 0)}</Text>
                      <Text style={styles.freePrice}>₹0</Text>
                    </View>
                  </View>
                  <View style={styles.includedRow}>
                    <Ionicons name="checkmark-sharp" size={14} color="#2563EB" />
                    <Text style={[styles.includedText, { color: '#2563EB' }]}>Adjusted in your plan</Text>
                  </View>
                </BlurView>
              )}

            </View>

            {/* Price fetch warning */}
            {priceError && (
              <View style={styles.priceErrorBanner}>
                <Ionicons name="information-circle-outline" size={16} color="#92400E" />
                <Text style={styles.priceErrorText}>
                  Pricing is based on your plan. Live rates could not be fetched right now.
                </Text>
              </View>
            )}

            {/* Total Section (Glassmorphic) */}
            <BlurView intensity={80} tint="light" style={styles.summaryCard}>
              <View style={styles.summaryWrap}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Total Before Adjustment</Text>
                  <Text style={styles.summaryVal}>{fmt(grossTotal + consultDeduction)}</Text>
                </View>
                {consultDeduction > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Consultation Deduction</Text>
                    <Text style={styles.summaryDeduction}>-{fmt(consultDeduction)}</Text>
                  </View>
                )}
                <View style={styles.summaryDivider} />
                <View style={styles.summaryFinalRow}>
                  <Text style={styles.summaryFinalKey}>Final Payable</Text>
                  <Text style={styles.summaryFinalVal}>{fmt(finalPayable)}</Text>
                </View>
              </View>
            </BlurView>

            {/* Value Stack */}
            <View style={styles.valueStackWrap}>
              <View style={styles.valueRow}>
                <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
                <Text style={styles.valueText}>Doctor-approved plan</Text>
              </View>
              <View style={styles.valueRow}>
                <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
                <Text style={styles.valueText}>Personalized treatment</Text>
              </View>
              <View style={styles.valueRow}>
                <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
                <Text style={styles.valueText}>Complimentary care included</Text>
              </View>
            </View>

            {/* CTAs */}
            <View style={styles.ctaWrap}>
              <Pressable
                onPress={handlePayment}
                style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}
              >
                <LinearGradient
                  colors={['#0F172A', '#1E293B']}
                  style={styles.btnPrimaryGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.btnPrimaryText}>Proceed to Payment</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={handleBookAppointment}
                style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.btnSecondaryText}>Book Appointment</Text>
              </Pressable>
            </View>

            <View style={{ height: 60 }} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safe: { flex: 1 },
  loaderArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F8FAFC'
  },
  loaderText: { marginTop: 12, fontSize: 15, color: '#475569', fontWeight: '500' },
  
  orb: {
    position: 'absolute',
    width: 400, height: 400,
    borderRadius: 200,
    top: -50, right: -50,
  },

  headerNav: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },

  titleSection: {
    marginBottom: 24,
    marginTop: 10,
  },
  titleText: {
    fontSize: 32, fontWeight: '300', color: '#0F172A',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subText: {
    fontSize: 16, color: '#64748B',
    fontWeight: '400',
  },

  cardsWrap: {
    gap: 16,
    marginBottom: 24,
  },
  treatmentCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.45)',
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flex: 1, paddingRight: 12,
  },
  itemName: {
    fontSize: 17, fontWeight: '600', color: '#1E293B',
    marginBottom: 6,
  },
  domainTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  domainTagText: {
    fontSize: 10, fontWeight: '700', color: '#64748B',
    letterSpacing: 0.5,
  },
  itemPrice: {
    fontSize: 17, fontWeight: '700', color: '#0F172A',
  },
  
  sessionRow: {
    marginTop: 12,
  },
  sessionText: {
    fontSize: 14, color: '#475569', fontWeight: '500',
  },

  purposeBox: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
    padding: 12, borderRadius: 12,
  },
  purposeLabel: {
    fontSize: 12, fontWeight: '600', color: '#64748B',
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  purposeText: {
    fontSize: 14, color: '#1E293B', fontStyle: 'italic',
    lineHeight: 20,
  },

  compCard: {
    backgroundColor: 'rgba(240, 253, 244, 0.4)',
    borderColor: 'rgba(187, 247, 208, 0.5)',
  },
  priceStrikeWrap: {
    alignItems: 'flex-end',
  },
  originalPriceStrike: {
    fontSize: 13, color: '#94A3B8', textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  freePrice: {
    fontSize: 17, fontWeight: '700', color: '#059669',
  },
  includedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 4,
  },
  includedText: {
    fontSize: 13, fontWeight: '500', color: '#059669',
  },

  consultCard: {
    backgroundColor: 'rgba(239, 246, 255, 0.4)',
    borderColor: 'rgba(191, 219, 254, 0.5)',
  },

  priceErrorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF3C7', borderRadius: 12,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  priceErrorText: {
    flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18,
  },
  summaryCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginBottom: 24,
  },
  summaryWrap: {
    padding: 24, gap: 14,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  summaryKey: { fontSize: 15, color: '#64748B' },
  summaryVal: { fontSize: 15, fontWeight: '500', color: '#1E293B' },
  summaryDeduction: { fontSize: 15, fontWeight: '600', color: '#059669' },
  summaryDivider: {
    height: 1, backgroundColor: 'rgba(203, 213, 225, 0.5)',
    marginVertical: 4,
  },
  summaryFinalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginTop: 4,
  },
  summaryFinalKey: { fontSize: 18, fontWeight: '400', color: '#0F172A' },
  summaryFinalVal: { fontSize: 24, fontWeight: '300', color: '#0F172A', letterSpacing: -0.5 },

  valueStackWrap: {
    gap: 12,
    paddingHorizontal: 8,
  },
  valueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  valueText: { fontSize: 15, fontWeight: '500', color: '#334155' },

  ctaWrap: {
    marginTop: 34, gap: 14,
  },
  btnPrimary: {
    borderRadius: 100, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16,
    elevation: 4,
  },
  btnPrimaryGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 64, gap: 10,
  },
  btnPrimaryText: {
    fontSize: 17, fontWeight: '600', color: '#FFFFFF',
  },
  btnSecondary: {
    height: 64, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  btnSecondaryText: {
    fontSize: 16, fontWeight: '500', color: '#475569',
  },
});
