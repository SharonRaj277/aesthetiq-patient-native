import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, Dimensions, Image, Text,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import DNALoader from '../components/DNALoader';
import { useUser } from '../contexts/UserContext';
import { DEV_MODE } from '../config/devMode';

const { width, height } = Dimensions.get('window');

// ─── Loading messages ──────────────────────────────────────────────
const MESSAGES = [
  'Initialising AI Models…',
  'Loading Skin Algorithms…',
  'Calibrating Dental Scanner…',
  'Preparing Your Dashboard…',
  'Almost Ready…',
];

// ─── Blob config ───────────────────────────────────────────────────
const BLOBS = [
  { color: '#C4B5FD', size: width * 0.72, top: -height * 0.05, left: -width * 0.2,  dur: 9000  },
  { color: '#BAE6FD', size: width * 0.6,  top:  height * 0.45, left:  width * 0.55, dur: 11000 },
  { color: '#DDD6FE', size: width * 0.5,  top:  height * 0.2,  left: -width * 0.15, dur: 13000 },
];

// ─── Component ────────────────────────────────────────────────────
export default function AppSplashScreen() {
  const router           = useRouter();
  const { user, loading } = useUser();

  // ── Shared values
  const logoOpacity  = useSharedValue(0);
  const logoScale    = useSharedValue(0.9);
  const textOpacity  = useSharedValue(0);
  const textY        = useSharedValue(14);
  const glowPulse    = useSharedValue(0);
  const screenScale  = useSharedValue(1);
  const screenOpacity = useSharedValue(1);
  const dnaProgress  = useSharedValue(0);

  // Blob drift shared values (one per blob)
  const blobDrift0 = useSharedValue(0);
  const blobDrift1 = useSharedValue(0);
  const blobDrift2 = useSharedValue(0);
  const blobDrifts = [blobDrift0, blobDrift1, blobDrift2];

  // ── Message state
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgOpacity, setMsgOpacity] = useState(1);
  const msgTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dev mode → always go to dashboard; production → check auth state
  function navigateAfterSplash() {
    if (DEV_MODE || (!loading && user)) {
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  }

  useEffect(() => {
    SplashScreen.hideAsync();

    // ── Blob drift loops
    blobDrifts.forEach((sv, i) => {
      sv.value = withRepeat(
        withSequence(
          withTiming(1,  { duration: BLOBS[i].dur, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: BLOBS[i].dur, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    });

    // ── Glow pulse behind logo
    glowPulse.value = withDelay(
      200,
      withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );

    // ── Logo reveal: fade + spring scale
    logoOpacity.value = withDelay(150, withTiming(1, { duration: 700 }));
    logoScale.value   = withDelay(
      150,
      withSpring(1, { damping: 12, stiffness: 90 }),
    );

    // ── Text slides up after logo
    textOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    textY.value       = withDelay(500, withTiming(0, { duration: 500 }));

    // ── DNA progress fills over 2.6s (with slight delay)
    dnaProgress.value = withDelay(
      700,
      withTiming(1, { duration: 2600, easing: Easing.bezier(0.37, 0, 0.63, 1) }),
    );

    // ── Rotate messages every ~1100ms
    msgTimer.current = setInterval(() => {
      setMsgOpacity(0);
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
        setMsgOpacity(1);
      }, 220);
    }, 1100);

    // ── Exit transition at 3200ms
    const exitTimer = setTimeout(() => {
      if (msgTimer.current) clearInterval(msgTimer.current);

      // Glow intensifies
      glowPulse.value = withTiming(1, { duration: 250 });

      // Screen scales up slightly then fades out
      screenScale.value = withTiming(1.06, { duration: 500, easing: Easing.out(Easing.quad) });
      screenOpacity.value = withDelay(
        180,
        withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }, (finished) => {
          if (finished) runOnJS(navigateAfterSplash)();
        }),
      );
    }, 3200);

    return () => {
      clearInterval(msgTimer.current!);
      clearTimeout(exitTimer);
    };
  }, []);

  // ── Animated styles
  const screenStyle = useAnimatedStyle(() => ({
    transform: [{ scale: screenScale.value }],
    opacity:   screenOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity:   logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity:   textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0.18, 0.42]),
    transform: [
      { scale: interpolate(glowPulse.value, [0, 1], [0.92, 1.08]) },
    ],
  }));

  const blob0Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(blobDrift0.value, [-1, 1], [-18, 18]) },
      { translateY: interpolate(blobDrift0.value, [-1, 1], [-22, 22]) },
    ],
  }));
  const blob1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(blobDrift1.value, [-1, 1], [-18, 18]) },
      { translateY: interpolate(blobDrift1.value, [-1, 1], [-22, 22]) },
    ],
  }));
  const blob2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(blobDrift2.value, [-1, 1], [-18, 18]) },
      { translateY: interpolate(blobDrift2.value, [-1, 1], [-22, 22]) },
    ],
  }));
  const blobStyles = [blob0Style, blob1Style, blob2Style];

  return (
    <Animated.View style={[styles.root, screenStyle]}>

      {/* ── Background gradient base ── */}
      <View style={styles.bgBase} />

      {/* ── Floating blobs ── */}
      {BLOBS.map((blob, i) => (
        <Animated.View
          key={i}
          style={[
            styles.blob,
            {
              width:  blob.size,
              height: blob.size,
              borderRadius: blob.size / 2,
              backgroundColor: blob.color,
              top:  blob.top,
              left: blob.left,
            },
            blobStyles[i],
          ]}
        />
      ))}

      {/* ── Content ── */}
      <View style={styles.content}>

        {/* Glow ring behind logo */}
        <Animated.View style={[styles.glowRing, glowStyle]} />

        {/* Logo icon */}
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image
            source={require('../assets/images/aesthetiq_logo.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Text logo */}
        <Animated.View style={textStyle}>
          <Image
            source={require('../assets/images/text logo.png')}
            style={styles.textLogo}
            resizeMode="contain"
          />
        </Animated.View>

      </View>

      {/* ── DNA loader section ── */}
      <View style={styles.loaderSection}>
        <DNALoader progress={dnaProgress} />

        {/* Loading message */}
        <Text style={[styles.loadingMsg, { opacity: msgOpacity }]}>
          {MESSAGES[msgIndex]}
        </Text>
      </View>

    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EDEAF5',
    overflow: 'hidden',
  },

  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F3F1FA',
  },

  blob: {
    position: 'absolute',
    opacity: 0.1,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },

  glowRing: {
    position: 'absolute',
    width:  width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    backgroundColor: '#C4B5FD',
  },

  logoWrap: {
    width:  170,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#5B21B6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 12,
  },

  logoImg: {
    width:  160,
    height: 200,
  },

  textLogo: {
    width:  width - 80,
    height: 56,
  },

  loaderSection: {
    position: 'absolute',
    bottom: 64,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 12,
  },

  loadingMsg: {
    fontFamily: 'System',
    fontSize: 12,
    letterSpacing: 1.4,
    color: '#7C3AED',
    textTransform: 'uppercase',
    opacity: 0.75,
  },
});
