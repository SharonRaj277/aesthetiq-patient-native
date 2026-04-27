import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { CAPTURE_STEPS } from '../../constants/mockData';

export default function SkinGuideScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backBtn} android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Skin Scan Guide</Text>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/scan/camera', params: { type: 'skin' } }); }} android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 20 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={['#0EA5E9', '#06B6D4']} style={styles.hero}>
          <Text style={{ fontSize: 48, marginBottom: 10 }}>🧴</Text>
          <Text style={styles.heroTitle}>Multi-Light Skin Scan</Text>
          <Text style={styles.heroSubtitle}>5-spectrum analysis for comprehensive skin health</Text>
          <View style={styles.timeBadge}>
            <Text style={styles.timeText}>⏱ Approx. 5 minutes</Text>
          </View>
        </LinearGradient>

        {/* What Happens */}
        <View>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={{ gap: 12 }}>
            {CAPTURE_STEPS.map((step, i) => (
              <View key={step.id} style={[styles.stepCard, { borderLeftColor: step.accentColor, borderLeftWidth: 4 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.stepNum, { backgroundColor: step.accentColor }]}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>{step.label}</Text>
                    <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                  </View>
                  {step.needsTorch && (
                    <View style={styles.torchBadge}>
                      <Text style={styles.torchText}>🔦 Torch</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.stepDesc}>{step.instruction}</Text>
                <View style={styles.analyzesList}>
                  {step.analyzes.map((a, ai) => (
                    <View key={ai} style={[styles.analyzeTag, { backgroundColor: step.accentColor + '20' }]}>
                      <Text style={[styles.analyzeText, { color: step.accentColor }]}>{a}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Preparation Tips */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>🌟 For Best Results</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {[
              '✦ Clean, makeup-free skin',
              '✦ Natural or warm white light background',
              '✦ Keep phone 20–25cm from face',
              '✦ Stay still during each capture',
              '✦ Ensure room is dimly lit for torch step',
            ].map((tip, i) => (
              <Text key={i} style={styles.tipText}>{tip}</Text>
            ))}
          </View>
        </View>

        {/* CTA */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: '/scan/camera', params: { type: 'skin' } }); }}
          android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
        >
          <LinearGradient colors={['#0EA5E9', '#06B6D4']} style={styles.ctaBtn}>
            <Text style={styles.ctaText}>🧴 Start Skin Scan</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  backIcon: { fontSize: 20, color: Colors.textPrimary, fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  skipText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  hero: { borderRadius: 24, padding: 24, alignItems: 'center', ...Colors.shadow.medium },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 8 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: 12 },
  timeBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  timeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  stepCard: { backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.borderLight, gap: 8 },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  stepSubtitle: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  torchBadge: { backgroundColor: Colors.warningBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  torchText: { fontSize: 10, fontWeight: '700', color: Colors.warning },
  stepDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  analyzesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  analyzeTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  analyzeText: { fontSize: 10, fontWeight: '700' },
  tipCard: { backgroundColor: Colors.primaryBg, borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: Colors.borderMid },
  tipTitle: { fontSize: 15, fontWeight: '800', color: Colors.primaryDark },
  tipText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  ctaBtn: { borderRadius: 18, height: 56, alignItems: 'center', justifyContent: 'center', ...Colors.shadow.medium },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
