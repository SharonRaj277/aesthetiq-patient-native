import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, Dimensions,
  Platform,
} from 'react-native';
import ReAnimated, {
  useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, useAnimatedProps,
  withTiming, withSpring, withRepeat, withSequence, withDelay,
  interpolate, Extrapolation, useDerivedValue, runOnJS,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  Svg, Circle, Defs, LinearGradient as SvgLinearGradient, Stop,
  RadialGradient, Path, Ellipse,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { useUser } from '../../contexts/UserContext';
import { useTabScroll } from '../../contexts/TabScrollContext';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeColors } from '../../constants/themeColors';

const { width: SCREEN_W } = Dimensions.get('window');

// ═════════════════════════════════════════════════════════════════════════════
// FONTS (theme-independent)
// ═════════════════════════════════════════════════════════════════════════════

const FONT_SERIF   = Platform.select({ ios: 'CormorantGaramond_600SemiBold', android: 'CormorantGaramond_600SemiBold', default: 'serif' })!;
const FONT_SANS    = Platform.select({ ios: 'DMSans_400Regular', android: 'DMSans_400Regular', default: 'System' })!;
const FONT_SANS_M  = Platform.select({ ios: 'DMSans_500Medium', android: 'DMSans_500Medium', default: 'System' })!;
const FONT_SANS_B  = Platform.select({ ios: 'DMSans_600SemiBold', android: 'DMSans_600SemiBold', default: 'System' })!;
const FONT_MONO    = Platform.select({ ios: 'DMMono_500Medium', android: 'DMMono_500Medium', default: 'monospace' })!;

// ═════════════════════════════════════════════════════════════════════════════
// THEMED TOKENS + STYLES (derived from useThemeColors)
// ═════════════════════════════════════════════════════════════════════════════

function makeT(c: ThemeColors, isDark: boolean) {
  return {
    bg:           c.background,
    bgGradTop:    c.bgGradTop,
    bgGradBot:    c.bgGradBot,
    cardBg:       c.surface,
    cardBgStrong: c.surfaceElevated,
    cardBorder:   c.border,
    textHi:       c.textPrimary,
    textMid:      c.textSecondary,
    textLo:       c.textMuted,
    textSubtle:   c.textSubtle,

    // Score gradient endpoints
    skinA:        c.skinGradient[0],
    skinB:        c.skinGradient[1],
    skinGlow:     c.skinGlow,
    dentalA:      c.dentalGradient[0],
    dentalB:      c.dentalGradient[1],
    dentalGlow:   c.dentalGlow,
    faceA:        c.faceGradient[0],
    faceB:        c.faceGradient[1],
    faceGlow:     c.faceGlow,

    // Brand / CTA
    rose:         c.ctaGradient[0],
    roseB:        c.ctaGradient[1],
    brandPurple:  c.brandPurple,
    brandPurpleB: c.brandPurpleAccent,
    success:      c.success,
    fire:         c.fire,

    // Effects
    ringTrack:    c.ringTrack,
    glowOpacity:  c.glowOpacity,
    cardShadow:   c.cardShadow,
    trendBg:      c.trendBg,
    trendBorder:  c.trendBorder,
    featuredOverlay: c.featuredOverlay,

    isDark,
  };
}

type Tokens = ReturnType<typeof makeT>;

function useDashTheme() {
  const { isDark } = useTheme();
  const colors = useThemeColors();
  const T = useMemo(() => makeT(colors, isDark), [colors, isDark]);
  const styles = useMemo(() => makeStyles(T), [T]);
  return { T, styles, isDark, colors };
}

// ═════════════════════════════════════════════════════════════════════════════
// 3D-STYLE TREATMENT ICONS (theme-independent — gradient stops are vivid)
// ═════════════════════════════════════════════════════════════════════════════

function HydraGlowIcon({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgLinearGradient id="hg-body" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F0ABFC" />
          <Stop offset="0.45" stopColor="#C084FC" />
          <Stop offset="1" stopColor="#7C3AED" />
        </SvgLinearGradient>
        <SvgLinearGradient id="hg-tip" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FCE7F3" />
          <Stop offset="1" stopColor="#9F1239" />
        </SvgLinearGradient>
        <RadialGradient id="hg-hi" cx="0.3" cy="0.3" r="0.5">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.65" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="32" cy="58" rx="14" ry="3" fill="rgba(0,0,0,0.35)" />
      <Path d="M22 18 L42 18 L40 50 Q40 56 32 56 Q24 56 24 50 Z" fill="url(#hg-body)" />
      <Path d="M26 8 L38 8 L40 18 L24 18 Z" fill="url(#hg-tip)" />
      <Path d="M28 4 L36 4 L38 8 L26 8 Z" fill="#FBCFE8" />
      <Path d="M26 22 L31 22 L29 48 Q29 50 27 50 Z" fill="url(#hg-hi)" />
      <Circle cx="32" cy="34" r="2" fill="#FFFFFF" opacity="0.6" />
    </Svg>
  );
}

function DeepHydrationIcon({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgLinearGradient id="dh-glass" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#BFDBFE" stopOpacity="0.95" />
          <Stop offset="1" stopColor="#1D4ED8" stopOpacity="0.95" />
        </SvgLinearGradient>
        <SvgLinearGradient id="dh-liq" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#60A5FA" />
          <Stop offset="1" stopColor="#1E40AF" />
        </SvgLinearGradient>
        <RadialGradient id="dh-hi" cx="0.25" cy="0.25" r="0.4">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="32" cy="58" rx="13" ry="3" fill="rgba(0,0,0,0.3)" />
      <Path d="M24 6 L40 6 L40 14 L24 14 Z" fill="#475569" />
      <Path d="M22 14 L42 14 L42 50 Q42 56 36 56 L28 56 Q22 56 22 50 Z" fill="url(#dh-glass)" />
      <Path d="M24 22 L40 22 L40 50 Q40 54 36 54 L28 54 Q24 54 24 50 Z" fill="url(#dh-liq)" opacity="0.85" />
      <Path d="M26 18 L30 18 L29 50 Q29 52 27 52 Z" fill="url(#dh-hi)" />
      <Path d="M30 0 L34 0 L34 6 L30 6 Z" fill="#1E293B" />
      <Circle cx="36" cy="40" r="2" fill="#FFFFFF" opacity="0.7" />
    </Svg>
  );
}

function LedLightIcon({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgLinearGradient id="led-mask" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E9D5FF" />
          <Stop offset="0.5" stopColor="#A78BFA" />
          <Stop offset="1" stopColor="#6D28D9" />
        </SvgLinearGradient>
        <RadialGradient id="led-glow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#F472B6" stopOpacity="0.7" />
          <Stop offset="1" stopColor="#F472B6" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="32" cy="58" rx="14" ry="3" fill="rgba(0,0,0,0.3)" />
      <Path d="M16 22 Q16 8 32 8 Q48 8 48 22 L48 42 Q48 56 32 56 Q16 56 16 42 Z" fill="url(#led-mask)" />
      <Ellipse cx="32" cy="32" rx="12" ry="14" fill="url(#led-glow)" />
      <Ellipse cx="24" cy="28" rx="2.4" ry="1.4" fill="#1F0A3A" />
      <Ellipse cx="40" cy="28" rx="2.4" ry="1.4" fill="#1F0A3A" />
      <Path d="M28 42 Q32 46 36 42" stroke="#1F0A3A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Circle cx="20" cy="20" r="1.2" fill="#FCE7F3" opacity="0.85" />
      <Circle cx="44" cy="20" r="1.2" fill="#FCE7F3" opacity="0.85" />
      <Circle cx="22" cy="44" r="1.2" fill="#FCE7F3" opacity="0.65" />
      <Circle cx="42" cy="44" r="1.2" fill="#FCE7F3" opacity="0.65" />
    </Svg>
  );
}

function VitaminCIcon({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgLinearGradient id="vc-body" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FBCFE8" />
          <Stop offset="0.5" stopColor="#F472B6" />
          <Stop offset="1" stopColor="#BE185D" />
        </SvgLinearGradient>
        <SvgLinearGradient id="vc-cap" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FED7AA" />
          <Stop offset="1" stopColor="#C2410C" />
        </SvgLinearGradient>
        <RadialGradient id="vc-hi" cx="0.3" cy="0.3" r="0.4">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.7" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="32" cy="58" rx="13" ry="3" fill="rgba(0,0,0,0.3)" />
      <Path d="M22 18 L42 18 L42 52 Q42 56 38 56 L26 56 Q22 56 22 52 Z" fill="url(#vc-body)" />
      <Path d="M24 8 L40 8 L42 18 L22 18 Z" fill="url(#vc-cap)" />
      <Path d="M28 2 L36 2 L38 8 L26 8 Z" fill="#9A3412" />
      <Path d="M26 22 L30 22 L29 50 Q29 52 27 52 Z" fill="url(#vc-hi)" />
      <Circle cx="36" cy="38" r="2" fill="#FFFFFF" opacity="0.6" />
      <Path d="M44 28 L48 24 M44 28 L48 32 M48 24 L48 32" stroke="#FB923C" strokeWidth="1.2" opacity="0.6" />
    </Svg>
  );
}

function CollagenIcon({ size = 64 }: { size?: number }) {
  const c = (cx: number, cy: number, r: number, opacity = 1) => (
    <>
      <Circle cx={cx} cy={cy} r={r} fill="url(#col-sphere)" opacity={opacity} />
      <Circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.35} fill="#FFFFFF" opacity={0.4 * opacity} />
    </>
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <RadialGradient id="col-sphere" cx="0.35" cy="0.35" r="0.7">
          <Stop offset="0" stopColor="#DBEAFE" />
          <Stop offset="0.5" stopColor="#60A5FA" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="32" cy="58" rx="14" ry="3" fill="rgba(0,0,0,0.3)" />
      <Path d="M32 32 L14 16 M32 32 L50 16 M32 32 L14 48 M32 32 L50 48" stroke="#3B82F6" strokeWidth="1.6" opacity="0.55" />
      {c(14, 16, 7, 0.95)}
      {c(50, 16, 7, 0.95)}
      {c(14, 48, 7, 0.95)}
      {c(50, 48, 7, 0.95)}
      {c(32, 32, 11)}
    </Svg>
  );
}

const TREATMENT_ICON: Record<string, (s?: number) => React.ReactElement> = {
  hydraglow: (s = 64) => <HydraGlowIcon size={s} />,
  hydration: (s = 64) => <DeepHydrationIcon size={s} />,
  led:       (s = 64) => <LedLightIcon size={s} />,
  vitamin:   (s = 64) => <VitaminCIcon size={s} />,
  collagen:  (s = 64) => <CollagenIcon size={s} />,
};

// ═════════════════════════════════════════════════════════════════════════════
// SCORE RING — animated arc + count-up
// ═════════════════════════════════════════════════════════════════════════════

const AnimatedCircle = ReAnimated.createAnimatedComponent(Circle);

type ScoreType = 'skin' | 'dental' | 'face';

function getScoreColors(T: Tokens, type: ScoreType): { a: string; b: string; glow: string; iconName: keyof typeof Ionicons.glyphMap } {
  if (type === 'skin')   return { a: T.skinA,   b: T.skinB,   glow: T.skinGlow,   iconName: 'sparkles-outline' };
  if (type === 'dental') return { a: T.dentalA, b: T.dentalB, glow: T.dentalGlow, iconName: 'medkit-outline'   };
  return                          { a: T.faceA,   b: T.faceB,   glow: T.faceGlow,   iconName: 'happy-outline'    };
}

function ScoreCard({
  score, trend, type, title, delay, onPress,
}: {
  score: number;
  trend: number;
  type: ScoreType;
  title: string;
  delay: number;
  onPress: () => void;
}) {
  const { T, styles } = useDashTheme();
  const c = getScoreColors(T, type);
  const RAD = 46;
  const STROKE = 6;
  const CIRC = 2 * Math.PI * RAD;

  const progress = useSharedValue(0);
  const cardEntry = useSharedValue(0);
  const trendEntry = useSharedValue(0);
  const press = useSharedValue(1);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    cardEntry.value = withDelay(delay, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }));
    progress.value  = withDelay(delay + 150, withSpring(1, { damping: 14, stiffness: 80, mass: 0.9 }));
    trendEntry.value = withDelay(delay + 1100, withSpring(1, { damping: 12, stiffness: 110 }));
  }, [delay]);

  useDerivedValue(() => {
    const v = Math.round(progress.value * score);
    runOnJS(setDisplayed)(v);
  }, [score]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardEntry.value,
    transform: [
      { translateY: interpolate(cardEntry.value, [0, 1], [16, 0], Extrapolation.CLAMP) },
      { scale: press.value },
    ],
  }));

  const trendStyle = useAnimatedStyle(() => ({
    opacity: trendEntry.value,
    transform: [{ translateX: interpolate(trendEntry.value, [0, 1], [12, 0], Extrapolation.CLAMP) }],
  }));

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC - progress.value * CIRC * (score / 100),
  }));

  return (
    <ReAnimated.View style={[styles.scoreCard, cardStyle]}>
      <Pressable
        onPressIn={() => { press.value = withTiming(0.97, { duration: 90 }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        onPressOut={() => { press.value = withSpring(1, { damping: 14 }); }}
        onPress={onPress}
        style={styles.scoreCardInner}
      >
        <ReAnimated.View style={[styles.trendPill, trendStyle]}>
          <Ionicons name="arrow-up" size={10} color={T.success} />
          <Text style={styles.trendPillText}>{trend} pts</Text>
        </ReAnimated.View>

        <View style={styles.ringWrap}>
          <View style={[styles.ringGlow, { shadowColor: c.b, shadowOpacity: T.glowOpacity }]} pointerEvents="none" />
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Defs>
              <SvgLinearGradient id={`g-${type}`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={c.a} />
                <Stop offset="1" stopColor={c.b} />
              </SvgLinearGradient>
            </Defs>
            <Circle cx="60" cy="60" r={RAD} stroke={T.ringTrack} strokeWidth={STROKE} fill="none" />
            <AnimatedCircle
              cx="60"
              cy="60"
              r={RAD}
              stroke={`url(#g-${type})`}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              animatedProps={arcProps}
              transform="rotate(-90 60 60)"
            />
          </Svg>
          <View style={styles.ringCenter} pointerEvents="none">
            <Ionicons name={c.iconName} size={18} color={c.b} style={{ opacity: 0.85, marginBottom: 2 }} />
            <Text style={styles.scoreNum}>{displayed}</Text>
            <Text style={styles.scoreSlash}>/100</Text>
          </View>
        </View>

        <Text style={styles.scoreTitle}>{title}</Text>

        <View style={styles.verifRow}>
          <View style={styles.verifItem}>
            <Ionicons name="shield-checkmark" size={10} color={T.brandPurple} />
            <Text style={styles.verifText}>AI Verified</Text>
          </View>
          <View style={styles.verifDot} />
          <View style={styles.verifItem}>
            <Ionicons name="checkmark-circle" size={10} color={T.success} />
            <Text style={styles.verifText}>Doctor Reviewed</Text>
          </View>
        </View>

        <View style={styles.insightsBtn}>
          <LinearGradient
            colors={[`${c.a}22`, `${c.b}33`]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.insightsText}>View deep insights</Text>
          <Ionicons name="arrow-forward" size={12} color={T.textHi} />
        </View>
      </Pressable>
    </ReAnimated.View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// QUICK TREATMENT CARD
// ═════════════════════════════════════════════════════════════════════════════

type QuickTreatment = {
  id: string;
  name: string;
  blurb: string;
  iconKey: keyof typeof TREATMENT_ICON;
  suit: number;
  topMatch?: boolean;
  tint: string;
  tintB: string;
};

const QUICK_TREATMENTS: Record<'skin' | 'dental' | 'face', QuickTreatment[]> = {
  skin: [
    { id: 't1', name: 'HydraGlow Facial',     blurb: 'Deep hydration & radiance boost',  iconKey: 'hydraglow', suit: 92, topMatch: true,  tint: '#F0ABFC', tintB: '#7C3AED' },
    { id: 't2', name: 'Deep Hydration Boost', blurb: 'Intense moisture restoration',     iconKey: 'hydration', suit: 89,                  tint: '#7DD3FC', tintB: '#1D4ED8' },
    { id: 't3', name: 'LED Light Therapy',    blurb: 'Reduce acne & inflammation',       iconKey: 'led',       suit: 87,                  tint: '#C4B5FD', tintB: '#6D28D9' },
    { id: 't4', name: 'Vitamin C Brightening',blurb: 'Even tone & anti-oxidant care',    iconKey: 'vitamin',   suit: 86,                  tint: '#FBCFE8', tintB: '#BE185D' },
    { id: 't5', name: 'Collagen Booster',     blurb: 'Firmness & elasticity improvement',iconKey: 'collagen',  suit: 85,                  tint: '#BFDBFE', tintB: '#1E40AF' },
  ],
  dental: [
    { id: 'd1', name: 'Smile Whitening', blurb: 'Professional brightening session', iconKey: 'led',       suit: 91, topMatch: true, tint: '#7DD3FC', tintB: '#0EA5E9' },
    { id: 'd2', name: 'Deep Scaling',    blurb: 'Remove plaque, refresh gums',      iconKey: 'hydration', suit: 88,                 tint: '#BFDBFE', tintB: '#1D4ED8' },
    { id: 'd3', name: 'Smile Design',    blurb: 'Aesthetic alignment plan',          iconKey: 'collagen',  suit: 84,                 tint: '#C4B5FD', tintB: '#7C3AED' },
  ],
  face: [
    { id: 'f1', name: 'Jawline Sculpt',   blurb: 'Definition and contour refinement', iconKey: 'collagen',  suit: 90, topMatch: true, tint: '#C4B5FD', tintB: '#8B5CF6' },
    { id: 'f2', name: 'Facial Balancing', blurb: 'Symmetry and harmony enhancement',  iconKey: 'hydraglow', suit: 88,                 tint: '#F0ABFC', tintB: '#7C3AED' },
    { id: 'f3', name: 'Lift & Tighten',   blurb: 'Youthful firmness, lifted contour',  iconKey: 'vitamin',   suit: 85,                 tint: '#FBCFE8', tintB: '#BE185D' },
  ],
};

function QuickTreatmentCard({ t, delay }: { t: QuickTreatment; delay: number }) {
  const { styles } = useDashTheme();
  const entry = useSharedValue(0);
  const press = useSharedValue(1);

  useEffect(() => {
    entry.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, [delay]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [
      { translateY: interpolate(entry.value, [0, 1], [12, 0], Extrapolation.CLAMP) },
      { scale: press.value },
    ],
  }));

  return (
    <ReAnimated.View style={[styles.qtCard, aStyle]}>
      <Pressable
        onPressIn={() => { press.value = withTiming(0.97, { duration: 90 }); Haptics.selectionAsync(); }}
        onPressOut={() => { press.value = withSpring(1, { damping: 14 }); }}
        style={styles.qtCardInner}
      >
        {t.topMatch && (
          <View style={styles.topMatchPill}>
            <Text style={styles.topMatchText}>Top Match</Text>
          </View>
        )}
        <View style={styles.qtIconWrap}>{TREATMENT_ICON[t.iconKey](64)}</View>
        <Text style={styles.qtName} numberOfLines={2}>{t.name}</Text>
        <Text style={styles.qtBlurb} numberOfLines={2}>{t.blurb}</Text>
        <View style={styles.suitPillWrap}>
          <LinearGradient
            colors={[`${t.tint}40`, `${t.tintB}55`]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 999 }]}
          />
          <Text style={[styles.suitPillText, { color: t.tintB }]}>{t.suit}% Suitability</Text>
        </View>
      </Pressable>
    </ReAnimated.View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// FEATURED HERO
// ═════════════════════════════════════════════════════════════════════════════

const FEATURED_HERO_URI = 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800';

function FeaturedTreatmentCard({ onCta }: { onCta: () => void }) {
  const { T, styles } = useDashTheme();
  const ctaPulse = useSharedValue(0);
  const ringPulse = useSharedValue(0);
  const press = useSharedValue(1);

  useEffect(() => {
    ctaPulse.value  = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
    ringPulse.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, []);

  const ctaStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(ctaPulse.value, [0, 1], [0.35, 0.7]),
    shadowRadius:  interpolate(ctaPulse.value, [0, 1], [10, 22]),
    transform: [{ scale: press.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ringPulse.value, [0, 1], [1, 1.08]) }],
    opacity:   interpolate(ringPulse.value, [0, 1], [0.7, 0.25]),
  }));

  return (
    <View style={styles.featuredCard}>
      <Image source={{ uri: FEATURED_HERO_URI }} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={[T.featuredOverlay[0], T.featuredOverlay[1], T.featuredOverlay[2]]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.featuredContent}>
        <View style={styles.aiPill}>
          <Ionicons name="sparkles" size={10} color="#FFFFFF" />
          <Text style={styles.aiPillText}>AI RECOMMENDED FOR YOU</Text>
        </View>

        <Text style={styles.featuredTitle}>HydraGlow 360{'\n'}Signature Facial</Text>

        <View style={styles.tagRow}>
          {['Dehydration', 'Dullness', 'Uneven Tone', 'Texture'].map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.featuredDesc} numberOfLines={2}>
          A personalized treatment that deeply hydrates, restores your natural glow and strengthens your skin barrier.
        </Text>

        <View style={styles.benefitRow}>
          <BenefitItem icon="water" label="Intense Hydration" />
          <BenefitItem icon="sparkles" label="Instant Glow" />
          <BenefitItem icon="shield-checkmark" label="Strengthen Barrier" />
        </View>

        <View style={styles.featuredFooter}>
          <ReAnimated.View style={[styles.ctaShadow, ctaStyle]}>
            <Pressable
              onPressIn={() => { press.value = withTiming(0.97, { duration: 90 }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              onPressOut={() => { press.value = withSpring(1, { damping: 14 }); }}
              onPress={onCta}
              style={styles.ctaPressable}
            >
              <LinearGradient
                colors={[T.rose, T.brandPurpleB]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 999 }]}
              />
              <Text style={styles.ctaText}>Begin Consultation</Text>
              <View style={styles.ctaArrow}>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </View>
            </Pressable>
          </ReAnimated.View>
          <Pressable hitSlop={10}>
            <Text style={styles.learnMore}>Learn More ›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.suitBadgeWrap}>
        <ReAnimated.View style={[styles.suitBadgeGlow, ringStyle]} pointerEvents="none" />
        <Svg width={68} height={68} viewBox="0 0 68 68">
          <Defs>
            <SvgLinearGradient id="suit-g" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={T.skinA} />
              <Stop offset="1" stopColor={T.rose} />
            </SvgLinearGradient>
          </Defs>
          <Circle cx="34" cy="34" r="28" stroke="rgba(255,255,255,0.15)" strokeWidth="4" fill="rgba(0,0,0,0.35)" />
          <Circle
            cx="34" cy="34" r="28"
            stroke="url(#suit-g)" strokeWidth="4" fill="none"
            strokeDasharray={`${2 * Math.PI * 28 * 0.94} ${2 * Math.PI * 28}`}
            strokeLinecap="round"
            transform="rotate(-90 34 34)"
          />
        </Svg>
        <View style={styles.suitBadgeText} pointerEvents="none">
          <Text style={styles.suitBadgePct}>94<Text style={styles.suitBadgeUnit}>%</Text></Text>
          <Text style={styles.suitBadgeLbl}>Suitability</Text>
        </View>
      </View>
    </View>
  );
}

function BenefitItem({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { styles } = useDashTheme();
  return (
    <View style={styles.benefitItem}>
      <Ionicons name={icon} size={12} color="rgba(255,255,255,0.85)" />
      <Text style={styles.benefitText}>{label}</Text>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STREAK CARD
// ═════════════════════════════════════════════════════════════════════════════

const STREAK_BG_URI = 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=800';

function StreakCard({ days }: { days: number }) {
  const { styles } = useDashTheme();
  const shake = useSharedValue(0);
  useEffect(() => {
    shake.value = withDelay(400, withSequence(
      withTiming(1,  { duration: 80 }),
      withTiming(-1, { duration: 80 }),
      withTiming(1,  { duration: 80 }),
      withTiming(0,  { duration: 80 }),
    ));
  }, []);
  const numStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shake.value, [-1, 0, 1], [-2, 0, 2]) }],
  }));
  return (
    <View style={styles.streakCard}>
      <Image source={{ uri: STREAK_BG_URI }} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['rgba(10,6,23,0.85)', 'rgba(31,16,52,0.55)', 'rgba(10,6,23,0.85)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.streakLeft}>
        <Text style={styles.streakHeadline}>
          Consistency creates{'\n'}extraordinary results <Text>💜</Text>
        </Text>
        <Text style={styles.streakSub}>Small steps today, unstoppable transformation tomorrow.</Text>
      </View>
      <View style={styles.streakRight}>
        <View style={styles.streakNumRow}>
          <ReAnimated.Text style={[styles.streakNum, numStyle]}>{days}</ReAnimated.Text>
          <Text style={styles.streakFire}>🔥</Text>
        </View>
        <Text style={styles.streakDayLabel}>Day Streak</Text>
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// HEADER
// ═════════════════════════════════════════════════════════════════════════════

function StickyHeader({ avatar, scrollY }: { avatar?: string; scrollY: SharedValue<number> }) {
  const { T, styles, isDark } = useDashTheme();
  const router = useRouter();
  const glassStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 60], [0, 1], Extrapolation.CLAMP),
  }));
  const glassBg = isDark ? 'rgba(10,6,23,0.55)' : 'rgba(255,255,255,0.55)';
  return (
    <View style={styles.headerWrap}>
      <ReAnimated.View style={[StyleSheet.absoluteFillObject, glassStyle]}>
        <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: glassBg }]} />
        <View style={styles.headerHairline} />
      </ReAnimated.View>
      <View style={styles.headerInner}>
        <View style={styles.brandRow}>
          <LinearGradient
            colors={[T.brandPurple, T.rose]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.brandLogo}
          >
            <Text style={styles.brandLogoLetter}>S</Text>
          </LinearGradient>
          <View>
            <Text style={styles.brandTitle}>
              Skinovate <Text style={{ color: T.brandPurpleB }}>AI</Text>
            </Text>
            <Text style={styles.brandSub}>AI · Doctor · Care</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/notifications-centre')} hitSlop={8} style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={20} color={T.textHi} />
            <View style={styles.bellDot} />
          </Pressable>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={18} color={T.textMid} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SPARKLE
// ═════════════════════════════════════════════════════════════════════════════

function Sparkle({ size = 14, color }: { size?: number; color?: string }) {
  const { T } = useDashTheme();
  const tint = color ?? T.brandPurpleB;
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, []);
  const s = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(v.value, [0, 1], [0.85, 1.1]) },
      { rotate: `${interpolate(v.value, [0, 1], [-8, 8])}deg` },
    ],
  }));
  return (
    <ReAnimated.View style={s}>
      <Ionicons name="sparkles" size={size} color={tint} />
    </ReAnimated.View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CARE-PLAN TINY RING
// ═════════════════════════════════════════════════════════════════════════════

function CarePlanRing({ pct }: { pct: number }) {
  const { T } = useDashTheme();
  const RAD = 26;
  const STROKE = 5;
  const CIRC = 2 * Math.PI * RAD;
  return (
    <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={64} height={64} viewBox="0 0 64 64">
        <Defs>
          <SvgLinearGradient id="cp-g" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={T.dentalA} />
            <Stop offset="1" stopColor={T.brandPurpleB} />
          </SvgLinearGradient>
        </Defs>
        <Circle cx="32" cy="32" r={RAD} stroke={T.ringTrack} strokeWidth={STROKE} fill="none" />
        <Circle
          cx="32" cy="32" r={RAD}
          stroke="url(#cp-g)" strokeWidth={STROKE} fill="none"
          strokeDasharray={`${CIRC * (pct / 100)} ${CIRC}`}
          strokeLinecap="round"
          transform="rotate(-90 32 32)"
        />
      </Svg>
      <Text style={{
        position: 'absolute', color: T.textHi,
        fontFamily: FONT_MONO, fontSize: 16,
      }}>{pct}%</Text>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════════════════

function timeOfDayCopy() {
  const h = new Date().getHours();
  if (h < 12) return { greet: 'Good morning',   mood: 'Your morning glow check' };
  if (h < 17) return { greet: 'Good afternoon', mood: 'Mid-day skin check-in' };
  if (h < 21) return { greet: 'Good evening',   mood: 'Your evening skin recovery' };
  return       { greet: 'Good night',     mood: "Tonight's care insights" };
}

function formatDate() {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return {
    main: `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
    sub:  days[d.getDay()],
  };
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { scrollY } = useTabScroll();
  const insets = useSafeAreaInsets();
  const { T, styles } = useDashTheme();

  const [activeTab, setActiveTab] = useState<'skin' | 'dental' | 'face'>('skin');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { 'worklet'; scrollY.value = e.contentOffset.y; },
  });

  const { greet, mood } = useMemo(timeOfDayCopy, []);
  const date = useMemo(formatDate, []);
  const firstName = (user?.fullName?.split(' ')[0]?.trim()) || 'there';

  const tabIndex = activeTab === 'skin' ? 0 : activeTab === 'dental' ? 1 : 2;
  const tabPos = useSharedValue(0);
  useEffect(() => {
    tabPos.value = withSpring(tabIndex, { damping: 16, stiffness: 130 });
  }, [tabIndex]);
  const TAB_W = (SCREEN_W - 40 - 8) / 3;
  const tabSliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabPos.value * (TAB_W + 4) }],
  }));

  const treatments = QUICK_TREATMENTS[activeTab];

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[T.bgGradTop, T.bgGradBot]}
        locations={[0, 0.4]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StickyHeader avatar={user?.profileImage} scrollY={scrollY} />

        <ReAnimated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
        >
          {/* 1. Hero greeting */}
          <View style={styles.heroRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.greet}>
                {greet}, <Text style={{ color: T.skinB }}>{firstName}</Text> <Sparkle size={20} color={T.skinA} />
              </Text>
              <Text style={styles.mood}>{mood} <Ionicons name="trending-up" size={13} color={T.success} /></Text>
              <View style={styles.verifLine}>
                <Ionicons name="shield-checkmark" size={11} color={T.brandPurpleB} />
                <Text style={styles.verifLineText}>AI + Doctor verified · Personalized for you</Text>
              </View>
            </View>
            <View style={styles.datePill}>
              <Ionicons name="calendar-outline" size={14} color={T.fire} />
              <View>
                <Text style={styles.dateMain}>{date.main}</Text>
                <Text style={styles.dateSub}>{date.sub}</Text>
              </View>
            </View>
          </View>

          {/* 2. Three score cards */}
          <View style={styles.scoreRow}>
            <ScoreCard score={92} trend={6} type="skin"   title="Skin Health"    delay={120} onPress={() => router.push('/harmony-report')} />
            <ScoreCard score={85} trend={5} type="dental" title="Dental Health"  delay={220} onPress={() => router.push('/harmony-report')} />
            <ScoreCard score={88} trend={7} type="face"   title="Facial Harmony" delay={320} onPress={() => router.push('/harmony-report')} />
          </View>

          {/* 3. Trust signals */}
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Text style={styles.trustEmoji}>💎</Text>
              <Text style={styles.trustText}>Scores update as your routine and treatments progress.</Text>
            </View>
            <View style={[styles.trustItem, { justifyContent: 'flex-end' }]}>
              <Ionicons name="lock-closed" size={11} color={T.textLo} />
              <Text style={styles.trustText}>Your data is private & secure</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* 4. Quick Treatments */}
          <View style={styles.qtHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.sectionTitle}>Quick Treatments</Text>
              <Sparkle />
            </View>
            <Pressable onPress={() => router.push('/(tabs)/treatments' as any)} hitSlop={6}>
              <Text style={styles.viewAll}>View all treatments ›</Text>
            </Pressable>
          </View>
          <Text style={styles.qtCurated}>Curated by AI. Approved by specialists.</Text>

          <View style={styles.tabsRow}>
            <ReAnimated.View style={[styles.tabSlider, { width: TAB_W }, tabSliderStyle]}>
              <LinearGradient
                colors={[T.rose, T.brandPurpleB]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 999 }]}
              />
            </ReAnimated.View>
            {(['skin', 'dental', 'face'] as const).map((tab) => {
              const active = activeTab === tab;
              const label = tab === 'skin' ? 'Skin' : tab === 'dental' ? 'Dental' : 'Face';
              const icon: keyof typeof Ionicons.glyphMap =
                tab === 'skin' ? 'sparkles-outline' :
                tab === 'dental' ? 'medkit-outline' : 'happy-outline';
              return (
                <Pressable
                  key={tab}
                  onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}
                  style={[styles.tab, { width: TAB_W }]}
                >
                  <Ionicons name={icon} size={14} color={active ? '#FFFFFF' : T.textLo} />
                  <Text style={[styles.tabText, active && { color: '#FFFFFF', fontFamily: FONT_SANS_B }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.qtScroll}
            decelerationRate="fast"
          >
            {treatments.map((t, i) => (
              <QuickTreatmentCard key={t.id} t={t} delay={i * 80} />
            ))}
          </ScrollView>

          {/* 5. Recommended For You */}
          <View style={styles.qtHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.sectionTitle}>Recommended For You</Text>
              <Sparkle />
            </View>
          </View>
          <FeaturedTreatmentCard onCta={() => router.push('/care/consult-doctor')} />

          {/* 6. Two-card row */}
          <View style={styles.dualRow}>
            <Pressable onPress={() => router.push('/care/all-appointments')} style={[styles.dualCard, { marginRight: 6 }]}>
              <View style={styles.dualHead}>
                <Ionicons name="calendar-outline" size={14} color={T.textMid} />
                <Text style={styles.dualHeadText}>Upcoming Appointment</Text>
                <Text style={styles.dualViewAll}>View all ›</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <View style={styles.clinicThumb}>
                  <Ionicons name="business" size={20} color={T.textMid} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.apptTitle}>HydraGlow 360 Facial</Text>
                  <Text style={styles.apptMeta}><Ionicons name="calendar" size={10} color={T.textLo} /> {date.main} · 11:00 AM</Text>
                  <Text style={styles.apptMeta} numberOfLines={1}><Ionicons name="location" size={10} color={T.textLo} /> Skinovate Premium Clinic</Text>
                </View>
              </View>
              <View style={styles.dualBtn}>
                <Text style={styles.dualBtnText}>View appointment details</Text>
                <Ionicons name="arrow-forward" size={12} color={T.brandPurpleB} />
              </View>
            </Pressable>

            <Pressable onPress={() => router.push('/treatment-plan')} style={[styles.dualCard, { marginLeft: 6 }]}>
              <View style={styles.dualHead}>
                <Ionicons name="shield-checkmark-outline" size={14} color={T.textMid} />
                <Text style={styles.dualHeadText}>Your Care Plan</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <CarePlanRing pct={80} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cpHeadline}>You're doing great!</Text>
                  <Text style={styles.cpSub} numberOfLines={3}>Follow your personalized plan to achieve optimal results.</Text>
                </View>
              </View>
              <View style={styles.dualBtn}>
                <Text style={styles.dualBtnText}>View my plan</Text>
                <Ionicons name="arrow-forward" size={12} color={T.brandPurpleB} />
              </View>
            </Pressable>
          </View>

          {/* 7. Streak */}
          <StreakCard days={24} />
        </ReAnimated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES (factory — recomputed per theme)
// ═════════════════════════════════════════════════════════════════════════════

function makeStyles(T: Tokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg },

    // Header
    headerWrap: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
    headerHairline: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      height: StyleSheet.hairlineWidth, backgroundColor: T.cardBorder,
    },
    headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    brandLogo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    brandLogoLetter: { fontFamily: FONT_SERIF, fontSize: 20, color: '#fff' },
    brandTitle: { fontFamily: FONT_SERIF, fontSize: 18, color: T.textHi, lineHeight: 20 },
    brandSub: { fontFamily: FONT_SANS, fontSize: 10, color: T.textLo, marginTop: 1 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bellBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: T.cardBgStrong, borderWidth: 1, borderColor: T.cardBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    bellDot: {
      position: 'absolute', top: 8, right: 9,
      width: 7, height: 7, borderRadius: 4, backgroundColor: T.rose,
      borderWidth: 1, borderColor: T.bg,
    },
    avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: T.cardBorder },
    avatarFallback: { backgroundColor: T.cardBgStrong, alignItems: 'center', justifyContent: 'center' },

    // Hero
    heroRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 22 },
    greet: { fontFamily: FONT_SERIF, fontSize: 28, color: T.textHi, lineHeight: 32 },
    mood: { fontFamily: FONT_SANS, fontSize: 13, color: T.textMid, marginTop: 6 },
    verifLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    verifLineText: { fontFamily: FONT_SANS, fontSize: 11, color: T.textLo },
    datePill: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14,
      backgroundColor: T.cardBg, borderWidth: 1, borderColor: T.cardBorder,
    },
    dateMain: { fontFamily: FONT_SANS_B, fontSize: 13, color: T.textHi },
    dateSub: { fontFamily: FONT_SANS, fontSize: 11, color: T.textLo, marginTop: 1 },

    // Score row
    scoreRow: { flexDirection: 'row', paddingHorizontal: 14, gap: 8 },
    scoreCard: {
      flex: 1, borderRadius: 22,
      backgroundColor: T.cardBg, borderWidth: 1, borderColor: T.cardBorder,
      overflow: 'hidden',
    },
    scoreCardInner: { padding: 12, alignItems: 'center' },
    trendPill: {
      position: 'absolute', top: 10, right: 10,
      flexDirection: 'row', alignItems: 'center', gap: 2,
      paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
      backgroundColor: T.trendBg, borderWidth: 1, borderColor: T.trendBorder,
    },
    trendPillText: { fontFamily: FONT_SANS_B, fontSize: 10, color: T.success },

    ringWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
    ringGlow: {
      position: 'absolute', width: 120, height: 120, borderRadius: 60,
      shadowOffset: { width: 0, height: 0 }, shadowRadius: 20,
      elevation: 10,
    },
    ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    scoreNum: { fontFamily: FONT_MONO, fontSize: 30, color: T.textHi, lineHeight: 32 },
    scoreSlash: { fontFamily: FONT_SANS, fontSize: 11, color: T.textLo, marginTop: 1 },
    scoreTitle: { fontFamily: FONT_SANS_B, fontSize: 13, color: T.textHi, marginTop: 14, textAlign: 'center' },

    verifRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 12, justifyContent: 'center' },
    verifItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    verifText: { fontFamily: FONT_SANS, fontSize: 9, color: T.textLo },
    verifDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: T.textLo, opacity: 0.6 },

    insightsBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, alignSelf: 'stretch',
      overflow: 'hidden', borderWidth: 1, borderColor: T.cardBorder,
    },
    insightsText: { fontFamily: FONT_SANS_M, fontSize: 11, color: T.textHi },

    // Trust
    trustRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 14, gap: 10 },
    trustItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    trustEmoji: { fontSize: 11 },
    trustText: { fontFamily: FONT_SANS, fontSize: 10, color: T.textLo, flexShrink: 1 },
    divider: { marginHorizontal: 20, height: StyleSheet.hairlineWidth, backgroundColor: T.cardBorder, marginTop: 14 },

    // Section headers
    sectionTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: T.textHi },
    qtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 22, marginBottom: 4 },
    qtCurated: { fontFamily: FONT_SANS, fontSize: 12, color: T.textLo, paddingHorizontal: 20, marginBottom: 14 },
    viewAll: { fontFamily: FONT_SANS_M, fontSize: 12, color: T.brandPurpleB },

    // Tabs
    tabsRow: {
      flexDirection: 'row', marginHorizontal: 20,
      backgroundColor: T.cardBg, borderRadius: 999, padding: 4,
      borderWidth: 1, borderColor: T.cardBorder, marginBottom: 14, position: 'relative',
    },
    tabSlider: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 999, overflow: 'hidden' },
    tab: { paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
    tabText: { fontFamily: FONT_SANS_M, fontSize: 13, color: T.textLo },

    // Quick treatments
    qtScroll: { paddingHorizontal: 20, gap: 10, paddingBottom: 6 },
    qtCard: {
      width: 132, borderRadius: 20,
      backgroundColor: T.cardBg, borderWidth: 1, borderColor: T.cardBorder,
      overflow: 'hidden',
    },
    qtCardInner: { padding: 12, alignItems: 'center' },
    topMatchPill: {
      position: 'absolute', top: 8, right: 8, zIndex: 5,
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
      backgroundColor: T.brandPurple,
    },
    topMatchText: { fontFamily: FONT_SANS_B, fontSize: 9, color: '#fff', letterSpacing: 0.3 },
    qtIconWrap: { width: 64, height: 64, marginTop: 4, marginBottom: 8 },
    qtName: { fontFamily: FONT_SANS_B, fontSize: 13, color: T.textHi, textAlign: 'center', minHeight: 32 },
    qtBlurb: { fontFamily: FONT_SANS, fontSize: 11, color: T.textLo, textAlign: 'center', marginTop: 4, minHeight: 28 },
    suitPillWrap: {
      marginTop: 10, paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 999, alignSelf: 'stretch', alignItems: 'center', overflow: 'hidden',
    },
    suitPillText: { fontFamily: FONT_SANS_B, fontSize: 10 },

    // Featured
    featuredCard: {
      marginHorizontal: 20, marginTop: 6,
      borderRadius: 24, overflow: 'hidden', height: 280,
      borderWidth: 1, borderColor: T.cardBorder,
    },
    featuredContent: { flex: 1, padding: 18, justifyContent: 'space-between' },
    aiPill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      alignSelf: 'flex-start',
      paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    },
    aiPillText: { fontFamily: FONT_SANS_B, fontSize: 10, color: '#FFFFFF', letterSpacing: 0.5 },
    featuredTitle: { fontFamily: FONT_SERIF, fontSize: 26, color: '#FFFFFF', lineHeight: 30, marginTop: 4 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    tag: {
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    },
    tagText: { fontFamily: FONT_SANS_M, fontSize: 11, color: '#FFFFFF' },
    featuredDesc: { fontFamily: FONT_SANS, fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 17 },
    benefitRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
    benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    benefitText: { fontFamily: FONT_SANS_M, fontSize: 11, color: 'rgba(255,255,255,0.85)' },
    featuredFooter: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    ctaShadow: { shadowColor: T.rose, shadowOffset: { width: 0, height: 0 }, borderRadius: 999 },
    ctaPressable: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingLeft: 18, paddingRight: 6, paddingVertical: 6,
      borderRadius: 999, overflow: 'hidden',
    },
    ctaText: { fontFamily: FONT_SANS_B, fontSize: 13, color: '#fff' },
    ctaArrow: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center', justifyContent: 'center',
    },
    learnMore: { fontFamily: FONT_SANS_M, fontSize: 12, color: '#FFFFFF' },

    suitBadgeWrap: {
      position: 'absolute', top: 14, right: 14,
      width: 68, height: 68, alignItems: 'center', justifyContent: 'center',
    },
    suitBadgeGlow: {
      position: 'absolute', width: 90, height: 90, borderRadius: 45,
      backgroundColor: T.skinGlow,
    },
    suitBadgeText: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    suitBadgePct: { fontFamily: FONT_MONO, fontSize: 18, color: '#FFFFFF', lineHeight: 20 },
    suitBadgeUnit: { fontFamily: FONT_SANS, fontSize: 10, color: '#FFFFFF' },
    suitBadgeLbl: { fontFamily: FONT_SANS, fontSize: 8, color: 'rgba(255,255,255,0.85)' },

    // Dual
    dualRow: { flexDirection: 'row', paddingHorizontal: 14, marginTop: 18 },
    dualCard: {
      flex: 1, backgroundColor: T.cardBg, borderWidth: 1, borderColor: T.cardBorder,
      borderRadius: 20, padding: 14,
    },
    dualHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dualHeadText: { flex: 1, fontFamily: FONT_SANS_B, fontSize: 12, color: T.textHi },
    dualViewAll: { fontFamily: FONT_SANS_M, fontSize: 10, color: T.brandPurpleB },
    clinicThumb: {
      width: 44, height: 44, borderRadius: 12,
      backgroundColor: T.cardBgStrong, borderWidth: 1, borderColor: T.cardBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    apptTitle: { fontFamily: FONT_SANS_B, fontSize: 12, color: T.textHi },
    apptMeta: { fontFamily: FONT_SANS, fontSize: 10, color: T.textLo, marginTop: 2 },
    cpHeadline: { fontFamily: FONT_SANS_B, fontSize: 12, color: T.textHi },
    cpSub: { fontFamily: FONT_SANS, fontSize: 10, color: T.textLo, marginTop: 2, lineHeight: 14 },

    dualBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 12, paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.cardBorder,
    },
    dualBtnText: { fontFamily: FONT_SANS_M, fontSize: 11, color: T.brandPurpleB },

    // Streak
    streakCard: {
      marginHorizontal: 20, marginTop: 18,
      borderRadius: 22, overflow: 'hidden',
      flexDirection: 'row', alignItems: 'center',
      padding: 16, gap: 12, minHeight: 96,
      borderWidth: 1, borderColor: T.cardBorder,
    },
    streakLeft: { flex: 1 },
    streakHeadline: { fontFamily: FONT_SERIF, fontSize: 17, color: '#FFFFFF', lineHeight: 22 },
    streakSub: { fontFamily: FONT_SANS, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
    streakRight: {
      alignItems: 'center', paddingLeft: 12, paddingHorizontal: 8,
      borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(255,255,255,0.18)',
    },
    streakNumRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    streakNum: { fontFamily: FONT_MONO, fontSize: 28, color: '#FFFFFF' },
    streakFire: { fontSize: 18 },
    streakDayLabel: { fontFamily: FONT_SANS_M, fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  });
}
