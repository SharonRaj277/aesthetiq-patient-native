import React from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

// ─── Data ─────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '🔬', title: 'AI-Powered Analysis',    desc: 'Deep learning models trained on thousands of dermatological and dental cases.' },
  { icon: '🛡️', title: 'Privacy First',           desc: 'All images are encrypted and deleted within 30 days. We never sell your data.' },
  { icon: '👨‍⚕️', title: 'Doctor Network',         desc: 'Connect with verified dermatologists and dentists for professional consultations.' },
  { icon: '📈', title: 'Progress Tracking',       desc: 'Monitor your skin and dental health trends over time with detailed score history.' },
];

const STATS = [
  { value: '50K+', label: 'Scans Done' },
  { value: '4.8★', label: 'App Rating' },
  { value: '200+', label: 'Doctors' },
  { value: '98%',  label: 'Accuracy' },
];

// ─── Screen ───────────────────────────────────────────────────────
export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={['#831843', '#EC4899']} style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backArrow}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>✨ About AesthetiQ</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSub}>Our story</Text>
        </LinearGradient>

        <View style={styles.body}>

          {/* Logo + tagline */}
          <View style={styles.logoBlock}>
            <LinearGradient colors={['#7C3AED', '#EC4899']} style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>💎</Text>
            </LinearGradient>
            <Text style={styles.appName}>AesthetiQ</Text>
            <Text style={styles.tagline}>Your AI Skin & Dental Health Companion</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>Version 1.0.0</Text>
            </View>
          </View>

          {/* Mission */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Our Mission</Text>
            <Text style={styles.cardBody}>
              AesthetiQ was built to democratise access to professional-grade skin and dental health
              screening. We believe everyone deserves early insights into their health — without
              waiting weeks for a specialist appointment.{'\n\n'}
              Using cutting-edge computer vision and AI, we help you understand your health better,
              sooner — and connect you with the right professionals when you need them.
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {STATS.map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Features */}
          <Text style={styles.sectionTitle}>What Makes Us Different</Text>
          <View style={styles.card}>
            {FEATURES.map((f, i) => (
              <View key={f.title} style={[styles.featureRow, i < FEATURES.length - 1 && styles.featureBorder]}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Tech */}
          <Text style={styles.sectionTitle}>Technology</Text>
          <View style={styles.card}>
            <Text style={styles.cardBody}>
              AesthetiQ is built with React Native for a seamless cross-platform experience. Our AI
              backend uses PyTorch-based vision transformers fine-tuned on dermatology and dental
              imaging datasets. Analysis runs on secure cloud infrastructure with end-to-end
              encryption.
            </Text>
          </View>

          {/* Links */}
          <Text style={styles.sectionTitle}>More</Text>
          <View style={styles.card}>
            {[
              { label: 'Privacy Policy', route: '/privacy-policy' },
              { label: 'Terms & Conditions', route: '/terms' },
              { label: 'Contact Us', route: '/contact-us' },
            ].map((item, i) => (
              <Pressable
                key={item.label}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(item.route as any);
                }}
                android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
                style={({ pressed }) => [styles.linkRow, i < 2 && styles.rowBorder, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.linkLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
              </Pressable>
            ))}
          </View>

          <Text style={styles.footer}>Made with ❤️ in India · © 2025 AesthetiQ</Text>
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

  logoBlock:    { alignItems: 'center', marginBottom: 24, gap: 8 },
  logoCircle:   { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  logoEmoji:    { fontSize: 38 },
  appName:      { fontSize: 26, fontWeight: '800', color: '#1C1C1E', letterSpacing: -0.5 },
  tagline:      { fontSize: 14, color: '#636366', textAlign: 'center' },
  versionBadge: { backgroundColor: '#F3E8FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
  versionText:  { fontSize: 12, fontWeight: '600', color: '#7C3AED' },

  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8, marginTop: 20, marginLeft: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', marginBottom: 8 },
  cardBody:  { fontSize: 14, color: '#636366', lineHeight: 22 },

  statsRow:  { flexDirection: 'row', gap: 10, marginTop: 16 },
  statCard:  { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', gap: 4,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#7C3AED' },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 },

  featureRow:    { flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'flex-start' },
  featureBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(60,60,67,0.1)' },
  featureIcon:   { fontSize: 22, marginTop: 2 },
  featureTitle:  { fontSize: 14, fontWeight: '700', color: '#1C1C1E', marginBottom: 2 },
  featureDesc:   { fontSize: 13, color: '#636366', lineHeight: 19 },

  linkRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 2 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(60,60,67,0.1)' },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: '400', color: '#1C1C1E' },

  footer: { textAlign: 'center', fontSize: 13, color: '#B0B0B8', marginTop: 24 },
});
