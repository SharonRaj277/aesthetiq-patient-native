import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

type Tier = '2' | '3' | '4';

const TIER_CONFIG: Record<Tier, {
  gradient: [string, string];
  icon: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaRoute: string;
}> = {
  '2': {
    gradient: ['#F59E0B', '#D97706'],
    icon: '⚠️',
    title: 'Attention Recommended',
    body: 'Your scan indicates a condition that should be monitored. We recommend booking a consultation with a specialist within the next 2–4 weeks.',
    ctaLabel: 'Book Consultation',
    ctaRoute: '/care/consult-doctor',
  },
  '3': {
    gradient: ['#EF4444', '#DC2626'],
    icon: '🔴',
    title: 'Prompt Attention Needed',
    body: 'Your results show signs that require professional evaluation soon. Please book a consultation within the next few days.',
    ctaLabel: 'Book Urgently',
    ctaRoute: '/care/consult-doctor',
  },
  '4': {
    gradient: ['#7F1D1D', '#991B1B'],
    icon: '🚨',
    title: 'Immediate Action Required',
    body: 'Your scan has detected a potentially serious condition. Please seek medical attention immediately. Do not delay.',
    ctaLabel: 'Contact Doctor Now',
    ctaRoute: '/care/consult-doctor',
  },
};

export default function UrgencyInterstitialScreen() {
  const router = useRouter();
  const { tier } = useLocalSearchParams<{ tier: Tier }>();
  const cfg = TIER_CONFIG[tier ?? '2'];

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  return (
    <LinearGradient colors={cfg.gradient} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <Text style={styles.icon}>{cfg.icon}</Text>
          <Text style={styles.title}>{cfg.title}</Text>
          <Text style={styles.body}>{cfg.body}</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Next Steps</Text>
            <Text style={styles.cardText}>• View your full report for detailed findings</Text>
            <Text style={styles.cardText}>• Share report with your specialist</Text>
            <Text style={styles.cardText}>• Follow all recommended guidelines</Text>
          </View>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(cfg.ctaRoute as any); }}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnText}>{cfg.ctaLabel} →</Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>View Scan Report</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32 },
  icon: { fontSize: 72, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 14 },
  body: { fontSize: 15, color: 'rgba(255,255,255,0.88)', textAlign: 'center', lineHeight: 24, marginBottom: 28 },
  card: { width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 8 },
  cardText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 22 },
  ctaBtn: { width: '100%', backgroundColor: '#fff', borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  ctaBtnText: { fontSize: 16, fontWeight: '800', color: '#DC2626' },
  secondaryBtn: { width: '100%', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
});
