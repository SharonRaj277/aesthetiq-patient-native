import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, LayoutAnimation, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── FAQ Data ─────────────────────────────────────────────────────
const FAQS = [
  {
    category: 'Scans',
    icon: 'scan-outline' as const,
    tint: '#7C3AED',
    items: [
      {
        q: 'How does the AI skin scan work?',
        a: 'Our AI analyses your skin using multi-light photography. The app guides you through 3 lighting conditions (normal, warm, UV-simulated). The images are sent to our secure servers where a deep-learning model assesses pigmentation, texture, hydration, and potential concerns.',
      },
      {
        q: 'How accurate is the dental scan?',
        a: 'The dental scan captures 6 angles of your teeth and gums. The AI identifies visible signs of discolouration, plaque build-up, gum recession, and structural irregularities. It is a screening tool — not a replacement for a professional dental examination.',
      },
      {
        q: 'Do I need good lighting for a face scan?',
        a: 'Yes — natural or bright indoor lighting gives the best results. Avoid harsh directional light (like overhead lamps) and shadows. The app will guide you through the optimal setup.',
      },
      {
        q: 'Can I retake a scan?',
        a: 'Yes. You can start a new scan at any time from the Scan tab. Previous scan reports are saved in your Scan History.',
      },
    ],
  },
  {
    category: 'Reports & Unlocking',
    icon: 'document-text-outline' as const,
    tint: '#0EA5E9',
    items: [
      {
        q: 'Why does the full report cost ₹99?',
        a: 'The full AI report includes a detailed multi-metric analysis, condition breakdown, and personalised treatment recommendations. The ₹99 fee covers the AI processing cost and is a one-time charge per scan.',
      },
      {
        q: 'How do I unlock a report?',
        a: 'Tap "Unlock Full Report — ₹99" on any teaser screen. You will be taken to a secure Razorpay checkout. Once payment is confirmed, the full report is instantly revealed.',
      },
      {
        q: 'Can I download my report?',
        a: 'Yes. After unlocking, a "Download Report" button appears at the bottom of the report. This saves a PDF to your device.',
      },
    ],
  },
  {
    category: 'Appointments',
    icon: 'calendar-outline' as const,
    tint: '#10B981',
    items: [
      {
        q: 'How do I book a consultation?',
        a: 'Go to the Care tab and tap "Consult a Doctor". You can browse available doctors and book a video or in-person appointment.',
      },
      {
        q: 'Can I cancel or reschedule?',
        a: 'Yes. Go to My Appointments in your profile, tap the appointment, and choose Reschedule or Cancel. Cancellations made more than 2 hours before the appointment are fully refunded.',
      },
    ],
  },
  {
    category: 'Privacy & Data',
    icon: 'shield-checkmark-outline' as const,
    tint: '#EF4444',
    items: [
      {
        q: 'Who can see my scan images?',
        a: 'Your images are encrypted in transit and at rest. They are only accessed by the AI model for analysis. No human reviews your images unless you explicitly share them with a doctor.',
      },
      {
        q: 'How long do you store my data?',
        a: 'Scan images are deleted from our servers within 30 days. Reports and health profiles are retained as long as your account is active. You can request full deletion anytime via Privacy & Security settings.',
      },
    ],
  },
  {
    category: 'Account',
    icon: 'person-outline' as const,
    tint: '#F59E0B',
    items: [
      {
        q: 'How do I reset my password?',
        a: 'Go to Privacy & Security in your profile and tap "Change Password". A reset link will be sent to your registered email.',
      },
      {
        q: 'Can I use AesthetiQ on multiple devices?',
        a: 'Yes. Log in with the same account on any device. Your scans, reports, and health profile sync automatically.',
      },
    ],
  },
];

// ─── FAQ Item ─────────────────────────────────────────────────────
function FaqItem({ q, a, isLast }: { q: string; a: string; isLast: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.faqItem, !isLast && styles.faqItemBorder]}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setOpen((v) => !v);
        }}
        style={styles.faqQuestion}
        android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
      >
        <Text style={styles.faqQ}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#8E8E93" />
      </Pressable>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────
export default function HelpFaqScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={['#5B21B6', '#8B5CF6']} style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backArrow}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>❓ Help & FAQ</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSub}>Quick answers to common questions</Text>
        </LinearGradient>

        <View style={styles.body}>
          {FAQS.map((cat) => (
            <View key={cat.category} style={styles.section}>
              <View style={styles.catHeader}>
                <View style={[styles.catIcon, { backgroundColor: cat.tint + '18' }]}>
                  <Ionicons name={cat.icon} size={15} color={cat.tint} />
                </View>
                <Text style={styles.catTitle}>{cat.category}</Text>
              </View>
              <View style={styles.card}>
                {cat.items.map((item, i) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} isLast={i === cat.items.length - 1} />
                ))}
              </View>
            </View>
          ))}

          {/* Contact CTA */}
          <View style={styles.contactCta}>
            <Text style={styles.ctaText}>Still have questions?</Text>
            <Pressable
              onPress={() => router.push('/contact-us' as any)}
              style={styles.ctaBtn}
            >
              <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.ctaBtnGradient}>
                <Text style={styles.ctaBtnText}>Contact Support →</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F7' },

  header:    { paddingBottom: 20, paddingHorizontal: 20, paddingTop: 0 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 6 },
  backBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: '#fff' },
  headerTitle:{ fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  body: { paddingHorizontal: 20, paddingTop: 16 },

  section:   { marginBottom: 16 },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  catIcon:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catTitle:  { fontSize: 13, fontWeight: '700', color: '#3C3C43' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },

  faqItem:       { paddingHorizontal: 14 },
  faqItemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(60,60,67,0.1)' },
  faqQuestion:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 8 },
  faqQ:          { flex: 1, fontSize: 14, fontWeight: '500', color: '#1C1C1E', lineHeight: 20 },
  faqA:          { fontSize: 13, color: '#636366', lineHeight: 20, paddingBottom: 14 },

  contactCta:       { alignItems: 'center', marginTop: 16, gap: 12 },
  ctaText:          { fontSize: 14, color: '#636366' },
  ctaBtn:           { borderRadius: 14, overflow: 'hidden', alignSelf: 'stretch' },
  ctaBtnGradient:   { height: 50, alignItems: 'center', justifyContent: 'center' },
  ctaBtnText:       { fontSize: 15, fontWeight: '700', color: '#fff' },
});
