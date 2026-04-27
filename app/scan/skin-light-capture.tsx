import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Rect, Path } from 'react-native-svg';
import { scanStore } from '../../services/scanStore';
import { captureFaceMesh, isFaceMeshSupported } from '../../modules/arkit-face-mesh/src';

const { width, height } = Dimensions.get('window');

const CAPTURE_STEPS = [
  { id: 's1', label: 'White Light', subtitle: 'Natural daylight simulation', color: '#FFFFFF', accent: '#7C3AED', bg: '#F5F3FF', instruction: 'Hold still — baseline capture' },
  { id: 's2', label: 'Blue Light', subtitle: 'Pore & bacteria detection', color: '#3B82F6', accent: '#1D4ED8', bg: '#EFF6FF', instruction: 'Blue light reveals pore activity' },
  { id: 's3', label: 'Green Light', subtitle: 'Vascular & redness analysis', color: '#22C55E', accent: '#16A34A', bg: '#F0FDF4', instruction: 'Green reveals blood vessels' },
  { id: 's4', label: 'Red Light', subtitle: 'Pigmentation depth mapping', color: '#EF4444', accent: '#DC2626', bg: '#FFF5F5', instruction: 'Red penetrates to deeper layers' },
  { id: 's5', label: 'Raking Light', subtitle: 'Texture & fine line detection', color: '#F59E0B', accent: '#D97706', bg: '#FFFBEB', instruction: 'Side-angled light reveals texture' },
];

function FaceOvalSvg({ accentColor }: { accentColor: string }) {
  const w = 200, h = 260;
  const cx = w / 2, cy = h / 2, rx = 80, ry = 110;
  const len = 28;
  return (
    <Svg width={w} height={h}>
      {/* Oval outline */}
      <Path
        d={`M ${cx} ${cy - ry} A ${rx} ${ry} 0 1 1 ${cx - 0.01} ${cy - ry}`}
        stroke={accentColor}
        strokeWidth="2"
        strokeDasharray="6 4"
        fill="none"
        opacity={0.6}
      />
      {/* Corner brackets */}
      {/* TL */}
      <Rect x={cx - rx - 4} y={cy - ry - 4} width={len} height={4} fill={accentColor} />
      <Rect x={cx - rx - 4} y={cy - ry - 4} width={4} height={len} fill={accentColor} />
      {/* TR */}
      <Rect x={cx + rx - len + 4} y={cy - ry - 4} width={len} height={4} fill={accentColor} />
      <Rect x={cx + rx} y={cy - ry - 4} width={4} height={len} fill={accentColor} />
      {/* BL */}
      <Rect x={cx - rx - 4} y={cy + ry} width={len} height={4} fill={accentColor} />
      <Rect x={cx - rx - 4} y={cy + ry - len + 4} width={4} height={len} fill={accentColor} />
      {/* BR */}
      <Rect x={cx + rx - len + 4} y={cy + ry} width={len} height={4} fill={accentColor} />
      <Rect x={cx + rx} y={cy + ry - len + 4} width={4} height={len} fill={accentColor} />
    </Svg>
  );
}

export default function SkinLightCaptureScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const capturedUris = useRef<string[]>([]); // accumulates one URI per light step
  const [step, setStep] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [captured, setCaptured] = useState(false);
  const [capturedSteps, setCapturedSteps] = useState<boolean[]>(new Array(CAPTURE_STEPS.length).fill(false));
  const flashAnim = useRef(new Animated.Value(0)).current;
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Safety fallback — prevents crash if step ever goes out of bounds
  const current = CAPTURE_STEPS[step] ?? CAPTURE_STEPS[0];
  const doneRef = useRef(false);

  // Both functions take `s` explicitly — no stale-closure risk
  const startStep = (s: number) => {
    if (countdownRef.current) clearTimeout(countdownRef.current);
    setCaptured(false);
    setCountdown(3);
    let n = 3;
    const tick = () => {
      n--;
      if (n <= 0) {
        setCountdown(null);
        runCapture(s);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCountdown(n);
        countdownRef.current = setTimeout(tick, 1000);
      }
    };
    countdownRef.current = setTimeout(tick, 1000);
  };

  const runCapture = async (s: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCaptured(true);
    setCapturedSteps((prev) => {
      const next = [...prev];
      next[s] = true;
      return next;
    });
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    // Take the actual photo and store the URI
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85, skipProcessing: true, base64: false });
      if (photo?.uri) capturedUris.current.push(photo.uri);
    } catch (_) {}

    setTimeout(() => {
      if (s < CAPTURE_STEPS.length - 1) {
        const next = s + 1;
        setStep(next);
        startStep(next);
      } else {
        if (!doneRef.current) {
          doneRef.current = true;
          // Photos done → run optional ARKit mesh capture, then navigate.
          finalizeCapture();
        }
      }
    }, 900);
  };

  // ─── ARKit face-mesh capture (optional, iPhone X+) ────────────────
  // Shows "Hold still for a moment…" briefly while ARFaceTracking warms up.
  // Soft-fails on unsupported devices and on timeout — scan still works.
  const [meshCapturing, setMeshCapturing] = useState(false);
  const finalizeCapture = async () => {
    let faceMesh: import('../../modules/arkit-face-mesh/src').FaceMeshResult | null = null;

    if (isFaceMeshSupported()) {
      setMeshCapturing(true);
      try {
        const result = await captureFaceMesh();
        if (result.supported) {
          faceMesh = result;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (e) {
        console.warn('[skin-light-capture] face mesh capture failed:', e);
      } finally {
        setMeshCapturing(false);
      }
    }

    scanStore.set({ type: 'skin', imageUris: capturedUris.current, faceMesh });
    router.push({ pathname: '/scan/processing', params: { type: 'skin' } });
  };

  // Request permission on mount
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, []);

  // Start first step once permission is granted
  useEffect(() => {
    if (permission?.granted) {
      startStep(0);
    }
    return () => { if (countdownRef.current) clearTimeout(countdownRef.current); };
  }, [permission?.granted]);

  // Permission not yet determined
  if (!permission) {
    return <View style={[styles.container, styles.center]}><Text style={{ color: '#fff' }}>Loading…</Text></View>;
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.permEmoji}>📷</Text>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permSub}>Camera is required for skin light capture.</Text>
        <Pressable onPress={requestPermission} style={styles.permBtn}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 14 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: current.bg }]}>
      {/* Flash overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: flashAnim, zIndex: 99 }]} pointerEvents="none" />

      {/* ARKit mesh capture overlay — shown briefly after final photo */}
      {meshCapturing && (
        <View style={meshOverlayStyles.backdrop} pointerEvents="auto">
          <View style={meshOverlayStyles.card}>
            <Text style={meshOverlayStyles.icon}>👤</Text>
            <Text style={meshOverlayStyles.title}>Hold still for a moment…</Text>
            <Text style={meshOverlayStyles.sub}>Mapping your face geometry</Text>
          </View>
        </View>
      )}

      {/* Real camera */}
      <View style={styles.cameraArea}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />

        {/* Color tint overlay per light step */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: current.color, opacity: 0.18 }]} />

        {/* Face oval guide */}
        <View style={styles.ovalWrap}>
          <FaceOvalSvg accentColor={current.accent} />
        </View>

        {/* Countdown */}
        {countdown !== null && !captured && (
          <View style={styles.countdownWrap}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}

        {captured && (
          <View style={styles.capturedBadge}>
            <Text style={styles.capturedText}>✓ Captured</Text>
          </View>
        )}

        {/* Top bar */}
        <SafeAreaView style={styles.topBar} edges={['top']}>
          <Pressable onPress={() => { if (countdownRef.current) clearTimeout(countdownRef.current); router.back(); }} style={styles.closeBtn} android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>✕</Text>
          </Pressable>
          <View style={[styles.lightBadge, { backgroundColor: current.color + 'CC', borderColor: '#fff4' }]}>
            <Text style={styles.lightBadgeText}>{current.label}</Text>
          </View>
          <View style={{ width: 40 }} />
        </SafeAreaView>
      </View>

      {/* Bottom info panel */}
      <View style={[styles.panel, { backgroundColor: current.bg }]}>
        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {CAPTURE_STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: capturedSteps[i]
                    ? current.accent
                    : i === step
                    ? current.accent + 'AA'
                    : '#D1D5DB',
                  width: i === step ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>

        <Text style={[styles.stepLabel, { color: current.accent }]}>{current.label}</Text>
        <Text style={styles.stepSub}>{current.subtitle}</Text>
        <Text style={styles.instruction}>{current.instruction}</Text>

        <Text style={styles.stepCount}>Step {step + 1} of {CAPTURE_STEPS.length}</Text>
      </View>
    </View>
  );
}

const meshOverlayStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  card:     { backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 32, paddingVertical: 28, alignItems: 'center', minWidth: 240 },
  icon:     { fontSize: 44 },
  title:    { marginTop: 14, fontSize: 17, fontWeight: '800', color: '#1C1C1E' },
  sub:      { marginTop: 4, fontSize: 13, color: '#8E8E93' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  cameraArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permEmoji: { fontSize: 52, marginBottom: 16 },
  permTitle: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  permSub:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  permBtn:   { backgroundColor: '#7C3AED', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13 },
  permBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ovalWrap: { alignItems: 'center', justifyContent: 'center' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  lightBadge: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  lightBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  countdownWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  countdownText: { fontSize: 96, fontWeight: '900', color: '#fff', opacity: 0.85 },
  capturedBadge: { position: 'absolute', bottom: 30, backgroundColor: 'rgba(34,197,94,0.9)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  capturedText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  panel: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, alignItems: 'center', gap: 4 },
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  stepLabel: { fontSize: 18, fontWeight: '900' },
  stepSub: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  instruction: { fontSize: 13, color: '#4B5563', textAlign: 'center' },
  stepCount: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 4 },
});
