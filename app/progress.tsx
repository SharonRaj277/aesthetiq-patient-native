import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { MOCK_SCANS } from '../constants/mockData';
import Svg, { Polyline, Circle as SvgCircle, Line, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

type ScoreTab = 'Overall' | 'Symmetry' | 'Skin' | 'Dental';

const IMPROVEMENTS = [
  { label: 'Overall Harmony', change: '+8 pts', color: Colors.success, icon: '📈' },
  { label: 'Skin Health', change: '+12 pts', color: Colors.success, icon: '🧖' },
  { label: 'Dental Score', change: '+5 pts', color: Colors.success, icon: '🦷' },
];

function MiniChart({ scores, color }: { scores: number[]; color: string }) {
  const w = width - 80;
  const h = 80;
  const max = 100;
  const pts = scores.map((s, i) => `${(i / (scores.length - 1)) * w},${h - (s / max) * h}`).join(' ');
  return (
    <Svg width={w} height={h} style={{ overflow: 'visible' }}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {scores.map((s, i) => (
        <SvgCircle key={i} cx={(i / (scores.length - 1)) * w} cy={h - (s / max) * h} r={4} fill={color} />
      ))}
    </Svg>
  );
}

export default function ProgressScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<ScoreTab>('Overall');

  const scoresByTab: Record<ScoreTab, number[]> = {
    Overall: MOCK_SCANS.map((s) => s.scores.overall).reverse(),
    Symmetry: MOCK_SCANS.map((s) => s.scores.symmetry ?? s.scores.overall).reverse(),
    Skin: MOCK_SCANS.map((s) => s.scores.skin ?? s.scores.overall).reverse(),
    Dental: MOCK_SCANS.map((s) => s.scores.dental ?? s.scores.overall).reverse(),
  };

  const tabColor: Record<ScoreTab, string> = {
    Overall: Colors.primary,
    Symmetry: '#A855F7',
    Skin: Colors.pink,
    Dental: Colors.teal,
  };

  const currentScores = scoresByTab[tab];
  const latestScore = currentScores[currentScores.length - 1];
  const firstScore = currentScores[0];
  const change = latestScore - firstScore;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Progress</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Score Timeline */}
        <Text style={styles.sectionTitle}>Score Timeline</Text>
        <View style={styles.chartCard}>
          {/* Tab Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartTabs}>
            {(['Overall', 'Symmetry', 'Skin', 'Dental'] as ScoreTab[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t); }}
                android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}
                style={[styles.chartTab, tab === t && { backgroundColor: tabColor[t] + '20', borderColor: tabColor[t] }]}
              >
                <Text style={[styles.chartTabText, tab === t && { color: tabColor[t] }]}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Chart */}
          <View style={styles.chart}>
            <MiniChart scores={currentScores} color={tabColor[tab]} />
          </View>

          {/* Score Summary */}
          <View style={styles.scoreSummary}>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: tabColor[tab] }]}>{latestScore}</Text>
              <Text style={styles.scoreLabel}>Latest</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: change >= 0 ? Colors.success : Colors.danger }]}>
                {change >= 0 ? '+' : ''}{change}
              </Text>
              <Text style={styles.scoreLabel}>Change</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: Colors.textPrimary }]}>
                {Math.round(currentScores.reduce((a, b) => a + b, 0) / currentScores.length)}
              </Text>
              <Text style={styles.scoreLabel}>Average</Text>
            </View>
          </View>
        </View>

        {/* Improvement Metrics */}
        <Text style={styles.sectionTitle}>Your Improvements</Text>
        {IMPROVEMENTS.map((imp) => (
          <View key={imp.label} style={styles.impCard}>
            <Text style={styles.impIcon}>{imp.icon}</Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.impLabel}>{imp.label}</Text>
              <Text style={styles.impSub}>Since first scan</Text>
            </View>
            <Text style={[styles.impChange, { color: imp.color }]}>{imp.change}</Text>
          </View>
        ))}

        {/* Scan History Mini */}
        <Text style={styles.sectionTitle}>Scan History</Text>
        {MOCK_SCANS.map((scan) => (
          <Pressable
            key={scan.id}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/harmony-report', params: { scanId: scan.id } }); }}
            android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
            style={styles.historyCard}
          >
            <LinearGradient
              colors={scan.type === 'face' ? ['#4C1D95', '#7C3AED'] : scan.type === 'skin' ? ['#EC4899', '#A855F7'] : ['#0EA5E9', '#A855F7']}
              style={styles.historyIcon}
            >
              <Text style={{ fontSize: 18 }}>{scan.type === 'face' ? '✨' : scan.type === 'skin' ? '🧖' : '🦷'}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyType}>
                {scan.type === 'face' ? 'Facial Harmony' : scan.type === 'skin' ? 'Skin Analysis' : 'Dental Health'}
              </Text>
              <Text style={styles.historyDate}>
                {scan.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <Text style={[styles.historyScore, { color: scan.scores.overall >= 80 ? Colors.success : Colors.warning }]}>
              {scan.scores.overall}
            </Text>
          </Pressable>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.textPrimary },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  chartCard: { marginHorizontal: 20, backgroundColor: Colors.cardBg, borderRadius: 22, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight, ...Colors.shadow.small },
  chartTabs: { gap: 8, marginBottom: 16 },
  chartTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderLight },
  chartTabText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  chart: { paddingHorizontal: 10, marginBottom: 16, height: 80, justifyContent: 'center' },
  scoreSummary: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 14 },
  scoreItem: { alignItems: 'center' },
  scoreValue: { fontSize: 22, fontWeight: '900' },
  scoreLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },
  impCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: Colors.borderLight, ...Colors.shadow.small },
  impIcon: { fontSize: 24 },
  impLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  impSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  impChange: { fontSize: 18, fontWeight: '900' },
  historyCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: Colors.borderLight },
  historyIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  historyType: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  historyDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  historyScore: { fontSize: 22, fontWeight: '900' },
});
