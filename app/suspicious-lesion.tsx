import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function SuspiciousLesionScreen() {
  const router = useRouter();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  return (
    <LinearGradient colors={['#1E1B4B', '#4C1D95']} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <Text style={styles.icon}>🔬</Text>
          <Text style={styles.title}>Suspicious Lesion Detected</Text>
          <Text style={styles.subtitle}>
            Our AI has flagged an area of concern that may require professional dermatological evaluation.
          </Text>

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              ⚠️ This is NOT a medical diagnosis. AesthetiQ is a screening tool only. Always consult a qualified dermatologist.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>What This Means</Text>
            <Text style={styles.cardText}>Our analysis detected pigmentation patterns or texture changes that may warrant a closer look. Common causes include sun damage, benign growths, or post-inflammatory changes — but only a dermatologist can confirm.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recommended Actions</Text>
            {[
              '🩺 Book a dermatology consultation',
              '📸 Share your scan report with your doctor',
              '☀️ Avoid prolonged sun exposure',
              '🚫 Do not attempt home treatment',
            ].map((s, i) => (
              <Text key={i} style={styles.step}>{s}</Text>
            ))}
          </View>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/care/consult-doctor'); }}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnText}>Book Dermatologist →</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← View Full Report</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  disclaimer: { backgroundColor: 'rgba(251,191,36,0.2)', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)', width: '100%' },
  disclaimerText: { fontSize: 12, color: '#FCD34D', lineHeight: 18, textAlign: 'center', fontWeight: '600' },
  card: { width: '100%', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 8 },
  cardText: { fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 21 },
  step: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 22 },
  ctaBtn: { width: '100%', backgroundColor: '#fff', borderRadius: 16, height: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  ctaBtnText: { fontSize: 15, fontWeight: '800', color: '#4C1D95' },
  backBtn: { paddingVertical: 10 },
  backBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
});
