import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine   = Animated.createAnimatedComponent(Line);

// ─── Config ────────────────────────────────────────────────────────
const W    = 260;
const H    = 68;
const CY   = H / 2;
const AMP  = 17;
const FREQ = 2.0; // full waves
const NODES = 8;

// Pre-compute static paths in JS (never in worklets)
function buildStaticPath(flip: boolean): string {
  const steps = 48;
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W;
    const t = (x / W) * Math.PI * 2 * FREQ;
    const y = CY + (flip ? -1 : 1) * AMP * Math.sin(t);
    parts.push(i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `L ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return parts.join(' ');
}

const STRAND1 = buildStaticPath(false);
const STRAND2 = buildStaticPath(true);

// Static node positions
const NODES_DATA = Array.from({ length: NODES }, (_, i) => {
  const nx = ((i + 0.5) / NODES) * W;
  const t  = (nx / W) * Math.PI * 2 * FREQ;
  return { nx, y1: CY + AMP * Math.sin(t), y2: CY - AMP * Math.sin(t), frac: (i + 0.5) / NODES };
});

// ─── Main Component ────────────────────────────────────────────────
interface Props {
  progress: Animated.SharedValue<number>;
}

export default function DNALoader({ progress }: Props) {
  const scroll   = useSharedValue(0);
  const nodeGlow = useSharedValue(0);
  const pulseX   = useSharedValue(0);

  useEffect(() => {
    scroll.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1, false,
    );

    pulseX.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 0 }),
      ),
      -1, false,
    );

    nodeGlow.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
  }, []);

  // Slide the SVG left to give a scrolling-strands effect
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(scroll.value, [0, 1], [0, -36]) }],
  }));

  // Progress bar width
  const barStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [0, W]),
  }));

  // Energy pulse circle
  const pulseProps = useAnimatedProps(() => ({
    cx:      interpolate(pulseX.value, [0, 1], [4, W - 4]),
    cy:      CY + AMP * Math.sin(interpolate(pulseX.value, [0, 1], [0, Math.PI * 2 * FREQ])),
    r:       interpolate(pulseX.value, [0, 0.1, 0.9, 1], [0, 7, 7, 0]),
    opacity: interpolate(pulseX.value, [0, 0.1, 0.9, 1], [0, 0.85, 0.85, 0]),
  }));

  return (
    <View style={styles.wrapper}>
      {/* DNA helix */}
      <Animated.View style={[{ width: W, height: H, overflow: 'hidden' }, slideStyle]}>
        <Svg width={W + 40} height={H}>

          {/* Bond lines */}
          {NODES_DATA.map((n, i) => (
            <BondLine key={i} n={n} nodeGlow={nodeGlow} />
          ))}

          {/* Dim ghost strands */}
          <Path d={STRAND1} stroke="#C4B5FD" strokeWidth={2} strokeOpacity={0.3} fill="none" />
          <Path d={STRAND2} stroke="#C4B5FD" strokeWidth={2} strokeOpacity={0.3} fill="none" />

          {/* Bright active strands */}
          <Path d={STRAND1} stroke="#8B5CF6" strokeWidth={2.5} strokeOpacity={0.9} fill="none" />
          <Path d={STRAND2} stroke="#8B5CF6" strokeWidth={2.5} strokeOpacity={0.9} fill="none" />

          {/* Node dots */}
          {NODES_DATA.map((n, i) => (
            <NodeDots key={i} n={n} nodeGlow={nodeGlow} progress={progress} />
          ))}

          {/* Energy pulse */}
          <AnimatedCircle animatedProps={pulseProps} fill="#DDD6FE" />

        </Svg>
      </Animated.View>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </View>
  );
}

// ─── Bond Line ─────────────────────────────────────────────────────
function BondLine({ n, nodeGlow }: { n: typeof NODES_DATA[0]; nodeGlow: Animated.SharedValue<number> }) {
  const props = useAnimatedProps(() => ({
    strokeOpacity: interpolate(nodeGlow.value, [0, 1], [0.15, 0.5]),
  }));
  return (
    <AnimatedLine
      x1={n.nx} y1={n.y1} x2={n.nx} y2={n.y2}
      stroke="#A78BFA"
      strokeWidth={1.2}
      strokeDasharray="3,3"
      animatedProps={props}
    />
  );
}

// ─── Node Dots ─────────────────────────────────────────────────────
function NodeDots({ n, nodeGlow, progress }: { n: typeof NODES_DATA[0]; nodeGlow: Animated.SharedValue<number>; progress: Animated.SharedValue<number> }) {
  const top = useAnimatedProps(() => ({
    r:       interpolate(nodeGlow.value, [0, 1], [3.0, 3.9]),
    opacity: n.frac <= progress.value ? 1 : 0.3,
  }));
  const bot = useAnimatedProps(() => ({
    r:       interpolate(nodeGlow.value, [0, 1], [3.0, 3.9]),
    opacity: n.frac <= progress.value ? 1 : 0.3,
  }));
  return (
    <>
      <AnimatedCircle cx={n.nx} cy={n.y1} fill="#A78BFA" animatedProps={top} />
      <AnimatedCircle cx={n.nx} cy={n.y2} fill="#A78BFA" animatedProps={bot} />
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 10,
  },
  barTrack: {
    width: W,
    height: 2,
    backgroundColor: 'rgba(167,139,250,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
});
