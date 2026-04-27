import React, { useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  Alert, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat,
  withSequence, withTiming, FadeInDown,
  Easing, interpolate,
} from 'react-native-reanimated';
import { MOCK_SCANS } from '../../constants/mockData';
import AvatarCircle from '../../components/AvatarCircle';
import { useUser } from '../../contexts/UserContext';
import { DEV_MODE } from '../../config/devMode';

const { width } = Dimensions.get('window');

// ─── Data ─────────────────────────────────────────────────────────
const avgScore  = Math.round(MOCK_SCANS.reduce((s, r) => s + r.scores.overall, 0) / MOCK_SCANS.length);
const bestScore = Math.max(...MOCK_SCANS.map((s) => s.scores.overall));

const SECTIONS = [
  {
    key: 'account',
    label: 'Account',
    items: [
      { icon: 'person-outline'        as const, label: 'Edit Profile',          sub: 'Update your info',          tint: '#7C3AED', route: '/profile-setup'          },
      { icon: 'notifications-outline' as const, label: 'Notifications',          sub: 'Manage alerts',              tint: '#F59E0B', route: '/notifications'           },
      { icon: 'lock-closed-outline'   as const, label: 'Privacy & Security',     sub: 'Data & permissions',         tint: '#3B82F6', route: '/privacy-security'        },
    ],
  },
  {
    key: 'health',
    label: 'Health',
    items: [
      { icon: 'scan-outline'          as const, label: 'Scan History',            sub: `${MOCK_SCANS.length} scans`,  tint: '#10B981', route: '/scan-history'           },
      { icon: 'heart-outline'         as const, label: 'Health Conditions',       sub: 'Your health profile',         tint: '#EF4444', route: '/health-conditions'      },
      { icon: 'calendar-outline'      as const, label: 'My Appointments',         sub: 'Upcoming & past',             tint: '#0EA5E9', route: '/care/all-appointments'  },
      { icon: 'document-text-outline' as const, label: 'Medical Reports',         sub: 'X-Ray, MRI, CBC…',            tint: '#F97316', route: '/(tabs)/reports'         },
    ],
  },
  {
    key: 'support',
    label: 'Support',
    items: [
      { icon: 'help-circle-outline'         as const, label: 'Help & FAQ',       sub: 'Quick answers',    tint: '#8B5CF6', route: '/help-faq'        },
      { icon: 'chatbubble-ellipses-outline' as const, label: 'Contact Us',       sub: 'We\'re here',      tint: '#06B6D4', route: '/contact-us'      },
      { icon: 'sparkles-outline'            as const, label: 'About AesthetiQ',  sub: 'Our story',        tint: '#EC4899', route: '/about'           },
    ],
  },
  {
    key: 'legal',
    label: 'Legal',
    items: [
      { icon: 'document-outline' as const, label: 'Terms & Conditions', sub: null, tint: '#9CA3AF', route: '/terms'          },
      { icon: 'shield-outline'   as const, label: 'Privacy Policy',     sub: null, tint: '#9CA3AF', route: '/privacy-policy'  },
    ],
  },
];

// ─── Stat Pill ────────────────────────────────────────────────────
function StatPill({
  value, label, delay, gold = false,
}: { value: number; label: string; delay: number; gold?: boolean }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.statPill}>
      <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.statPillInner}>
        {gold ? (
          <LinearGradient colors={['#FFD700', '#FFB300']} style={styles.goldNumWrap}>
            <Text style={styles.statNumGold}>{value}</Text>
          </LinearGradient>
        ) : (
          <Text style={styles.statNum}>{value}</Text>
        )}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Menu Row ─────────────────────────────────────────────────────
function MenuRow({
  icon, label, sub, tint, onPress, isLast,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub: string | null;
  tint: string;
  onPress: () => void;
  isLast: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withTiming(0.975, { duration: 100 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={onPress}
      android_ripple={{ color: 'rgba(124,58,237,0.05)' }}
    >
      <Animated.View style={[styles.menuRow, !isLast && styles.menuRowBorder, animStyle]}>
        {/* Icon */}
        <View style={[styles.iconBox, { backgroundColor: tint + '18' }]}>
          <Ionicons name={icon} size={17} color={tint} />
        </View>

        {/* Text */}
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuLabel}>{label}</Text>
          {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
      </Animated.View>
    </Pressable>
  );
}

// ─── withSpring shim (Reanimated 4 export) ────────────────────────
import { withSpring } from 'react-native-reanimated';

// ─── Screen ───────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router   = useRouter();
  const { user } = useUser();

  // Breathing glow on avatar
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.35, 0.75]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.12]) }],
  }));

  const handleSignOut = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Keep me in', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (!DEV_MODE) {
            try {
              const { signOut } = await import('firebase/auth');
              const { auth }    = await import('../../config/firebase');
              if (auth) await signOut(auth);
            } catch (_) {}
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >

        {/* ═══════════════════════════════════════
            HERO — dark luxury gradient
        ═══════════════════════════════════════ */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={['#0E0A1F', '#1A1235', '#2D1E5F', '#3B2176']}
            locations={[0, 0.3, 0.7, 1]}
            style={styles.hero}
          >
            {/* Radial backdrop blob */}
            <View style={styles.heroBlob} />

            {/* ── Avatar + breathing ring ── */}
            <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.avatarArea}>
              {/* Outer breathing glow ring */}
              <Animated.View style={[styles.glowRingOuter, glowStyle]} />
              {/* Static inner ring */}
              <LinearGradient
                colors={['#A78BFA', '#7C3AED', '#4C1D95']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradientRing}
              >
                <View style={styles.avatarInner}>
                  <AvatarCircle
                    name={user?.fullName ?? 'U'}
                    imageUri={user?.profileImage}
                    size={84}
                    borderWidth={0}
                  />
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Name & email */}
            <Animated.View entering={FadeInDown.delay(80).springify()} style={{ alignItems: 'center' }}>
              <Text style={styles.heroName}>{user?.fullName ?? 'User'}</Text>
              <Text style={styles.heroEmail}>{user?.email ?? ''}</Text>
            </Animated.View>

            {/* ── Stat pills ── */}
            <View style={styles.statRow}>
              <StatPill value={avgScore}           label="Avg Score"   delay={120} />
              <StatPill value={bestScore}          label="Best Score"  delay={200} gold />
              <StatPill value={MOCK_SCANS.length}  label="Total Scans" delay={280} />
            </View>
          </LinearGradient>

          {/* Curved bottom edge on hero */}
          <View style={styles.heroCurve} />
        </View>

        {/* ═══════════════════════════════════════
            MENU SECTIONS
        ═══════════════════════════════════════ */}
        <View style={styles.body}>
          {SECTIONS.map((section, si) => (
            <Animated.View
              key={section.key}
              entering={FadeInDown.delay(160 + si * 60).springify()}
              style={styles.sectionWrap}
            >
              <Text style={styles.sectionLabel}>{section.label}</Text>

              <View style={styles.sectionCard}>
                {section.items.map((item, i) => (
                  <MenuRow
                    key={item.label}
                    icon={item.icon}
                    label={item.label}
                    sub={item.sub}
                    tint={item.tint}
                    isLast={i === section.items.length - 1}
                    onPress={() => {
                      if (item.route) router.push(item.route as any);
                      else Alert.alert(item.label, 'Coming soon.');
                    }}
                  />
                ))}
              </View>
            </Animated.View>
          ))}

          {/* ── Sign Out ── */}
          <Animated.View
            entering={FadeInDown.delay(420).springify()}
            style={styles.signOutWrap}
          >
            <Pressable
              onPress={handleSignOut}
              onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
              android_ripple={{ color: 'rgba(239,68,68,0.08)' }}
              style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.78 }]}
            >
              <Ionicons name="log-out-outline" size={17} color="#EF4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          </Animated.View>

          <Text style={styles.version}>AesthetiQ v1.0.0 · Powered by AI</Text>
          <View style={{ height: 120 }} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F2F2F7' },
  scroll: { flexGrow: 1 },

  // ── Hero ──
  heroWrap: { position: 'relative' },
  hero: {
    paddingTop: 44,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 0,
  },
  heroBlob: {
    position: 'absolute',
    top: -60,
    left: width / 2 - 160,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#5B21B6',
    opacity: 0.22,
  },

  // Curved bottom on hero (white sheet coming up)
  heroCurve: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },

  // ── Avatar ──
  avatarArea: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  glowRingOuter: {
    position: 'absolute',
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: '#7C3AED',
    opacity: 0.4,
  },
  avatarGradientRing: {
    width: 98,
    height: 98,
    borderRadius: 49,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  avatarInner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: 'hidden',
    backgroundColor: '#1A1235',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Name / Email ──
  heroName: {
    fontSize: 23,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginBottom: 5,
    marginTop: 2,
  },
  heroEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.38)',
    fontWeight: '400',
    marginBottom: 28,
  },

  // ── Stat pills ──
  statRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    paddingHorizontal: 2,
  },
  statPill: {
    flex: 1,
    height: 74,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  statPillInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 2,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  goldNumWrap: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  statNumGold: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1235',
    lineHeight: 26,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.42)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ── Body ──
  body: {
    paddingTop: 8,
    paddingHorizontal: 20,
    backgroundColor: '#F2F2F7',
  },

  // ── Sections ──
  sectionWrap: { marginBottom: 10 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 8,
    marginLeft: 6,
    marginTop: 14,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },

  // ── Menu row ──
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    gap: 12,
    minHeight: 52,
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60,60,67,0.1)',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuTextWrap: { flex: 1, gap: 1 },
  menuLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1C1C1E',
    letterSpacing: -0.1,
  },
  menuSub: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400',
  },

  // ── Sign Out ──
  signOutWrap: { marginTop: 18, marginBottom: 4 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(239,68,68,0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    letterSpacing: -0.1,
  },

  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#C7C7CC',
    marginTop: 20,
    fontWeight: '400',
  },
});
