import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { scanStore } from '../../services/scanStore';
import { captureFaceMeshWithDepth, isFaceMeshSupported } from '../../modules/arkit-face-mesh/src';

const { height } = Dimensions.get('window');

// ─── Dental: 6 positions ──────────────────────────────────────────
const DENTAL_POSITIONS = [
  { label: 'Front View',   instruction: 'Show all front teeth, smile naturally' },
  { label: 'Left Side',    instruction: 'Turn head right, show left side teeth' },
  { label: 'Right Side',   instruction: 'Turn head left, show right side teeth' },
  { label: 'Upper Arch',   instruction: 'Tilt head back slightly, show upper teeth' },
  { label: 'Lower Arch',   instruction: 'Tilt chin up, show lower teeth' },
  { label: 'Bite View',    instruction: 'Close teeth together naturally' },
];

// ─── Face: 3 angles (for instruction label in camera) ────────────
const FACE_STEPS = [
  { label: 'Front View',    instruction: 'Look directly at camera. Keep face centered' },
  { label: 'Left Profile',  instruction: 'Turn head 90° to the left. Keep chin level' },
  { label: 'Right Profile', instruction: 'Turn head 90° to the right. Keep chin level' },
];

export default function ScanCameraScreen() {
  const router = useRouter();
  const { type, captureStep } = useLocalSearchParams<{
    type: 'face' | 'skin' | 'dental';
    captureStep?: string;
  }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing]     = useState<CameraType>('front');
  const [captured, setCaptured] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [dentalStep, setDentalStep] = useState(0); // 0–5 for 6 dental positions
  const [meshCapturing, setMeshCapturing] = useState(false);

  const cameraRef       = useRef<CameraView>(null);
  const capturedUris    = useRef<string[]>([]); // accumulates URIs across multi-step captures
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceGuard = useRef(false); // prevents double-advance

  const scanConfig = {
    face:   { color: Colors.primary, frameW: 260, frameH: 320 },
    skin:   { color: Colors.teal,    frameW: 280, frameH: 280 },
    dental: { color: Colors.success, frameW: 300, frameH: 210 },
  };
  const cfg = scanConfig[type ?? 'face'];

  // ── Derived labels ───────────────────────────────────────────────
  const faceStepIdx = Math.max(0, parseInt(captureStep ?? '1') - 1);

  const currentInstruction =
    type === 'dental' ? DENTAL_POSITIONS[dentalStep].instruction :
    type === 'face'   ? FACE_STEPS[faceStepIdx]?.instruction ?? 'Position your face' :
    'Hold steady for capture';

  const badgeLabel =
    type === 'dental' ? `${DENTAL_POSITIONS[dentalStep].label}  ${dentalStep + 1}/${DENTAL_POSITIONS.length}` :
    type === 'face'   ? `${FACE_STEPS[faceStepIdx]?.label}  ${captureStep ?? '1'}/3` :
    'Skin Scan';

  // ── Permission guard ─────────────────────────────────────────────
  useEffect(() => {
    if (permission && !permission.granted && !permission.canAskAgain) {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access in your device settings.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [permission]);

  // ── Phase 2B: ARKit + LiDAR mesh capture for face scans ─────────
  const finalizeFaceCapture = async (lastUri?: string) => {
    const pending     = scanStore.peek();
    const accumulated = pending?.imageUris ?? (lastUri ? [lastUri] : []);

    let faceMesh:        import('../../modules/arkit-face-mesh/src').FaceMeshResult | null = null;
    let contourAnalysis: import('../../modules/arkit-face-mesh/src').ContourAnalysis | null = null;
    let hasLiDAR        = false;
    let depthEnhanced   = false;

    if (isFaceMeshSupported()) {
      setMeshCapturing(true);
      try {
        const result = await captureFaceMeshWithDepth();
        if (result.supported) {
          faceMesh        = result;
          contourAnalysis = result.contourAnalysis ?? null;
          hasLiDAR        = !!result.hasLiDAR;
          depthEnhanced   = !!result.depthEnhanced;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (e) {
        console.warn('[camera/face] mesh+depth capture failed:', e);
      } finally {
        setMeshCapturing(false);
      }
    }

    scanStore.set({
      type: 'face',
      imageUris: accumulated,
      faceMesh,
      contourAnalysis,
      hasLiDAR,
      depthEnhanced,
    });
    router.push({ pathname: '/scan/processing', params: { type: 'face' } });
  };

  // ── Capture logic ────────────────────────────────────────────────
  const handleCapture = async () => {
    if (!cameraRef.current || captured || advanceGuard.current) return;
    advanceGuard.current = true;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCaptured(true);

    let uri: string | undefined;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, skipProcessing: true, base64: false });
      uri = photo?.uri;
    } catch (_) {}

    if (type === 'dental') {
      // ── Dental: 6 sequential positions — accumulate in local ref ─
      if (uri) capturedUris.current.push(uri);
      setTimeout(() => {
        if (dentalStep < DENTAL_POSITIONS.length - 1) {
          setDentalStep((s) => s + 1);
          setCaptured(false);
          advanceGuard.current = false;
        } else {
          scanStore.set({ type: 'dental', imageUris: capturedUris.current });
          router.push({ pathname: '/scan/processing', params: { type: 'dental' } });
        }
      }, 700);

    } else if (type === 'face') {
      // ── Face: each mount captures 1 angle — persist URI to scanStore
      // so it survives the router.back() unmount between steps.
      const stepNum = parseInt(captureStep ?? '1');
      if (uri) {
        if (stepNum === 1) scanStore.reset(); // clear any stale previous scan
        scanStore.addUri('face', uri);
      }
      setTimeout(() => {
        if (stepNum < 3) {
          router.back(); // face-guide advances to next step via useFocusEffect
        } else {
          // Final photo done → run optional ARKit + LiDAR depth capture
          finalizeFaceCapture(uri);
        }
      }, 600);

    } else {
      // ── Skin (fallback) ──────────────────────────────────────────
      if (uri) capturedUris.current.push(uri);
      scanStore.set({ type: (type ?? 'skin') as any, imageUris: capturedUris.current });
      setTimeout(() => {
        router.push({ pathname: '/scan/processing', params: { type } });
      }, 600);
    }
  };

  const startCountdown = () => {
    if (captured) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCountdown(3);
    const tick = (n: number) => {
      if (n <= 0) { setCountdown(null); handleCapture(); return; }
      countdownRef.current = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCountdown(n - 1);
        tick(n - 1);
      }, 1000);
    };
    tick(3);
  };

  // ── Cleanup countdown on unmount ─────────────────────────────────
  useEffect(() => {
    return () => { if (countdownRef.current) clearTimeout(countdownRef.current); };
  }, []);

  // ── Permission screens ───────────────────────────────────────────
  if (!permission) {
    return <View style={styles.center}><Text style={styles.permText}>Loading camera…</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permEmoji}>📷</Text>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permSub}>We need camera access to perform your scan.</Text>
        <Pressable onPress={requestPermission} style={styles.permBtn}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 14 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // ── Camera UI ────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

      {/* Phase 2B: ARKit + LiDAR mesh capture overlay (face scan) */}
      {meshCapturing && (
        <View style={meshOverlayStyles.backdrop} pointerEvents="auto">
          <View style={meshOverlayStyles.card}>
            <Text style={meshOverlayStyles.icon}>👤</Text>
            <Text style={meshOverlayStyles.title}>Hold still for a moment…</Text>
            <Text style={meshOverlayStyles.sub}>Capturing facial geometry with depth</Text>
          </View>
        </View>
      )}

      {/* Scan frame corners */}
      <View style={[styles.frameContainer, {
        width: cfg.frameW, height: cfg.frameH,
        top: (height - cfg.frameH) / 2 - 50,
      }]}>
        <View style={[styles.corner, styles.cornerTL, { borderColor: cfg.color }]} />
        <View style={[styles.corner, styles.cornerTR, { borderColor: cfg.color }]} />
        <View style={[styles.corner, styles.cornerBL, { borderColor: cfg.color }]} />
        <View style={[styles.corner, styles.cornerBR, { borderColor: cfg.color }]} />
        {captured && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: 0.5, borderRadius: 4 }]} />
        )}
      </View>

      {/* Countdown overlay */}
      {countdown !== null && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownText}>{countdown === 0 ? '📸' : countdown}</Text>
        </View>
      )}

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <Pressable
          onPress={() => {
            if (countdownRef.current) clearTimeout(countdownRef.current);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.iconBtn}
          android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
        >
          <Text style={styles.iconBtnText}>✕</Text>
        </Pressable>
        <View style={styles.scanTypeBadge}>
          <Text style={styles.scanTypeText}>{badgeLabel}</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFacing((f) => (f === 'front' ? 'back' : 'front'));
          }}
          style={styles.iconBtn}
          android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
        >
          <Text style={{ fontSize: 18 }}>🔄</Text>
        </Pressable>
      </SafeAreaView>

      {/* Instruction pill */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>{currentInstruction}</Text>
      </View>

      {/* Progress dots — dental (6) */}
      {type === 'dental' && (
        <View style={styles.dotsRow}>
          {DENTAL_POSITIONS.map((_, i) => (
            <View key={i} style={[styles.dot, {
              backgroundColor: i < dentalStep ? Colors.success : i === dentalStep ? '#fff' : 'rgba(255,255,255,0.3)',
              width: i === dentalStep ? 20 : 8,
            }]} />
          ))}
        </View>
      )}

      {/* Progress dots — face (3) */}
      {type === 'face' && (
        <View style={styles.dotsRow}>
          {[1, 2, 3].map((i) => {
            const stepNum = parseInt(captureStep ?? '1');
            return (
              <View key={i} style={[styles.dot, {
                backgroundColor: i < stepNum ? Colors.primary : i === stepNum ? '#fff' : 'rgba(255,255,255,0.3)',
                width: i === stepNum ? 20 : 8,
              }]} />
            );
          })}
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.sideBtn}
          onPress={startCountdown}
          android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
        >
          <Text style={{ fontSize: 22 }}>⏱️</Text>
          <Text style={styles.sideBtnLabel}>Timer</Text>
        </Pressable>

        <Pressable
          onPress={handleCapture}
          disabled={captured}
          style={[styles.shutterOuter, captured && { opacity: 0.6 }]}
          android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
        >
          <View style={[styles.shutterInner, captured && { backgroundColor: cfg.color }]}>
            <Text style={{ fontSize: 24 }}>{captured ? '✓' : '📷'}</Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.sideBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFacing((f) => (f === 'front' ? 'back' : 'front'));
          }}
          android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
        >
          <Text style={{ fontSize: 22 }}>🔄</Text>
          <Text style={styles.sideBtnLabel}>Flip</Text>
        </Pressable>
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
  container: { flex: 1, backgroundColor: '#000' },
  center:    { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  permEmoji:   { fontSize: 56, marginBottom: 16 },
  permTitle:   { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  permSub:     { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  permText:    { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  permBtn:     { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  permBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  frameContainer: { position: 'absolute', alignSelf: 'center' },
  corner:    { position: 'absolute', width: 28, height: 28, borderWidth: 3 },
  cornerTL:  { top: 0,    left: 0,    borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR:  { top: 0,    right: 0,   borderBottomWidth: 0, borderLeftWidth: 0  },
  cornerBL:  { bottom: 0, left: 0,    borderTopWidth: 0,    borderRightWidth: 0 },
  cornerBR:  { bottom: 0, right: 0,   borderTopWidth: 0,    borderLeftWidth: 0  },

  countdownOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  countdownText:    { fontSize: 100, fontWeight: '900', color: '#fff', opacity: 0.9 },

  topBar:       { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  iconBtn:      { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  iconBtnText:  { color: '#fff', fontSize: 18, fontWeight: '700' },
  scanTypeBadge:{ backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  scanTypeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  instructions:    { position: 'absolute', bottom: 160, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  instructionText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  dotsRow: { position: 'absolute', bottom: 140, alignSelf: 'center', flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot:     { height: 8, borderRadius: 4 },

  bottomBar:   { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.75)', paddingVertical: 20, paddingBottom: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 40 },
  sideBtn:     { alignItems: 'center', gap: 4 },
  sideBtnLabel:{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  shutterOuter:{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  shutterInner:{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
