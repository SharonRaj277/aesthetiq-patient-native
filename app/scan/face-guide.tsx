import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import Svg, { Ellipse, Line, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

const TIPS = [
  { emoji: '💡', text: 'Use natural daylight or a bright room' },
  { emoji: '🪞', text: 'Use front camera for best results' },
  { emoji: '👤', text: 'Face the camera directly' },
  { emoji: '😐', text: 'Keep a neutral expression' },
  { emoji: '📱', text: 'Hold phone at arm\'s length' },
  { emoji: '🕶️', text: 'Remove glasses or accessories' },
  { emoji: '☀️', text: 'Avoid harsh backlighting' },
];

const STEPS = [
  { label: 'Front View', instruction: 'Look directly at the camera. Keep face centered in the oval.', angle: '0°' },
  { label: 'Left Profile', instruction: 'Turn your head 90° to the left. Keep chin level.', angle: '90° left' },
  { label: 'Right Profile', instruction: 'Turn your head 90° to the right. Keep chin level.', angle: '90° right' },
];

function FrontSvg() {
  const w = width - 80, h = w * 1.3;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Ellipse cx={w / 2} cy={h * 0.48} rx={w * 0.34} ry={h * 0.42} fill="none" stroke="#7C3AED" strokeWidth={2} strokeDasharray="8 4" />
      <Line x1={w / 2} y1={h * 0.08} x2={w / 2} y2={h * 0.9} stroke="#A855F7" strokeWidth={1} strokeDasharray="4 4" />
      <Line x1={w * 0.16} y1={h * 0.27} x2={w * 0.84} y2={h * 0.27} stroke="#A855F7" strokeWidth={1} strokeDasharray="4 4" />
      <Line x1={w * 0.16} y1={h * 0.48} x2={w * 0.84} y2={h * 0.48} stroke="#A855F7" strokeWidth={1} strokeDasharray="4 4" />
      <Line x1={w * 0.16} y1={h * 0.68} x2={w * 0.84} y2={h * 0.68} stroke="#A855F7" strokeWidth={1} strokeDasharray="4 4" />
      <Circle cx={w * 0.37} cy={h * 0.38} r={4} fill="#7C3AED" opacity={0.5} />
      <Circle cx={w * 0.63} cy={h * 0.38} r={4} fill="#7C3AED" opacity={0.5} />
    </Svg>
  );
}

function ProfileSvg({ direction }: { direction: 'left' | 'right' }) {
  const w = width - 80, h = w * 1.3;
  const flip = direction === 'right' ? -1 : 1;
  const cx = direction === 'right' ? w * 0.4 : w * 0.6;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Ellipse cx={cx} cy={h * 0.44} rx={w * 0.28} ry={h * 0.38} fill="none" stroke="#7C3AED" strokeWidth={2} strokeDasharray="8 4" />
      <Line x1={w * 0.1} y1={h * 0.7} x2={w * 0.9} y2={h * 0.7} stroke="#A855F7" strokeWidth={1} strokeDasharray="4 4" />
    </Svg>
  );
}

export default function FaceGuideScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = overview, 1-3 = photo steps
  const progressAnim  = useRef(new Animated.Value(0)).current;
  const cameraLaunched = useRef(false);

  const goToStep = (s: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(s);
    Animated.timing(progressAnim, { toValue: s / 3, duration: 350, useNativeDriver: false }).start();
  };

  // When camera returns via router.back(), auto-advance to next step
  useFocusEffect(
    useCallback(() => {
      if (cameraLaunched.current && step >= 1 && step <= 2) {
        cameraLaunched.current = false;
        goToStep(step + 1);
      }
    }, [step])
  );

  if (step === 0) {
    return (
      <LinearGradient colors={['#4C1D95', '#7C3AED']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView contentContainerStyle={styles.overviewContent} showsVerticalScrollIndicator={false}>
            <View style={styles.overviewHeader}>
              <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }} style={styles.backBtn}>
                <Text style={{ fontSize: 22, color: '#fff' }}>‹</Text>
              </Pressable>
              <Text style={styles.overviewTitle}>✨ Facial Scan</Text>
              <View style={{ width: 40 }} />
            </View>

            <Text style={styles.overviewSub}>We'll capture 3 photos: front, left, and right profile</Text>

            {/* Tips Card */}
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>Before You Start</Text>
              {TIPS.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipEmoji}>{tip.emoji}</Text>
                  <Text style={styles.tipText}>{tip.text}</Text>
                </View>
              ))}
            </View>

            {/* Step Previews */}
            <View style={styles.stepPreviews}>
              {STEPS.map((s, i) => (
                <View key={i} style={styles.stepPreviewItem}>
                  <View style={styles.stepPreviewCircle}>
                    <Text style={styles.stepPreviewNum}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepPreviewLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => goToStep(1)}
              android_ripple={{ color: 'rgba(124,58,237,0.2)' }}
              style={styles.startBtn}
            >
              <Text style={styles.startBtnText}>I'm Ready — Start Scan</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const currentStep = STEPS[step - 1];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.stepHeader}>
          <Pressable onPress={() => goToStep(step - 1)} android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.stepCounter}>Step {step} of 3</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }]} />
        </View>

        {/* SVG Illustration */}
        <View style={styles.svgContainer}>
          {step === 1 ? <FrontSvg /> : step === 2 ? <ProfileSvg direction="left" /> : <ProfileSvg direction="right" />}
        </View>

        <Text style={styles.stepLabel}>{currentStep.label}</Text>
        <Text style={styles.stepInstruction}>{currentStep.instruction}</Text>

        {/* Tip Card */}
        <View style={styles.stepTipCard}>
          <Text style={styles.stepTipTitle}>Tips</Text>
          {TIPS.slice(0, 3).map((tip, i) => (
            <Text key={i} style={styles.stepTipText}>{tip.emoji} {tip.text}</Text>
          ))}
        </View>

        {/* Take Photo Button */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            cameraLaunched.current = true;
            router.push({ pathname: '/scan/camera', params: { type: 'face', captureStep: step.toString() } });
          }}
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          style={{ marginHorizontal: 20, borderRadius: 16, overflow: 'hidden' }}
        >
          <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.takePhotoBtn}>
            <Text style={styles.takePhotoBtnText}>📷  Take Photo</Text>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  overviewContent: { paddingHorizontal: 20, paddingBottom: 40 },
  overviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 8 },
  overviewTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  overviewSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 20 },
  tipsCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 18, marginBottom: 20 },
  tipsTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 12 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  tipEmoji: { fontSize: 16, width: 24 },
  tipText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 },
  stepPreviews: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 24 },
  stepPreviewItem: { alignItems: 'center', gap: 6 },
  stepPreviewCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  stepPreviewNum: { fontSize: 20, fontWeight: '800', color: '#fff' },
  stepPreviewLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  startBtn: { backgroundColor: '#fff', borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center' },
  startBtnText: { fontSize: 16, fontWeight: '800', color: '#7C3AED' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.textPrimary },

  stepContent: { paddingBottom: 20 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, marginBottom: 14 },
  stepCounter: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  progressBg: { marginHorizontal: 20, height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, marginBottom: 24, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  svgContainer: { alignItems: 'center', marginBottom: 20, paddingHorizontal: 40 },
  stepLabel: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  stepInstruction: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginHorizontal: 32, lineHeight: 22, marginBottom: 20 },
  stepTipCard: { marginHorizontal: 20, backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: Colors.borderLight },
  stepTipTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  stepTipText: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  takePhotoBtn: { height: 54, alignItems: 'center', justifyContent: 'center' },
  takePhotoBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
