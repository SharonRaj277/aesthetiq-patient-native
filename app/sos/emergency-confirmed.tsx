import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function EmergencyConfirmedScreen() {
  const router = useRouter();
  const { issueLabel } = useLocalSearchParams<{ issueLabel?: string }>();

  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue:   1,
      friction:  5,
      tension:   80,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>

          {/* Checkmark */}
          <Animated.View style={[styles.checkWrap, { transform: [{ scale: checkScale }] }]}>
            <Text style={styles.checkIcon}>✓</Text>
          </Animated.View>

          <Text style={styles.title}>Consultation Complete</Text>
          <Text style={styles.subtitle}>
            Check your Care tab for the{'\n'}summary and next steps.
          </Text>

          {/* Summary card */}
          <View style={styles.card}>
            <Row label="Issue handled" value={issueLabel ?? 'Emergency Issue'} />
            <Row label="Doctor"        value="Dr. Priya Sharma" />
            <Row label="Fee"           value="₹350" />
            <View style={styles.sentRow}>
              <Text style={styles.sentText}>📋  Summary sent to Care tab</Text>
            </View>
          </View>

          {/* Actions */}
          <Pressable
            onPress={() => {
              router.dismissAll();
              setTimeout(() => router.push('/(tabs)/care'), 150);
            }}
            style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}
          >
            <LinearGradient colors={['#7C3AED', '#9B6DFA']} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Go to Care Tab</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.dismissAll()}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </Pressable>

        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  safe:    { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },

  checkWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 24,
    shadowColor: '#22C55E', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 12,
  },
  checkIcon: { fontSize: 48, color: '#fff', fontWeight: '900', lineHeight: 56 },

  title:    { fontSize: 22, fontWeight: '900', color: '#1E1B4B', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginTop: 10, marginBottom: 28 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20, padding: 20,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
    marginBottom: 28, gap: 14,
  },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel:  { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  rowValue:  { fontSize: 13, color: '#1E1B4B', fontWeight: '800' },
  sentRow:   { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 10, alignItems: 'center' },
  sentText:  { fontSize: 12, color: '#16A34A', fontWeight: '700' },

  primaryBtn:     { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  secondaryBtn:     { height: 54, borderRadius: 16, borderWidth: 1.5, borderColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: '#7C3AED' },
});
