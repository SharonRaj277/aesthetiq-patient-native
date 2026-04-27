import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line, Ellipse, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');
const SVG_W = width - 48;
const SVG_H = SVG_W * 1.25;
const cx = SVG_W / 2;
const cy = SVG_H / 2;

const LANDMARKS = [
  // Eyes
  { id: 'l_eye', x: cx - 55, y: cy - 60, label: 'L Eye', color: '#7C3AED' },
  { id: 'r_eye', x: cx + 55, y: cy - 60, label: 'R Eye', color: '#7C3AED' },
  // Brows
  { id: 'l_brow', x: cx - 60, y: cy - 82, label: 'L Brow', color: '#A855F7' },
  { id: 'r_brow', x: cx + 60, y: cy - 82, label: 'R Brow', color: '#A855F7' },
  // Nose
  { id: 'nose', x: cx, y: cy - 10, label: 'Nose', color: '#EC4899' },
  { id: 'nose_l', x: cx - 22, y: cy + 8, label: '', color: '#EC4899' },
  { id: 'nose_r', x: cx + 22, y: cy + 8, label: '', color: '#EC4899' },
  // Mouth
  { id: 'mouth_l', x: cx - 30, y: cy + 44, label: 'Mouth', color: '#F59E0B' },
  { id: 'mouth_r', x: cx + 30, y: cy + 44, label: '', color: '#F59E0B' },
  { id: 'mouth_t', x: cx, y: cy + 36, label: '', color: '#F59E0B' },
  { id: 'mouth_b', x: cx, y: cy + 55, label: '', color: '#F59E0B' },
  // Jaw
  { id: 'jaw_l', x: cx - 90, y: cy + 90, label: 'Jaw', color: '#22C55E' },
  { id: 'jaw_r', x: cx + 90, y: cy + 90, label: '', color: '#22C55E' },
  { id: 'chin', x: cx, y: cy + 130, label: 'Chin', color: '#22C55E' },
  // Cheeks
  { id: 'cheek_l', x: cx - 88, y: cy + 10, label: 'Cheek', color: '#0EA5E9' },
  { id: 'cheek_r', x: cx + 88, y: cy + 10, label: '', color: '#0EA5E9' },
];

const CONNECTIONS = [
  ['l_brow', 'l_eye'], ['r_brow', 'r_eye'],
  ['l_eye', 'nose'], ['r_eye', 'nose'],
  ['nose', 'nose_l'], ['nose', 'nose_r'],
  ['nose_l', 'mouth_l'], ['nose_r', 'mouth_r'],
  ['mouth_l', 'mouth_t'], ['mouth_r', 'mouth_t'],
  ['mouth_l', 'mouth_b'], ['mouth_r', 'mouth_b'],
  ['mouth_l', 'jaw_l'], ['mouth_r', 'jaw_r'],
  ['jaw_l', 'chin'], ['jaw_r', 'chin'],
  ['l_eye', 'cheek_l'], ['r_eye', 'cheek_r'],
];

function getLM(id: string) {
  return LANDMARKS.find((l) => l.id === id)!;
}

export default function LandmarkOverlayScreen() {
  const router = useRouter();
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Facial Landmarks</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>AI-detected facial reference points used for analysis</Text>

      <Animated.View style={[styles.svgWrap, { opacity: fadeAnim }]}>
        <Svg width={SVG_W} height={SVG_H}>
          {/* Face oval */}
          <Ellipse cx={cx} cy={cy} rx={110} ry={145} fill="none" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="6 4" />

          {/* Connections */}
          {CONNECTIONS.map(([a, b], i) => {
            const la = getLM(a), lb = getLM(b);
            if (!la || !lb) return null;
            return (
              <Line
                key={i}
                x1={la.x} y1={la.y}
                x2={lb.x} y2={lb.y}
                stroke={la.color}
                strokeWidth="1"
                opacity={0.35}
              />
            );
          })}

          {/* Landmark dots */}
          {LANDMARKS.map((lm) => (
            <React.Fragment key={lm.id}>
              <Circle cx={lm.x} cy={lm.y} r={5} fill={lm.color} opacity={0.9} />
              <Circle cx={lm.x} cy={lm.y} r={9} fill={lm.color} opacity={0.15} />
            </React.Fragment>
          ))}
        </Svg>
      </Animated.View>

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { color: '#7C3AED', label: 'Eyes & Brows' },
          { color: '#EC4899', label: 'Nose' },
          { color: '#F59E0B', label: 'Mouth' },
          { color: '#22C55E', label: 'Jaw & Chin' },
          { color: '#0EA5E9', label: 'Cheeks' },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.count}>{LANDMARKS.filter((l) => l.label).length} key landmarks detected</Text>

      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.back(); }}
        android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
        style={{ borderRadius: 16, overflow: 'hidden', marginHorizontal: 24, marginBottom: 24 }}
      >
        <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.ctaBtn}>
          <Text style={styles.ctaBtnText}>View Full Analysis →</Text>
        </LinearGradient>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: '#1E1B4B' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E1B4B' },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 16, paddingHorizontal: 24 },
  svgWrap: { alignSelf: 'center', marginHorizontal: 24, backgroundColor: '#F9FAFB', borderRadius: 24, padding: 0, borderWidth: 1.5, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 16 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 24, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#4B5563', fontWeight: '600' },
  count: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 20, fontWeight: '600' },
  ctaBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  ctaBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
