import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useHealthProfile, shouldShowHealthCheck } from '../../context/HealthProfileContext';

const SCAN_OPTIONS = [
  {
    id: 'facial',
    label: 'Facial Harmony',
    icon: 'scan' as const,
    duration: '~2 min',
    tag: 'Symmetry · Jawline · Golden Ratio',
    desc: 'Analyse facial symmetry, jaw definition, facial thirds and golden ratio proportions.',
    bullets: ['Symmetry percentage', 'Jawline & chin analysis', 'Golden ratio score', 'Facial thirds balance'],
    gradient: ['#3B0764', '#7C3AED'] as [string, string],
    accent: '#A78BFA',
    route: '/scan/face-guide',
  },
  {
    id: 'skin',
    label: 'Skin Analysis',
    icon: 'water' as const,
    duration: '~3 min',
    tag: 'Acne · Pores · Pigmentation',
    desc: 'Multi-light capture detects acne, bacteria, pigmentation, texture and pore depth.',
    bullets: ['Acne & bacteria mapping', 'Pigmentation & vessels', 'Texture & pore depth', 'Collagen density'],
    gradient: ['#831843', '#EC4899'] as [string, string],
    accent: '#F9A8D4',
    route: '/scan/skin-precheck',
  },
  {
    id: 'dental',
    label: 'Dental Health',
    icon: 'medical' as const,
    duration: '~2 min',
    tag: 'Enamel · Gum · Alignment',
    desc: 'Assess enamel condition, gum health, tooth alignment, and whiteness levels.',
    bullets: ['Enamel condition', 'Gum health check', 'Tooth alignment', 'Calculus detection'],
    gradient: ['#0C4A6E', '#0EA5E9'] as [string, string],
    accent: '#7DD3FC',
    route: '/scan/dental-precheck',
  },
];

export default function TypeSelectionScreen() {
  const router = useRouter();
  const scales = useRef(SCAN_OPTIONS.map(() => new Animated.Value(1))).current;
  const { healthProfile } = useHealthProfile();

  const handleSelect = (route: string, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scales[index], { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.spring(scales[index], { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start(() => {
      if (shouldShowHealthCheck(healthProfile)) {
        router.push({ pathname: '/scan/health-quick-check', params: { next: route } });
      } else {
        router.push(route as any);
      }
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>AI Scan</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSub}>Choose what to analyse today</Text>

        {/* Scan Type Cards */}
        {SCAN_OPTIONS.map((option, index) => (
          <Pressable
            key={option.id}
            onPress={() => handleSelect(option.route, index)}
            android_ripple={{ color: 'rgba(124,58,237,0.06)' }}
          >
            <Animated.View style={[styles.card, { transform: [{ scale: scales[index] }] }]}>

              {/* Gradient top section */}
              <LinearGradient
                colors={option.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardTop}
              >
                {/* Icon circle */}
                <View style={styles.iconCircle}>
                  <Ionicons name={option.icon} size={30} color="#fff" />
                </View>

                {/* Title + duration row */}
                <View style={styles.cardTopRight}>
                  <Text style={styles.cardLabel}>{option.label}</Text>
                  <Text style={styles.cardTag}>{option.tag}</Text>
                </View>

                {/* Duration pill */}
                <View style={styles.durationPill}>
                  <Ionicons name="time-outline" size={11} color="#fff" />
                  <Text style={styles.durationText}>{option.duration}</Text>
                </View>
              </LinearGradient>

              {/* Content */}
              <View style={styles.cardBody}>
                <Text style={styles.cardDesc}>{option.desc}</Text>

                <View style={styles.divider} />

                <Text style={styles.analysesLabel}>AI analyses</Text>
                <View style={styles.bulletsGrid}>
                  {option.bullets.map((b, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Ionicons name="checkmark-circle" size={15} color={option.accent} />
                      <Text style={styles.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>

                {/* Start CTA row */}
                <View style={styles.ctaRow}>
                  <Text style={[styles.ctaText, { color: option.gradient[1] }]}>Start scan</Text>
                  <Ionicons name="arrow-forward-circle" size={20} color={option.gradient[1]} />
                </View>
              </View>

            </Animated.View>
          </Pressable>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 20 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 12, marginBottom: 4,
  },
  backBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  headerSub:  { fontSize: 14, color: Colors.textMuted, marginBottom: 24, textAlign: 'center' },

  // Card shell
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Colors.shadow.medium,
  },

  // Gradient top
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 14,
  },
  iconCircle: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardTopRight: { flex: 1 },
  cardLabel:    { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 3 },
  cardTag:      { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', letterSpacing: 0.2 },
  durationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  durationText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  // Card body
  cardBody:   { padding: 20 },
  cardDesc:   { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 14 },
  divider:    { height: 1, backgroundColor: Colors.borderLight, marginBottom: 14 },
  analysesLabel: {
    fontSize: 10, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  bulletsGrid: { gap: 8, marginBottom: 16 },
  bulletRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulletText:  { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

  // CTA row
  ctaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
  },
  ctaText: { fontSize: 14, fontWeight: '700' },
});
