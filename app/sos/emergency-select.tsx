import React from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const ISSUES = [
  { emoji: '🦷', label: 'Severe Dental Pain',     sub: 'Toothache, abscess, broken tooth' },
  { emoji: '🧖', label: 'Urgent Skin Reaction',   sub: 'Allergic reaction, severe rash' },
  { emoji: '✨', label: 'Post-Treatment Issue',    sub: 'Swelling or pain after procedure' },
  { emoji: '💊', label: 'Medication Concern',      sub: 'Side effects or drug interaction' },
  { emoji: '🩸', label: 'Bleeding / Wound',        sub: 'Post-procedure bleeding' },
  { emoji: '❓', label: 'Other Urgent Issue',      sub: 'Something not listed above' },
];

export default function EmergencySelectScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={['#7F1D1D', '#991B1B', '#450A0A']} style={styles.root}>
      <SafeAreaView style={styles.safe}>

        {/* Close */}
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <Text style={styles.heroEmoji}>🆘</Text>
          <Text style={styles.title}>Emergency Help</Text>
          <Text style={styles.subtitle}>Select your emergency type</Text>

          {/* Issue cards */}
          <View style={styles.cards}>
            {ISSUES.map((issue) => (
              <Pressable
                key={issue.label}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push({
                    pathname: '/sos/emergency-call',
                    params: { issueLabel: issue.label, issueEmoji: issue.emoji },
                  });
                }}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.cardEmoji}>{issue.emoji}</Text>
                <View style={styles.cardText}>
                  <Text style={styles.cardLabel}>{issue.label}</Text>
                  <Text style={styles.cardSub}>{issue.sub}</Text>
                </View>
                <Text style={styles.cardArrow}>›</Text>
              </Pressable>
            ))}
          </View>

          {/* Footer notes */}
          <View style={styles.footer}>
            <Text style={styles.footerLine}>⚡ Average response under 5 minutes</Text>
            <Text style={styles.footerLine}>₹350 flat fee · Charged after doctor connects</Text>
            <Text style={[styles.footerLine, styles.footerEmergency]}>
              For life-threatening emergencies call 112
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  closeBtn: {
    position: 'absolute', top: 56, right: 20, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { fontSize: 16, color: '#fff', fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingTop: 80, paddingBottom: 40 },
  heroEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  title:     { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center' },
  subtitle:  { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 6, marginBottom: 28 },
  cards:     { gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, padding: 18, gap: 14,
  },
  cardEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  cardText:  { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '800', color: '#fff' },
  cardSub:   { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  cardArrow: { fontSize: 22, color: 'rgba(255,255,255,0.4)' },
  footer:    { marginTop: 32, gap: 8, alignItems: 'center' },
  footerLine: { fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },
  footerEmergency: { color: '#FCA5A5', fontWeight: '700', marginTop: 4 },
});
