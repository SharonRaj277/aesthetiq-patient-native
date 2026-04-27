import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { CAPTURE_STEPS } from '../../constants/mockData';

const { width, height } = Dimensions.get('window');

export default function SkinMultilightGuideScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const dotScale = useRef(CAPTURE_STEPS.map(() => new Animated.Value(1))).current;

  const current = CAPTURE_STEPS[step];

  useEffect(() => {
    Animated.spring(dotScale[step], { toValue: 1.6, friction: 4, useNativeDriver: true }).start();
    CAPTURE_STEPS.forEach((_, i) => { if (i !== step) Animated.spring(dotScale[i], { toValue: 1, friction: 4, useNativeDriver: true }).start(); });
  }, [step]);

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      if (step < CAPTURE_STEPS.length - 1) {
        setStep(step + 1);
      } else {
        router.push('/scan/skin-light-capture');
      }
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: current.screenColor }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        {/* Back */}
        <Pressable onPress={() => step > 0 ? setStep(step - 1) : router.back()} style={styles.backBtn} android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}>
          <Text style={[styles.backArrow, { color: current.accentColor }]}>‹</Text>
        </Pressable>

        {/* Glowing Circle */}
        <Animated.View style={[styles.glowCircle, { backgroundColor: current.accentColor + '20', borderColor: current.accentColor + '60', opacity: fadeAnim }]}>
          <View style={[styles.glowInner, { backgroundColor: current.accentColor + '40' }]}>
            <Text style={styles.stepEmoji}>
              {step === 0 ? '☀️' : step === 1 ? '💙' : step === 2 ? '💚' : step === 3 ? '❤️' : '🔦'}
            </Text>
          </View>
        </Animated.View>

        {/* Content */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Text style={[styles.stepNum, { color: current.accentColor }]}>Step {step + 1} of {CAPTURE_STEPS.length}</Text>
          <Text style={styles.stepLabel}>{current.label}</Text>
          <Text style={styles.stepSubtitle}>{current.subtitle}</Text>
          <Text style={styles.instruction}>{current.instruction}</Text>

          <View style={styles.revealRow}>
            <Text style={styles.revealLabel}>Reveals:</Text>
            {current.analyzes.map((a) => (
              <View key={a} style={[styles.revealChip, { borderColor: current.accentColor }]}>
                <Text style={[styles.revealChipText, { color: current.accentColor }]}>{a}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.detail}>{current.detail}</Text>
        </Animated.View>

        {/* Step Dots */}
        <View style={styles.dotsRow}>
          {CAPTURE_STEPS.map((s, i) => (
            <Animated.View
              key={s.id}
              style={[styles.dot, {
                backgroundColor: i === step ? current.accentColor : current.accentColor + '40',
                transform: [{ scale: dotScale[i] }],
              }]}
            />
          ))}
        </View>

        {/* Next Button */}
        <Pressable
          onPress={goNext}
          android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          style={[styles.nextBtn, { backgroundColor: current.accentColor }]}
        >
          <Text style={styles.nextBtnText}>
            {step < CAPTURE_STEPS.length - 1 ? 'Next →' : 'Start Capture →'}
          </Text>
        </Pressable>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  backBtn: { alignSelf: 'flex-start', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  backArrow: { fontSize: 28 },
  glowCircle: { width: 180, height: 180, borderRadius: 90, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 32 },
  glowInner: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  stepEmoji: { fontSize: 44 },
  content: { alignItems: 'center', flex: 1 },
  stepNum: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  stepLabel: { fontSize: 24, fontWeight: '900', color: '#1E1B4B', textAlign: 'center', marginBottom: 6 },
  stepSubtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 16, textAlign: 'center' },
  instruction: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 20, paddingHorizontal: 8 },
  revealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  revealLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  revealChip: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 5 },
  revealChipText: { fontSize: 11, fontWeight: '700' },
  detail: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  nextBtn: { width: width - 48, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  nextBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
