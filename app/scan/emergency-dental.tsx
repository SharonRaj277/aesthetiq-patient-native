import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function EmergencyDentalScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={['#7F1D1D', '#DC2626']} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <Text style={styles.icon}>🚨</Text>
          <Text style={styles.title}>Urgent Dental Attention Needed</Text>
          <Text style={styles.subtitle}>
            Your symptoms — including swelling, fever, or severe pain — suggest a possible dental emergency or infection.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>What to Do Now</Text>
            {[
              '📞 Call your dentist immediately',
              '🏥 Visit an emergency dental clinic',
              '💊 Do not self-medicate with antibiotics',
              '🧊 Apply ice pack (15 min on/off) for swelling',
              '🚫 Avoid very hot or cold foods',
            ].map((step, i) => (
              <Text key={i} style={styles.step}>{step}</Text>
            ))}
          </View>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); Linking.openURL('tel:emergency'); }}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            style={styles.callBtn}
          >
            <Text style={styles.callBtnText}>📞 Call Emergency Helpline</Text>
          </Pressable>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/scan/dental-guide'); }}
            android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
            style={styles.continueAnyway}
          >
            <Text style={styles.continueAnywayText}>Continue with scan anyway</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 20 },
  icon: { fontSize: 72, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  card: { width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 20, gap: 10, marginBottom: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 8 },
  step: { fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 22 },
  callBtn: { width: '100%', backgroundColor: '#fff', borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  callBtnText: { fontSize: 16, fontWeight: '800', color: '#DC2626' },
  continueAnyway: { width: '100%', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  continueAnywayText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  backLink: { paddingVertical: 8 },
  backLinkText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
});
