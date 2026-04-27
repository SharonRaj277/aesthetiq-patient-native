import React, { useCallback, useState } from 'react';
import {
  View, Pressable, StyleSheet, Dimensions, Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useAnimatedReaction,
  useDerivedValue,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Extrapolation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTabScroll } from '../contexts/TabScrollContext';

// ─── Constants ────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const BAR_H          = 68;
const BAR_SIDE_PAD   = 20;
const BAR_W          = SCREEN_W - BAR_SIDE_PAD * 2;
const TAB_W          = BAR_W / 5;
const INDICATOR_H    = 40;
const INDICATOR_MIN_W = 54;

// Tab order must match _layout.tsx tab order
const TABS = [
  { key: 'index',   icon: 'home-outline'       as const, activeIcon: 'home'       as const, label: 'Home'    },
  { key: 'reports', icon: 'bar-chart-outline'  as const, activeIcon: 'bar-chart'  as const, label: 'Reports' },
  { key: 'scan',    icon: 'scan-outline'        as const, activeIcon: 'scan'       as const, label: 'Scan',   isCenter: true },
  { key: 'care',    icon: 'heart-outline'       as const, activeIcon: 'heart'      as const, label: 'Care'    },
  { key: 'profile', icon: 'person-outline'      as const, activeIcon: 'person'     as const, label: 'Profile' },
];

// ─── Helpers ──────────────────────────────────────────────────────
function getIndicatorLeft(index: number): number {
  'worklet';
  return index * TAB_W + (TAB_W - INDICATOR_MIN_W) / 2;
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// ─── Component ────────────────────────────────────────────────────
export default function AnimatedTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { scrollY } = useTabScroll();

  // ── Blur intensity state (driven by scroll via animated reaction)
  const [blurIntensity, setBlurIntensity] = useState(40);

  useAnimatedReaction(
    () => interpolate(scrollY.value, [0, 120], [40, 80], Extrapolation.CLAMP),
    (value) => {
      runOnJS(setBlurIntensity)(Math.round(value));
    },
  );

  // ── Active tab tracking
  const activeTabSV = useSharedValue(state.index);

  // Keep synced when React Navigation changes (e.g. back gesture)
  React.useEffect(() => {
    activeTabSV.value = state.index;
    animateToTab(state.index);
  }, [state.index]);

  // ── Liquid morph: two independent edges
  const trailingX = useSharedValue(getIndicatorLeft(state.index));
  const leadingX  = useSharedValue(getIndicatorLeft(state.index) + INDICATOR_MIN_W);


  // ── Floating bar Y (rises slightly on scroll)
  const barFloatY = useSharedValue(0);

  useAnimatedReaction(
    () => interpolate(scrollY.value, [0, 80], [0, -5], Extrapolation.CLAMP),
    (value) => {
      barFloatY.value = withSpring(value, { damping: 20, stiffness: 150 });
    },
  );

  // ── Per-icon scales (5 tabs, no hooks in loop)
  const sc0 = useSharedValue(1);
  const sc1 = useSharedValue(1);
  const sc2 = useSharedValue(1);
  const sc3 = useSharedValue(1);
  const sc4 = useSharedValue(1);
  const iconScales = [sc0, sc1, sc2, sc3, sc4];

  // ── Ripple scale for center tab
  const scanRipple = useSharedValue(0);

  // ─────────────────────────────────────────────────────────────────
  function animateToTab(index: number) {
    'worklet';
    const targetLeft  = getIndicatorLeft(index);
    const targetRight = targetLeft + INDICATOR_MIN_W;

    // Normal solid slide without bounciness
    const timingConfig = {
      duration: 250,
    };

    leadingX.value = withTiming(targetRight, timingConfig);
    trailingX.value = withTiming(targetLeft, timingConfig);
  }

  // ─────────────────────────────────────────────────────────────────
  const handlePressIn = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Scale up icon
    iconScales[index].value = withSpring(index === 2 ? 1.18 : 1.12, { damping: 10, stiffness: 200 });

    // Center tab ripple
    if (index === 2) {
      scanRipple.value = withTiming(1, { duration: 300 });
    }
  }, []);

  const handlePressOut = useCallback((index: number) => {
    iconScales[index].value = withSpring(1, { damping: 12, stiffness: 180 });

    if (index === 2) {
      scanRipple.value = withTiming(0, { duration: 250 });
    }
  }, []);

  const handlePress = useCallback((index: number) => {
    const route = state.routes[index];
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) {
      navigation.navigate(route.name);
    }
    activeTabSV.value = index;
    animateToTab(index);
  }, [state, navigation]);

  // ── Animated styles ──────────────────────────────────────────────

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: barFloatY.value }],
  }));

  const indicatorStyle = useAnimatedStyle(() => {
    const isScanActive = activeTabSV.value === 2;
    const left   = trailingX.value;
    const right  = leadingX.value;
    const w      = Math.max(right - left, INDICATOR_MIN_W);
    return {
      left,
      width: w,
      opacity: withTiming(isScanActive ? 0 : 1, { duration: 180 }),
    };
  });

  // Background subtle parallax counter-motion
  const bgParallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(leadingX.value * 0.018) }],
  }));

  // Scan ripple
  const scanRippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scanRipple.value, [0, 1], [0.5, 2.2]) }],
    opacity: interpolate(scanRipple.value, [0, 0.4, 1], [0, 0.3, 0]),
  }));

  // Bottom inset
  const bottomInset = Math.max(insets?.bottom ?? 0, 4);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomInset + 12 }]}
    >
      <Animated.View style={[styles.bar, barStyle]}>

        {/* Glass blur background */}
        <Animated.View style={[StyleSheet.absoluteFill, bgParallaxStyle, { borderRadius: 30, overflow: 'hidden' }]}>
          <BlurView
            intensity={blurIntensity}
            tint={Platform.OS === 'ios' ? 'systemChromeMaterialLight' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          {/* Frosted glass overlay */}
          <View style={styles.glassOverlay} />
        </Animated.View>

        {/* Border ring */}
        <View style={styles.borderRing} pointerEvents="none" />

        {/* Liquid morph indicator */}
        <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none">
          <LinearGradient
            colors={['#6C63FF', '#8E7CFF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          />
          {/* Inner glow */}
          <View style={styles.indicatorGlow} />
        </Animated.View>

        {/* Tab buttons */}
        {TABS.map((tab, index) => {
          const isActive   = state.index === index;
          const isCenter   = tab.isCenter;
          const showActive = isActive && !isCenter;

          return (
            <TabButton
              key={tab.key}
              tab={tab}
              index={index}
              isActive={isActive}
              isCenter={isCenter}
              showActive={showActive}
              iconScale={iconScales[index]}
              scanRippleStyle={isCenter ? scanRippleStyle : null}
              onPressIn={() => handlePressIn(index)}
              onPressOut={() => handlePressOut(index)}
              onPress={() => handlePress(index)}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────
function TabButton({
  tab, index, isActive, isCenter, showActive, iconScale,
  scanRippleStyle, onPressIn, onPressOut, onPress,
}: any) {
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const iconColor = showActive ? '#fff' : isActive && isCenter ? '#7C3AED' : '#8A8A8A';
  const iconName  = showActive ? tab.activeIcon : tab.icon;
  const iconSize  = isCenter ? 26 : 22;

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      style={styles.tabBtn}
      android_ripple={null}
    >
      {/* Scan ripple circle */}
      {isCenter && scanRippleStyle && (
        <Animated.View style={[styles.rippleCircle, scanRippleStyle]} />
      )}
      <Animated.View style={[styles.tabIconWrap, iconStyle]}>
        <Ionicons name={iconName} size={iconSize} color={iconColor} />
      </Animated.View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: BAR_SIDE_PAD,
    right: BAR_SIDE_PAD,
    height: BAR_H,
    zIndex: 999,
  },

  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 20,
  },

  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(250,249,255,0.92)' : 'rgba(255,255,255,0.35)',
  },

  borderRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    zIndex: 10,
  },

  indicator: {
    position: 'absolute',
    top: (BAR_H - INDICATOR_H) / 2,
    height: INDICATOR_H,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 2,
    // Glow
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },

  indicatorGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
  },

  tabBtn: {
    width: TAB_W,
    height: BAR_H,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },

  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },

  rippleCircle: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C3AED',
  },
});
