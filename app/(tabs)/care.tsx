import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { MOCK_APPOINTMENTS, MOCK_DOCTORS } from '../../constants/mockData';
import AvatarCircle from '../../components/AvatarCircle';

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function CareScreen() {
  const router = useRouter();
  const upcoming = MOCK_APPOINTMENTS.filter((a) => a.status === 'upcoming');
  const nextAppt = upcoming[0];
  const minsUntil = nextAppt ? Math.floor((nextAppt.slotTime.getTime() - Date.now()) / 60000) : null;
  const isJoinable = minsUntil !== null && minsUntil <= 15 && minsUntil >= -30;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.header}>
          <Text style={styles.headerTitle}>Care</Text>
          <Text style={styles.headerSub}>Your health appointments & consultations</Text>
        </LinearGradient>

        {/* Next Appointment Banner */}
        {nextAppt && (
          <View style={styles.nextApptCard}>
            <View style={styles.nextApptTop}>
              <AvatarCircle name={nextAppt.doctorName} size={52} onlineDot />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.nextApptDoctor}>{nextAppt.doctorName}</Text>
                <Text style={styles.nextApptTreatment}>{nextAppt.treatmentName}</Text>
                <Text style={styles.nextApptTime}>{fmtDate(nextAppt.slotTime)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: Colors.primaryBg }]}>
                <Text style={[styles.statusText, { color: Colors.primary }]}>Confirmed</Text>
              </View>
            </View>
            <View style={styles.nextApptActions}>
              {isJoinable ? (
                <Pressable
                  onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                  android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                  style={{ flex: 1, borderRadius: 14, overflow: 'hidden' }}
                >
                  <LinearGradient colors={['#15803D', '#22C55E']} style={styles.joinBtn}>
                    <Text style={styles.joinBtnText}>🎥  Join Call Now</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/care/appointment-detail', params: { apptId: nextAppt.id } }); }}
                  android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
                  style={[styles.viewBtn, { flex: 1 }]}
                >
                  <Text style={styles.viewBtnText}>View Details</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/care/all-appointments'); }}
                android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
                style={styles.allApptBtn}
              >
                <Text style={styles.allApptBtnText}>All →</Text>
              </Pressable>
            </View>
            {!isJoinable && minsUntil !== null && minsUntil > 0 && (
              <Text style={styles.joinAvailableText}>
                {minsUntil > 60
                  ? `Join available ${Math.floor(minsUntil / 60)}h ${minsUntil % 60}m before`
                  : `Join available in ${minsUntil - 15} min`}
              </Text>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/care/consult-doctor'); }}
            android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
            style={{ flex: 1, borderRadius: 20, overflow: 'hidden' }}
          >
            <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.quickActionBtn}>
              <Text style={styles.quickActionIcon}>👩‍⚕️</Text>
              <Text style={styles.quickActionLabel}>Book Consultation</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/care/all-appointments'); }}
            android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
            style={[styles.quickActionOutline, { flex: 1 }]}
          >
            <Text style={styles.quickActionIcon}>📋</Text>
            <Text style={[styles.quickActionLabel, { color: Colors.primary }]}>My Appointments</Text>
          </Pressable>
        </View>

        {/* Available Doctors */}
        <Text style={styles.sectionTitle}>Available Doctors</Text>
        {MOCK_DOCTORS.filter((d) => d.isOnline).map((doc) => (
          <Pressable
            key={doc.id}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/care/doctor-profile', params: { doctorId: doc.id } }); }}
            android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
            style={styles.doctorCard}
          >
            <AvatarCircle name={doc.name} size={56} onlineDot />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.docName}>{doc.name}</Text>
              <Text style={styles.docSpec}>{doc.specialization}</Text>
              <View style={styles.docMeta}>
                <Text style={styles.docRating}>⭐ {doc.rating}</Text>
                <Text style={styles.docExp}> · {doc.experience} yrs</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={styles.docFee}>₹{doc.fee.toLocaleString('en-IN')}</Text>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: '/care/doctor-profile', params: { doctorId: doc.id } }); }}
                android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
                style={{ borderRadius: 12, overflow: 'hidden' }}
              >
                <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.bookNowBtn}>
                  <Text style={styles.bookNowText}>Book</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        ))}

        {/* Offline Doctors */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Available Soon</Text>
        {MOCK_DOCTORS.filter((d) => !d.isOnline).map((doc) => (
          <Pressable
            key={doc.id}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/care/doctor-profile', params: { doctorId: doc.id } }); }}
            android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
            style={[styles.doctorCard, { opacity: 0.8 }]}
          >
            <AvatarCircle name={doc.name} size={56} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.docName}>{doc.name}</Text>
              <Text style={styles.docSpec}>{doc.specialization}</Text>
              <Text style={styles.docSlot}>📅 {doc.availableSlots[0]?.date || 'Tomorrow'}</Text>
            </View>
            <Text style={styles.docFee}>₹{doc.fee.toLocaleString('en-IN')}</Text>
          </Pressable>
        ))}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 20 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  nextApptCard: { margin: 16, backgroundColor: Colors.cardBg, borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: Colors.borderMid, ...Colors.shadow.medium },
  nextApptTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  nextApptDoctor: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  nextApptTreatment: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  nextApptTime: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  nextApptActions: { flexDirection: 'row', gap: 10 },
  joinBtn: { height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  joinBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  viewBtn: { height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  viewBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  allApptBtn: { width: 72, height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  allApptBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  joinAvailableText: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 10 },
  quickActions: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 8 },
  quickActionBtn: { height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 4 },
  quickActionOutline: { height: 80, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.borderMid, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: Colors.cardBg },
  quickActionIcon: { fontSize: 24 },
  quickActionLabel: { fontSize: 12, fontWeight: '700', color: '#fff', textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  doctorCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, backgroundColor: Colors.cardBg, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: Colors.borderLight, ...Colors.shadow.small },
  docName: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  docSpec: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  docMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  docRating: { fontSize: 12, fontWeight: '600', color: Colors.warning },
  docExp: { fontSize: 12, color: Colors.textMuted },
  docFee: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  docSlot: { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  bookNowBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12 },
  bookNowText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
