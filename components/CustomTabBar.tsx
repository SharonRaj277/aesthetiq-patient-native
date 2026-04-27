import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/colors';
import { MOCK_APPOINTMENTS } from '../constants/mockData';

const upcomingCount = MOCK_APPOINTMENTS.filter((a) => a.status === 'upcoming').length;

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  index:   { active: '🏠', inactive: '🏠' },
  scan:    { active: '🔬', inactive: '🔬' },
  care:    { active: '💊', inactive: '💊' },
  reports: { active: '📊', inactive: '📊' },
  profile: { active: '👤', inactive: '👤' },
};

const TAB_LABELS: Record<string, string> = {
  index:   'Home',
  scan:    'Scan',
  care:    'Care',
  reports: 'Reports',
  profile: 'Profile',
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const scales = useRef(state.routes.map(() => new Animated.Value(1))).current;

  const handlePress = (route: any, isFocused: boolean, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(scales[index], { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(scales[index], { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 12 }]}>
      <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.innerBorder} />

      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isScan = route.name === 'scan';
          const isCare = route.name === 'care';
          const icons = TAB_ICONS[route.name] || { active: '•', inactive: '•' };
          const label = TAB_LABELS[route.name] || route.name;

          if (isScan) {
            return (
              <Pressable
                key={route.key}
                onPress={() => handlePress(route, isFocused, index)}
                style={styles.scanTab}
                android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true, radius: 36 }}
              >
                <Animated.View
                  style={[
                    styles.scanCircle,
                    { transform: [{ scale: scales[index] }] },
                    isFocused && styles.scanCircleActive,
                  ]}
                >
                  <Text style={styles.scanIcon}>🔬</Text>
                </Animated.View>
                <Text style={[styles.scanLabel, isFocused && styles.scanLabelActive]}>Scan</Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={() => handlePress(route, isFocused, index)}
              style={styles.tab}
              android_ripple={{ color: 'rgba(124,58,237,0.15)', borderless: true, radius: 32 }}
            >
              <Animated.View style={[styles.tabInner, { transform: [{ scale: scales[index] }] }]}>
                <View style={styles.iconContainer}>
                  <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>
                    {icons.active}
                  </Text>
                  {isCare && upcomingCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{upcomingCount}</Text>
                    </View>
                  )}
                  {isFocused && <View style={styles.activeDot} />}
                </View>
                <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]} numberOfLines={1}>
                  {label}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    marginBottom: 12,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.88)',
    ...Colors.shadow.large,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    paddingBottom: 2,
  },
  tabInner: {
    alignItems: 'center',
    gap: 2,
  },
  iconContainer: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.45,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  // Scan (elevated center)
  scanTab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 2,
    marginTop: -20,
  },
  scanCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Colors.shadow.medium,
    borderWidth: 3,
    borderColor: '#fff',
  },
  scanCircleActive: {
    backgroundColor: Colors.primaryDark,
  },
  scanIcon: {
    fontSize: 26,
  },
  scanLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: 2,
  },
  scanLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
