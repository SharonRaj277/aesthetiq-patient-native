import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────

type LineItem = {
  id:              string;
  displayName:     string;
  price:           number;           
  isConsultAdj?:   boolean;          
  note?:           string;           
  icon?:           string;
};

type PlanResponse = {
  planId:          string;
  doctorName:      string;
  patientName:     string;
  planDate:        string;
  items:           LineItem[];
};

// ─── Mock POST /facial-plan ───────────────────────────────────────

async function postFetchFacialPlan(): Promise<PlanResponse> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          planId:      'fp_092',
          doctorName:  'Dr. Priya Sharma',
          patientName: 'Sharon Raj',
          planDate:    '8 Apr 2026',
          items: [
            {
              id: 'i1',
              displayName:   'Dermal Fillers (Cheek Contour)',
              price:         45000,
              icon:          '✨',
            },
            {
              id: 'i2',
              displayName:   'Anti-Wrinkle Injections (Forehead)',
              price:         18000,
              icon:          '💧',
            },
            {
              id: 'i3',
              displayName:   'Peptide Skin Booster',
              price:         12000,
              icon:          '💎',
            },
            {
              id: 'i4',
              displayName:   'Consultation',
              price:         -1000,
              isConsultAdj:  true,
              note:          'Adjusted in your plan',
              icon:          '✔',
            },
          ],
        }),
      800,
    ),
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

const fmt = (n: number) =>
  (n < 0 ? '–' : '') + '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// ─── Screen ───────────────────────────────────────────────────────

export default function FacialPlanScreen() {
  const router = useRouter();

  const [plan, setPlan]       = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    postFetchFacialPlan()
      .then((data) => {
        setPlan(data);
        Animated.parallel([
          Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
        ]).start();
      })
      .finally(() => setLoading(false));
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
  const regularItems = plan.items.filter(i => !i.isConsultAdj);
  const consultItem  = plan.items.find(i => i.isConsultAdj);
  
  const grossTotal   = regularItems.reduce((s, i) => s + i.price, 0);
  const deduction    = Math.abs(consultItem?.price || 0);
  const finalPayable = grossTotal - deduction;

  const handlePayment = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Confirm Payment',
      `Proceed to pay ${fmt(finalPayable)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: `Pay ${fmt(finalPayable)}`, onPress: () => router.push('/care/booking-confirmed') },
      ],
    );
  };

  const handleBookAppointment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/care/consult-doctor');
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
      <View style={[styles.orb, { top: 200, left: -150, backgroundColor: 'rgba(248, 250, 252, 0.9)' }]} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header Nav */}
        <View style={styles.headerNav}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            {/* Title Section */}
            <View style={styles.titleSection}>
              <View style={styles.badgeWrap}>
                <Ionicons name="sparkles" size={12} color="#0F172A" />
                <Text style={styles.badgeText}>PERSONALISED</Text>
              </View>
              <Text style={styles.titleText}>Your Facial{'\n'}Harmony Plan</Text>
            </View>

            {/* Glassmorphic Treatments Card */}
            <BlurView intensity={80} tint="light" style={styles.glassCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>PRESCRIBED TREATMENTS</Text>
              </View>
              
              <View style={styles.itemsWrap}>
                {regularItems.map((item, index) => (
                  <View key={item.id} style={[styles.itemRow, index !== 0 && styles.itemBorder]}>
                    <View style={styles.itemIconWrap}>
                      <Text style={styles.itemIcon}>{item.icon}</Text>
                    </View>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemName}>{item.displayName}</Text>
                    </View>
                    <Text style={styles.itemPrice}>{fmt(item.price)}</Text>
                  </View>
                ))}

                {/* Consultation Deduction Item */}
                {consultItem && (
                  <View style={[styles.itemRow, styles.itemBorder, styles.consultationRow]}>
                    <View style={[styles.itemIconWrap, styles.consultationIconWrap]}>
                      <Ionicons name="checkmark-sharp" size={16} color="#059669" />
                    </View>
                    <View style={styles.itemMeta}>
                      <Text style={styles.consultationName}>{consultItem.displayName}</Text>
                      <View style={styles.consultationNoteWrap}>
                        <Ionicons name="shield-checkmark" size={12} color="#059669" />
                        <Text style={styles.consultationNote}>{consultItem.note}</Text>
                      </View>
                    </View>
                    <Text style={styles.consultationPrice}>-{fmt(Math.abs(consultItem.price))}</Text>
                  </View>
                )}
              </View>
            </BlurView>

            {/* Total Section (Glassmorphic) */}
            <BlurView intensity={80} tint="light" style={styles.glassCard}>
              <View style={styles.summaryWrap}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Total</Text>
                  <Text style={styles.summaryVal}>{fmt(grossTotal)}</Text>
                </View>
                {deduction > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Consultation Deduction</Text>
                    <Text style={styles.summaryDeduction}>-{fmt(deduction)}</Text>
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
                <Text style={styles.valueText}>Personalized facial analysis</Text>
              </View>
              <View style={styles.valueRow}>
                <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
                <Text style={styles.valueText}>Doctor-approved plan</Text>
              </View>
              <View style={styles.valueRow}>
                <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
                <Text style={styles.valueText}>Premium aesthetic care</Text>
              </View>
            </View>

            {/* CTAs */}
            <View style={styles.ctaWrap}>
              <Pressable
                onPress={handlePayment}
                style={({ pressed }: { pressed: boolean }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}
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
                style={({ pressed }: { pressed: boolean }) => [styles.btnSecondary, pressed && { opacity: 0.6 }]}
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
    width: 350, height: 350,
    borderRadius: 175,
    top: -50, right: -50,
  },

  headerNav: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
    alignItems: 'flex-end',
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
    marginBottom: 30,
    marginTop: 10,
  },
  badgeWrap: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(15, 23, 42, 0.1)',
    gap: 6,
  },
  badgeText: {
    fontSize: 10, fontWeight: '800', color: '#0F172A',
    letterSpacing: 1.2,
  },
  titleText: {
    fontSize: 34, fontWeight: '300', color: '#0F172A',
    lineHeight: 40,
    letterSpacing: -0.5,
  },

  glassCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginBottom: 20,
  },
  cardHeader: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 11, fontWeight: '700', color: '#64748B',
    letterSpacing: 1.5,
  },
  itemsWrap: {
    paddingHorizontal: 20, paddingBottom: 20,
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 213, 225, 0.4)',
  },
  itemIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4,
  },
  itemIcon: { fontSize: 18 },
  itemMeta: { flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 16, fontWeight: '500', color: '#1E293B' },
  itemPrice: { fontSize: 16, fontWeight: '600', color: '#0F172A' },

  consultationRow: {
    marginTop: 4,
    backgroundColor: 'rgba(240, 253, 244, 0.5)',
    marginHorizontal: -20, paddingHorizontal: 20,
    paddingVertical: 14,
  },
  consultationIconWrap: {
    backgroundColor: '#D1FAE5',
    shadowOpacity: 0,
  },
  consultationName: { fontSize: 15, fontWeight: '500', color: '#064E3B' },
  consultationNoteWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  consultationNote: { fontSize: 12, fontWeight: '500', color: '#059669' },
  consultationPrice: { fontSize: 16, fontWeight: '700', color: '#059669' },

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
    marginVertical: 10,
    gap: 12,
    paddingHorizontal: 10,
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
