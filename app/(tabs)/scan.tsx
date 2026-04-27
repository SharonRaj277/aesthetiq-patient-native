import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { MOCK_SCANS } from '../../constants/mockData';

const SCAN_TYPES = [
  {
    id: 'facial',
    label: 'Facial Harmony',
    emoji: '✨',
    desc: 'Symmetry, jaw definition, facial thirds & golden ratio analysis.',
    gradient: ['#4C1D95', '#7C3AED'] as [string, string],
    route: '/scan/face-guide',
    bullets: ['Facial symmetry %', 'Jaw & chin analysis', 'Golden ratio score'],
  },
  {
    id: 'skin',
    label: 'Skin Analysis',
    emoji: '🧖',
    desc: 'Multi-light capture for acne, pores, pigmentation & texture.',
    gradient: ['#EC4899', '#A855F7'] as [string, string],
    route: '/scan/skin-precheck',
    bullets: ['Acne & bacteria mapping', 'Pigmentation & vessels', 'Texture & pore depth'],
  },
  {
    id: 'dental',
    label: 'Dental Health',
    emoji: '🦷',
    desc: 'Enamel, gum health, alignment & whiteness assessment.',
    gradient: ['#0EA5E9', '#A855F7'] as [string, string],
    route: '/scan/dental-precheck',
    bullets: ['Enamel condition', 'Gum health', 'Alignment check'],
  },
];

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function ScanScreen() {
  const router = useRouter();
  const lastScan = MOCK_SCANS[0];
  const daysSince = Math.floor((Date.now() - lastScan.date.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Scans</Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>

        {/* Last Scan Card */}
        <View style={styles.lastScanCard}>
          <View style={styles.lastScanRow}>
            <View>
              <Text style={styles.lastScanLabel}>Last Scan</Text>
              <Text style={styles.lastScanAge}>
                {daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince} days ago`}
              </Text>
              <Text style={styles.lastScanType}>
                {lastScan.type === 'face' ? '✨ Facial Harmony' : lastScan.type === 'skin' ? '🧖 Skin Analysis' : '🦷 Dental Health'}
              </Text>
              <Text style={styles.lastScanDate}>{fmtDate(lastScan.date)}</Text>
            </View>
            <View style={styles.lastScanScore}>
              <Text style={styles.lastScanScoreNum}>{lastScan.scores.overall}</Text>
              <Text style={styles.lastScanScoreLabel}>score</Text>
            </View>
          </View>
          {daysSince > 30 && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueBadgeText}>⚠️ Overdue — scan recommended monthly</Text>
            </View>
          )}
        </View>

        {/* Scan Types */}
        <Text style={styles.sectionTitle}>What can you scan?</Text>
        {SCAN_TYPES.map((type) => (
          <Pressable
            key={type.id}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(type.route as any); }}
            android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
            style={styles.scanTypeCard}
          >
            <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scanTypeGradient}>
              <Text style={styles.scanTypeEmoji}>{type.emoji}</Text>
              <View style={styles.scanTypeInfo}>
                <Text style={styles.scanTypeLabel}>{type.label}</Text>
                <View style={styles.durationBadge}><Text style={styles.durationText}>~2 min</Text></View>
              </View>
            </LinearGradient>
            <View style={styles.scanTypeContent}>
              <Text style={styles.scanTypeDesc}>{type.desc}</Text>
              <Text style={styles.analyzeLabel}>AI analyses:</Text>
              {type.bullets.map((b, i) => <Text key={i} style={styles.bullet}>• {b}</Text>)}
            </View>
          </Pressable>
        ))}

        {/* Recent Scans */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Recent Scans</Text>
        {MOCK_SCANS.map((scan) => (
          <Pressable
            key={scan.id}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/harmony-report', params: { scanId: scan.id } }); }}
            android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
            style={styles.recentScanCard}
          >
            <LinearGradient
              colors={scan.type === 'face' ? ['#4C1D95', '#7C3AED'] : scan.type === 'skin' ? ['#EC4899', '#A855F7'] : ['#0EA5E9', '#A855F7']}
              style={styles.recentScanIcon}
            >
              <Text style={{ fontSize: 20 }}>{scan.type === 'face' ? '✨' : scan.type === 'skin' ? '🧖' : '🦷'}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.recentScanType}>
                {scan.type === 'face' ? 'Facial Harmony' : scan.type === 'skin' ? 'Skin Analysis' : 'Dental Health'}
              </Text>
              <Text style={styles.recentScanDate}>{fmtDate(scan.date)}</Text>
            </View>
            <View style={styles.recentScanScore}>
              <Text style={[styles.recentScanScoreNum, { color: scan.scores.overall >= 80 ? Colors.success : Colors.warning }]}>
                {scan.scores.overall}
              </Text>
              <Text style={styles.recentScanScoreLabel}>/100</Text>
            </View>
          </Pressable>
        ))}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 20 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary },
  headerDate: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  lastScanCard: { marginHorizontal: 20, marginBottom: 16, backgroundColor: Colors.cardBg, borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: Colors.borderLight, ...Colors.shadow.small },
  lastScanRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastScanLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  lastScanAge: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  lastScanType: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  lastScanDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  lastScanScore: { alignItems: 'center' },
  lastScanScoreNum: { fontSize: 40, fontWeight: '900', color: Colors.primary },
  lastScanScoreLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  overdueBadge: { marginTop: 12, backgroundColor: '#FFFBEB', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#FDE68A' },
  overdueBadgeText: { fontSize: 12, color: Colors.warning, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginHorizontal: 20, marginTop: 28, marginBottom: 14 },
  scanTypeCard: { marginHorizontal: 20, marginBottom: 14, backgroundColor: Colors.cardBg, borderRadius: 24, overflow: 'hidden', borderWidth: 1.5, borderColor: Colors.borderLight, ...Colors.shadow.small },
  scanTypeGradient: { height: 90, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
  scanTypeEmoji: { fontSize: 36 },
  scanTypeInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scanTypeLabel: { fontSize: 18, fontWeight: '800', color: '#fff' },
  durationBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  durationText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  scanTypeContent: { padding: 16 },
  scanTypeDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 8 },
  analyzeLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  bullet: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  recentScanCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.borderLight, ...Colors.shadow.small },
  recentScanIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  recentScanType: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  recentScanDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  recentScanScore: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  recentScanScoreNum: { fontSize: 22, fontWeight: '900' },
  recentScanScoreLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
});
