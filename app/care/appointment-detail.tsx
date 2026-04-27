import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { MOCK_APPOINTMENTS } from '../../constants/mockData';
import AvatarCircle from '../../components/AvatarCircle';

const CHECKLIST_ITEMS = [
  'Camera & microphone working',
  'Clean, quiet environment',
  'ID proof ready',
];

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const { apptId } = useLocalSearchParams<{ apptId?: string }>();
  const appt = MOCK_APPOINTMENTS.find((a) => a.id === apptId) ?? MOCK_APPOINTMENTS[0];

  const [checklist, setChecklist] = useState(CHECKLIST_ITEMS.map(() => false));
  const [countdown, setCountdown] = useState('');

  const minsUntil = Math.floor((appt.slotTime.getTime() - Date.now()) / 60000);
  const isJoinable = minsUntil <= 15 && minsUntil >= -30;
  const showCountdown = minsUntil > 0 && minsUntil <= 60;

  useEffect(() => {
    if (!showCountdown) return;
    const interval = setInterval(() => {
      const diff = appt.slotTime.getTime() - Date.now();
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleCheck = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecklist((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const meetingCode = `AQ-${appt.channelName.slice(-6).toUpperCase()}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Appointment Detail</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Doctor Card */}
        <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.doctorCard}>
          <View style={styles.doctorRow}>
            <AvatarCircle name={appt.doctorName} size={56} borderWidth={2} borderColor="rgba(255,255,255,0.5)" onlineDot />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.docName}>{appt.doctorName}</Text>
              <Text style={styles.docSpec}>{appt.doctorSpecialization}</Text>
              <Text style={styles.treatName}>{appt.treatmentName}</Text>
            </View>
          </View>
          <View style={styles.apptInfo}>
            <Text style={styles.apptTime}>{fmtDate(appt.slotTime)}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}</Text>
            </View>
          </View>

          {/* Meeting Code */}
          <Pressable
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Copied!', `Meeting code ${meetingCode} copied.`);
            }}
            style={styles.meetingRow}
          >
            <Text style={styles.meetingLabel}>Meeting Code</Text>
            <Text style={styles.meetingCode}>{meetingCode}  📋</Text>
          </Pressable>
        </LinearGradient>

        {/* Countdown */}
        {showCountdown && (
          <View style={styles.countdownCard}>
            <Text style={styles.countdownLabel}>Call starts in</Text>
            <Text style={styles.countdownTimer}>{countdown}</Text>
          </View>
        )}

        {/* Pre-call Checklist */}
        <Text style={styles.sectionTitle}>Pre-Call Checklist</Text>
        <View style={styles.card}>
          {CHECKLIST_ITEMS.map((item, i) => (
            <Pressable
              key={item}
              onPress={() => toggleCheck(i)}
              android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
              style={[styles.checkRow, i > 0 && styles.checkBorder]}
            >
              <View style={[styles.checkbox, checklist[i] && styles.checkboxDone]}>
                {checklist[i] && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>✓</Text>}
              </View>
              <Text style={[styles.checkLabel, checklist[i] && styles.checkLabelDone]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {/* Join Call Button */}
        <Text style={styles.sectionTitle}>Join Call</Text>
        {isJoinable ? (
          <Pressable
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Joining Call', 'Connecting to your appointment...'); }}
            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
            style={{ borderRadius: 16, overflow: 'hidden' }}
          >
            <LinearGradient colors={['#15803D', '#22C55E']} style={styles.joinBtn}>
              <Text style={styles.joinBtnText}>🎥  Join Call Now</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <View style={styles.joinDisabledBtn}>
            <Text style={styles.joinDisabledText}>
              {minsUntil > 0 ? `Join available 15 min before · ${minsUntil > 60 ? Math.floor(minsUntil / 60) + 'h away' : minsUntil + ' min away'}` : 'Call has ended'}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => Alert.alert('Reschedule', 'Select a new time for your appointment.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reschedule', onPress: () => {} }])}
            android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
            style={[styles.actionBtn, { flex: 1 }]}
          >
            <Text style={styles.actionBtnText}>Reschedule</Text>
          </Pressable>
          <Pressable
            onPress={() => Alert.alert('Cancel Appointment', 'This cannot be undone. Refund eligibility depends on cancellation time.', [{ text: 'Keep Appointment', style: 'cancel' }, { text: 'Yes, Cancel', style: 'destructive', onPress: () => router.back() }])}
            android_ripple={{ color: 'rgba(239,68,68,0.1)' }}
            style={[styles.cancelBtn, { flex: 1 }]}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.textPrimary },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  doctorCard: { borderRadius: 22, padding: 18, marginBottom: 14 },
  doctorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  docName: { fontSize: 16, fontWeight: '800', color: '#fff' },
  docSpec: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  treatName: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2 },
  apptInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  apptTime: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', flex: 1 },
  statusBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  meetingRow: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
  meetingLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  meetingCode: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  countdownCard: { backgroundColor: '#FFF7ED', borderRadius: 18, padding: 16, marginBottom: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A' },
  countdownLabel: { fontSize: 12, fontWeight: '600', color: Colors.warning },
  countdownTimer: { fontSize: 36, fontWeight: '900', color: Colors.warning, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10, marginTop: 18 },
  card: { backgroundColor: Colors.cardBg, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.borderLight, overflow: 'hidden', marginBottom: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  checkBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  checkLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500', flex: 1 },
  checkLabelDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  joinBtn: { height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  joinBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  joinDisabledBtn: { height: 54, borderRadius: 16, backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  joinDisabledText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  actionBtn: { height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  cancelBtn: { height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.danger, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: Colors.danger },
});
