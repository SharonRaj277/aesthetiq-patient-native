import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  colors?: [string, string];
  style?: ViewStyle;
  textStyle?: object;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
  height?: number;
}

export default function GradientButton({
  label,
  onPress,
  colors = ['#7C3AED', '#A855F7'],
  style,
  textStyle,
  disabled = false,
  loading = false,
  variant = 'primary',
  height = 54,
}: GradientButtonProps) {
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  if (variant === 'outline') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
        style={[styles.outlineBtn, { height }, style, (disabled || loading) && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color="#7C3AED" size="small" />
        ) : (
          <Text style={[styles.outlineText, textStyle]}>{label}</Text>
        )}
      </Pressable>
    );
  }

  if (variant === 'danger') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        android_ripple={{ color: 'rgba(239,68,68,0.1)' }}
        style={[styles.outlineBtn, { height, borderColor: '#EF4444' }, style, (disabled || loading) && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color="#EF4444" size="small" />
        ) : (
          <Text style={[styles.outlineText, { color: '#EF4444' }, textStyle]}>{label}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
      style={[{ borderRadius: 16, overflow: 'hidden' }, style, (disabled || loading) && styles.disabled]}
    >
      <LinearGradient
        colors={disabled ? ['#D1D5DB', '#D1D5DB'] : colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, { height }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.text, textStyle]}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  outlineBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  outlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7C3AED',
  },
  disabled: {
    opacity: 0.55,
  },
});
