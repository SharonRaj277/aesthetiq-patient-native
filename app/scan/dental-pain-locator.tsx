import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Ellipse, Path, Circle, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../constants/colors';

const ZONES = [
  { id: 'upper-left', label: 'Upper Left', cx: 90, cy: 80, rx: 48, ry: 28 },
  { id: 'upper-front', label: 'Upper Front', cx: 180, cy: 70, rx: 44, ry: 24 },
  { id: 'upper-right', label: 'Upper Right', cx: 270, cy: 80, rx: 48, ry: 28 },
  { id: 'lower-left', label: 'Lower Left', cx: 90, cy: 155, rx: 48, ry: 28 },
  { id: 'lower-front', label: 'Lower Front', cx: 180, cy: 165, rx: 44, ry: 24 },
  { id: 'lower-right', label: 'Lower Right', cx: 270, cy: 155, rx: 48, ry: 28 },
];

const PAIN_LEVELS = [
  { value: 1, label: 'Mild', color: '#22C55E' },
  { value: 2, label: 'Moderate', color: '#F59E0B' },
  { value: 3, label: 'Severe', color: '#EF4444' },
];

export default function DentalPainLocatorScreen() {
  const router = useRouter();
  const [selectedZones, setSelectedZones] = useState<Record<string, number>>({});
  const [activePainLevel, setActivePainLevel] = useState(1);

  const toggleZone = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedZones((prev) => {
      const next = { ...prev };
      if (next[id] !== undefined) {
        delete next[id];
      } else {
        next[id] = activePainLevel;
      }
      return next;
    });
  };

  const getPainColor = (level: number) => PAIN_LEVELS.find((p) => p.value === level)?.color ?? '#6B7280';

  const handleContinue = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Object.values(selectedZones).some((v) => v === 3)) {
      router.push('/scan/dental-symptom-questionnaire');
    } else {
      router.push('/scan/dental-guide');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Locate Your Pain</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.intro}>Tap the area(s) where you feel pain. Set pain level first.</Text>

        {/* Pain Level Selector */}
        <View style={styles.painLevelRow}>
          <Text style={styles.painLevelLabel}>Pain Level:</Text>
          {PAIN_LEVELS.map((p) => (
            <Pressable
              key={p.value}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActivePainLevel(p.value); }}
              style={[styles.painLevelBtn, activePainLevel === p.value && { backgroundColor: p.color, borderColor: p.color }]}
            >
              <Text style={[styles.painLevelText, activePainLevel === p.value && { color: '#fff' }]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Jaw Diagram */}
        <View style={styles.diagramCard}>
          <Text style={styles.diagramTitle}>Tap to mark pain zones</Text>
          <Svg width={360} height={240} viewBox="0 0 360 240">
            {/* Jaw outline */}
            <Ellipse cx="180" cy="115" rx="155" ry="100" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
            {/* Center divider */}
            <Path d="M 180 20 L 180 210" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 3" />
            {/* Horizontal divider */}
            <Path d="M 30 115 L 330 115" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 3" />

            {/* Zone ellipses */}
            {ZONES.map((z) => {
              const isSelected = selectedZones[z.id] !== undefined;
              const color = isSelected ? getPainColor(selectedZones[z.id]) : '#CBD5E1';
              return (
                <React.Fragment key={z.id}>
                  <Ellipse
                    cx={z.cx}
                    cy={z.cy}
                    rx={z.rx}
                    ry={z.ry}
                    fill={isSelected ? color + '40' : 'transparent'}
                    stroke={color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    onPress={() => toggleZone(z.id)}
                  />
                  {isSelected && (
                    <Circle cx={z.cx} cy={z.cy} r={8} fill={color} />
                  )}
                  <SvgText
                    x={z.cx}
                    y={z.cy + (isSelected ? 20 : 6)}
                    fontSize="9"
                    fill={isSelected ? color : '#94A3B8'}
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {z.label}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Labels */}
            <SvgText x="180" y="18" fontSize="10" fill="#94A3B8" textAnchor="middle" fontWeight="700">UPPER</SvgText>
            <SvgText x="180" y="232" fontSize="10" fill="#94A3B8" textAnchor="middle" fontWeight="700">LOWER</SvgText>
            <SvgText x="15" y="118" fontSize="9" fill="#94A3B8" textAnchor="middle">L</SvgText>
            <SvgText x="345" y="118" fontSize="9" fill="#94A3B8" textAnchor="middle">R</SvgText>
          </Svg>
        </View>

        {/* Selected zones summary */}
        {Object.keys(selectedZones).length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Marked Areas:</Text>
            {Object.entries(selectedZones).map(([zoneId, level]) => {
              const zone = ZONES.find((z) => z.id === zoneId);
              const pain = PAIN_LEVELS.find((p) => p.value === level);
              return (
                <View key={zoneId} style={styles.summaryRow}>
                  <View style={[styles.painDot, { backgroundColor: pain?.color }]} />
                  <Text style={styles.summaryZone}>{zone?.label}</Text>
                  <Text style={[styles.summaryLevel, { color: pain?.color }]}>{pain?.label}</Text>
                </View>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={handleContinue}
          disabled={Object.keys(selectedZones).length === 0}
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          style={{ borderRadius: 16, overflow: 'hidden', marginTop: 8, opacity: Object.keys(selectedZones).length > 0 ? 1 : 0.5 }}
        >
          <LinearGradient colors={['#0EA5E9', '#A855F7']} style={styles.continueBtn}>
            <Text style={styles.continueBtnText}>Continue →</Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => router.push('/scan/dental-guide')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip — no specific area</Text>
        </Pressable>

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
  intro: { fontSize: 14, color: Colors.textSecondary, marginHorizontal: 20, marginBottom: 16, lineHeight: 22 },
  painLevelRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 16, gap: 8, flexWrap: 'wrap' },
  painLevelLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  painLevelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: Colors.cardBg },
  painLevelText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  diagramCard: { marginHorizontal: 20, backgroundColor: Colors.cardBg, borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center', marginBottom: 16 },
  diagramTitle: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 12 },
  summaryCard: { marginHorizontal: 20, backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: Colors.borderLight, marginBottom: 12, gap: 8 },
  summaryTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  painDot: { width: 10, height: 10, borderRadius: 5 },
  summaryZone: { flex: 1, fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  summaryLevel: { fontSize: 12, fontWeight: '700' },
  continueBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginHorizontal: 20 },
  continueBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
});
