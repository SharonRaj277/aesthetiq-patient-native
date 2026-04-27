/**
 * UnlockCard + UnlockFloatingBar
 *
 *  • UnlockCard         — full-width gradient CTA placed in the report flow
 *                          between the free preview and the locked sections.
 *  • UnlockFloatingBar  — sticky pill anchored to the bottom of the screen
 *                          that appears once the user scrolls past the card.
 *                          Tapping either fires the same handler.
 *
 * Both are pure presentational. Payment + Firestore writes happen in the
 * parent (ai-report.tsx) via reportUnlockService.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface UnlockCardProps {
  onPress:  () => void;
  loading?: boolean;
  scanType?: 'face' | 'skin' | 'dental';
}

export function UnlockCard({ onPress, loading, scanType }: UnlockCardProps) {
  const bullets = scanType === 'dental'
    ? [
        'Detailed tooth-by-tooth analysis',
        'Whiteness shade + alignment scores',
        'Personalised dental treatment plan',
      ]
    : scanType === 'face'
      ? [
          'LiDAR-mapped facial contour',
          'AI simulation — see your potential',
          'Personalised aesthetic recommendations',
        ]
      : [
          'Detailed zone-by-zone analysis',
          'AI simulation — see your potential results',
          'Personalised treatment recommendations',
        ];

  const handlePress = () => {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <View style={styles.cardWrap}>
      <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.card}>
        <Text style={styles.heading}>🔓 Unlock Your Complete Report</Text>

        <View style={{ marginTop: 14, gap: 8 }}>
          {bullets.map((b) => (
            <View key={b} style={styles.bulletRow}>
              <Text style={styles.bulletCheck}>✓</Text>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>

        <View style={styles.pricePill}>
          <Text style={styles.priceValue}>₹99</Text>
          <Text style={styles.priceUnit}>one-time</Text>
        </View>

        <Pressable onPress={handlePress} disabled={loading} style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}>
          <Text style={styles.buttonText}>
            {loading ? 'Processing…' : 'Unlock Now — ₹99'}
          </Text>
        </Pressable>

        <Text style={styles.secureText}>🔒 Secure payment via Razorpay</Text>
      </LinearGradient>
    </View>
  );
}

// ─── Floating sticky bar ─────────────────────────────────────────

interface UnlockFloatingBarProps {
  visible:  boolean;
  onPress:  () => void;
  loading?: boolean;
}

export function UnlockFloatingBar({ visible, onPress, loading }: UnlockFloatingBarProps) {
  if (!visible) return null;

  return (
    <View style={styles.floating}>
      <Text style={styles.floatingLabel}>🔓 Full Report</Text>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        disabled={loading}
        style={({ pressed }) => [styles.floatingBtn, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.floatingBtnText}>{loading ? '…' : 'Unlock ₹99'}</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardWrap: { paddingHorizontal: 16, paddingVertical: 8 },
  card:     { borderRadius: 24, padding: 24 },

  heading:  { fontSize: 20, fontWeight: '800', color: '#fff', lineHeight: 26 },

  bulletRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletCheck: { color: '#fff', fontSize: 14, fontWeight: '800', width: 16 },
  bulletText:  { color: 'rgba(255,255,255,0.92)', fontSize: 14, flex: 1, lineHeight: 20 },

  pricePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 99,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 18,
    gap: 8,
  },
  priceValue: { color: '#fff', fontSize: 28, fontWeight: '800' },
  priceUnit:  { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  button: {
    height: 56, borderRadius: 28, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  buttonText: { color: '#7C3AED', fontSize: 16, fontWeight: '800' },

  secureText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 12, textAlign: 'center' },

  // floating bar
  floating: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 72, backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.10, shadowRadius: 10 },
      android: { elevation: 12 },
    }),
  },
  floatingLabel: { fontSize: 14, fontWeight: '800', color: '#1C1C1E' },
  floatingBtn:   { height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  floatingBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
