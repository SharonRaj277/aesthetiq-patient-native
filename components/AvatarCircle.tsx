import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AvatarCircleProps {
  name?:        string;
  imageUri?:    string;          // remote or local URI — shown over initial
  size?:        number;
  colors?:      [string, string];
  fontSize?:    number;
  borderColor?: string;
  borderWidth?: number;
  onlineDot?:   boolean;
}

export default function AvatarCircle({
  name        = '?',
  imageUri,
  size        = 48,
  colors      = ['#7C3AED', '#A855F7'],
  fontSize,
  borderColor = '#fff',
  borderWidth = 0,
  onlineDot   = false,
}: AvatarCircleProps) {
  const initial          = name.trim().charAt(0).toUpperCase();
  const computedFontSize = fontSize ?? Math.round(size * 0.38);
  const radius           = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <LinearGradient
        colors={colors}
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: radius, borderWidth, borderColor },
        ]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: size, height: size, borderRadius: radius }}
            resizeMode="cover"
          />
        ) : (
          <Text style={[styles.initial, { fontSize: computedFontSize }]}>{initial}</Text>
        )}
      </LinearGradient>

      {onlineDot && (
        <View
          style={[
            styles.onlineDot,
            {
              width:        size * 0.25,
              height:       size * 0.25,
              borderRadius: (size * 0.25) / 2,
              bottom: 0,
              right:  0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems:     'center',
    justifyContent: 'center',
    overflow:       'hidden',
  },
  initial: {
    color:      '#fff',
    fontWeight: '800',
  },
  onlineDot: {
    position:        'absolute',
    backgroundColor: '#22C55E',
    borderWidth:     2,
    borderColor:     '#fff',
  },
});
