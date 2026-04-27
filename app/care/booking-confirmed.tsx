import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import AvatarCircle from '../../components/AvatarCircle';

const NEXT_STEPS = [
  { num: '1️⃣', text: 'Confirmation sent to your email' },
  { num: '2️⃣', text: 'Reminder sent 1 hour before appointment' },
  { num: '3️⃣', text: 'Join from Care tab when it\'s time' },
];

export default function BookingConfirmedScreen() {
  const router = useRouter();
  const { doctorName, slot, fee } = useLocalSearchParams<{ doctorName?: string; slot?: string; fee?: string }>();

  const checkScale = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1.1, friction: 4, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
    Animated.timing(contentFade, { toValue: 1, duration: 600, delay: 300, useNativeDriver: true }).start();
  }, []);

  return (
    <LinearGradient colors={['#F0FDF4', '#DCFCE7', '#F8F7FF']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Checkmark */}
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
            <Text style={styles.checkEmoji}>✓</Text>
          </Animated.View>

          <Text style={styles.title}>Booking Confirmed!</Text>
          <Text style={styles.subtitle}>Your appointment is all set.</Text>

          {/* Appointment Card */}
          <Animated.View style={[styles.apptCard, { opacity: contentFade }]}>
            <AvatarCircle name={doctorName ?? 'D'} size={52} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.apptDoctor}>{doctorName ?? 'Doctor'}</Text>
              <Text style={styles.apptSlot}>{slot ?? 'Scheduled'}</Text>
              {fee && <Text style={styles.apptFee}>₹{parseInt(fee).toLocaleString('en-IN')} paid</Text>}
            </View>
          </Animated.View>

          {/* Meeting ID */}
          <Animated.View style={[styles.meetingCard, { opacity: contentFade }]}>
            <Text style={styles.meetingLabel}>Meeting ID</Text>
            <Text style={styles.meetingId}>AQ-{Math.floor(100000 + Math.random() * 900000)}</Text>
            <Text style={styles.meetingHint}>Tap to copy</Text>
          </Animated.View>

          {/* What's Next */}
          <Animated.View style={[styles.nextStepsCard, { opacity: contentFade }]}>
            <Text style={styles.nextStepsTitle}>What Happens Next</Text>
            {NEXT_STEPS.map((step, i) => (
              <View key={i} style={styles.nextStepRow}>
                <Text style={styles.nextStepNum}>{step.num}</Text>
                <Text style={styles.nextStepText}>{step.text}</Text>
              </View>
            ))}
          </Animated.View>

          {/* CTAs */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.replace('/(tabs)'); }}
            android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
            style={{ borderRadius: 16, overflow: 'hidden', marginTop: 8 }}
          >
            <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.ctaBtn}>
              <Text style={styles.ctaBtnText}>Go to Dashboard</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/care/all-appointments'); }}
            android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>View Appointment</Text>
          </Pressable>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', padding: 24, paddingTop: 40 },
  checkCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#22C55E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  checkEmoji: { fontSize: 44, color: '#fff', fontWeight: '900' },
  title: { fontSize: 26, fontWeight: '900', color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 6, marginBottom: 24, textAlign: 'center' },
  apptCard: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: Colors.borderLight, ...Colors.shadow.small },
  apptDoctor: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  apptSlot: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  apptFee: { fontSize: 13, color: Colors.success, fontWeight: '700', marginTop: 4 },
  meetingCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: Colors.borderLight },
  meetingLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  meetingId: { fontSize: 22, fontWeight: '900', color: Colors.primary, marginTop: 4, letterSpacing: 2 },
  meetingHint: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  nextStepsCard: { width: '100%', backgroundColor: Colors.primaryBg, borderRadius: 20, padding: 16, marginBottom: 24 },
  nextStepsTitle: { fontSize: 13, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  nextStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  nextStepNum: { fontSize: 16 },
  nextStepText: { fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
  ctaBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, width: '100%' as any, paddingHorizontal: 40 },
  ctaBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  secondaryBtn: { width: '100%' as any, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
});
