import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Alert, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { createEmergencyRequest, listenToEmergency } from '../../services/emergencyService';

const { width } = Dimensions.get('window');

export default function EmergencyCallScreen() {
  const router = useRouter();
  const { issueLabel, issueEmoji } = useLocalSearchParams<{
    issueLabel: string;
    issueEmoji: string;
  }>();

  const [status, setStatus]   = useState<'searching' | 'connected'>('searching');
  const [seconds, setSeconds] = useState(0);

  // Control states
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  const requestIdRef = useRef<string | null>(null);
  const unsubRef     = useRef<(() => void) | null>(null);

  const toggleMic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMicOn(!micOn);
  };
  const toggleCam = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!camOn) {
      if (!permission?.granted) {
        const { granted } = await requestPermission();
        if (!granted) {
          Alert.alert("Permission Required", "Camera access is needed to share your video.");
          return;
        }
      }
    }
    setCamOn(!camOn);
  };

  // Pulse rings
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  // Banner slide-in
  const bannerY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    // Staggered pulse loops
    const pulse = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(val, { toValue: 1, duration: 1400, useNativeDriver: true }),
          ]),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ).start();
    pulse(ring1, 0);
    pulse(ring2, 460);
    pulse(ring3, 920);

    // Count up
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);

    // Create real emergency request and listen for doctor assignment
    const label = Array.isArray(issueLabel) ? issueLabel[0] : issueLabel ?? 'General';
    requestIdRef.current = createEmergencyRequest({
      patientId:       'patient_self',
      issueType:       label,
      severity:        'high',
      languages:       ['English'],
      primaryLanguage: 'English',
      location:        'unknown',
    });

    unsubRef.current = listenToEmergency(requestIdRef.current, () => {
      setStatus('connected');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.spring(bannerY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    });

    return () => {
      clearInterval(timer);
      unsubRef.current?.();
    };
  }, []);

  const handleEnd = () => {
    Alert.alert(
      'End Consultation?',
      'Are you sure you want to end the call?',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'End Call', style: 'destructive',
          onPress: () => router.replace('/sos/emergency-confirmed'),
        },
      ],
    );
  };

  const ringScale  = (val: Animated.Value) =>
    val.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const ringOpacity = (val: Animated.Value) =>
    val.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.55, 0.3, 0] });

  const connectedSeconds = Math.max(0, seconds - 5);
  const durStr = `00:${String(connectedSeconds).padStart(2, '0')}`;

  return (
    <LinearGradient colors={['#0D0A1A', '#1A0F1F', '#2D0A0A']} style={styles.root}>
      <SafeAreaView style={styles.safe}>

        {/* Connected banner */}
        <Animated.View style={[styles.banner, { transform: [{ translateY: bannerY }] }]}>
          <Text style={styles.bannerText}>✓  Dr. Priya Sharma Connected</Text>
        </Animated.View>

        {status === 'searching' ? (
          /* ── SEARCHING ── */
          <View style={styles.center}>
            {/* Pulse rings */}
            <View style={styles.pulseWrap}>
              {[ring1, ring2, ring3].map((val, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.ring,
                    {
                      transform: [{ scale: ringScale(val) }],
                      opacity:   ringOpacity(val),
                    },
                  ]}
                />
              ))}
              <View style={styles.ringCenter}>
                <Text style={{ fontSize: 36 }}>{issueEmoji ?? '🆘'}</Text>
              </View>
            </View>

            <Text style={styles.searchTitle}>Finding best doctor...</Text>
            <Text style={styles.searchLabel}>{issueLabel}</Text>
            <Text style={styles.searchTimer}>Searching for {seconds}s</Text>

            <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          /* ── CONNECTED ── */
          <View style={styles.connectedWrap}>
            {/* PIP Camera */}
            {camOn && permission?.granted && (
              <View style={styles.pipWrap}>
                <CameraView style={StyleSheet.absoluteFillObject} facing="front" />
              </View>
            )}

            {/* Doctor card */}
            <View style={styles.doctorCard}>
              {/* Avatar */}
              <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.docAvatar}>
                <Text style={{ fontSize: 28 }}>👩‍⚕️</Text>
              </LinearGradient>
              <Text style={styles.docName}>Dr. Priya Sharma</Text>
              <Text style={styles.docSpec}>Dermatologist</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>

              {/* Duration */}
              <Text style={styles.duration}>{durStr}</Text>
            </View>

            {/* Issue label */}
            <Text style={styles.connectedIssue}>{issueEmoji}  {issueLabel}</Text>

            {/* Controls */}
            <View style={styles.controls}>
              {/* Mic Toggle */}
              <Pressable
                onPress={toggleMic}
                style={[styles.ctrlBtn, !micOn && { backgroundColor: 'rgba(255,255,255,0.9)' }]}
              >
                <Ionicons name={micOn ? "mic" : "mic-off"} size={26} color={micOn ? "#fff" : "#1A0F1F"} />
              </Pressable>

              {/* End Call */}
              <Pressable onPress={handleEnd} style={styles.endBtn}>
                <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </Pressable>

              {/* Video Toggle */}
              <Pressable
                onPress={toggleCam}
                style={[styles.ctrlBtn, !camOn && { backgroundColor: 'rgba(255,255,255,0.9)' }]}
              >
                <Ionicons name={camOn ? "videocam" : "videocam-off"} size={26} color={camOn ? "#fff" : "#1A0F1F"} />
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const RING_SIZE = 120;

const styles = StyleSheet.create({
  root:   { flex: 1 },
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  // Banner
  banner: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: '#22C55E', paddingVertical: 16, zIndex: 10,
    alignItems: 'center',
  },
  bannerText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Pulse
  pulseWrap: {
    width: RING_SIZE, height: RING_SIZE,
    alignItems: 'center', justifyContent: 'center', marginBottom: 36,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
    backgroundColor: '#EF4444',
  },
  ringCenter: {
    width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
    backgroundColor: 'rgba(239,68,68,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  searchTitle: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center' },
  searchLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 8 },
  searchTimer: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 },
  cancelBtn:   {
    marginTop: 48, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14, paddingHorizontal: 32, paddingVertical: 12,
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },

  // Connected
  connectedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  pipWrap: {
    position: 'absolute', top: 80, right: 20, width: 100, height: 140,
    backgroundColor: '#000', borderRadius: 16, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
    zIndex: 20,
  },
  doctorCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24, margin: 20, padding: 24,
    width: width - 48, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  docAvatar:   { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: '#22C55E' },
  docName:     { fontSize: 18, fontWeight: '900', color: '#fff' },
  docSpec:     { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  liveBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(34,197,94,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginTop: 10 },
  liveDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  liveText:    { fontSize: 12, fontWeight: '800', color: '#22C55E' },
  duration:    { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 16, letterSpacing: 2 },
  connectedIssue: { fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 4 },

  // Controls
  controls: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 32 },
  ctrlBtn:  { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  endBtn:   { width: 68, height: 68, borderRadius: 34, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10 },
});
