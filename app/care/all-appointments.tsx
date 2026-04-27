import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { MOCK_APPOINTMENTS } from '../../constants/mockData';
import AvatarCircle from '../../components/AvatarCircle';

type FilterTab = 'Upcoming' | 'Completed' | 'Cancelled';

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function AllAppointmentsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterTab>('Upcoming');

  const filtered = MOCK_APPOINTMENTS.filter((a) => a.status === filter.toLowerCase() || (filter === 'Upcoming' && a.status === 'upcoming'));

  const renderUpcomingCard = (appt: typeof MOCK_APPOINTMENTS[0]) => {
    const minsUntil = Math.floor((appt.slotTime.getTime() - Date.now()) / 60000);
    const isToday = minsUntil < 24 * 60;
    const isJoinable = minsUntil <= 15 && minsUntil >= -30;

    return (
      <Pressable
        key={appt.id}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/care/appointment-detail', params: { apptId: appt.id } }); }}
        android_ripple={{ color: isToday ? 'rgba(255,255,255,0.15)' : 'rgba(124,58,237,0.08)' }}
        style={{ marginBottom: 14 }}
      >
        {isToday ? (
          <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.upcomingCardGrad}>
            <View style={styles.cardTopRow}>
              <AvatarCircle name={appt.doctorName} size={48} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.docNameWhite}>{appt.doctorName}</Text>
                <Text style={styles.specWhite}>{appt.doctorSpecialization}</Text>
                <Text style={styles.treatWhite}>{appt.treatmentName}</Text>
                <Text style={styles.timeWhite}>{fmtDate(appt.slotTime)}</Text>
              </View>
              {isJoinable && <View style={styles.pulsingDot} />}
            </View>
            {isJoinable ? (
              <Pressable
                onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
                android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                style={{ borderRadius: 12, overflow: 'hidden', marginTop: 12 }}
              >
                <LinearGradient colors={['#15803D', '#22C55E']} style={styles.joinBtn}>
                  <Text style={styles.joinBtnText}>🎥  Join Call Now</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Text style={styles.joinAvail}>Available to join 15 min before</Text>
            )}
          </LinearGradient>
        ) : (
          <View style={styles.upcomingCard}>
            <View style={styles.cardTopRow}>
              <AvatarCircle name={appt.doctorName} size={48} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.docName}>{appt.doctorName}</Text>
                <Text style={styles.docSpec}>{appt.doctorSpecialization}</Text>
                <Text style={styles.treatName}>{appt.treatmentName}</Text>
                <Text style={styles.apptTime}>{fmtDate(appt.slotTime)}</Text>
              </View>
              <View style={styles.confirmedBadge}><Text style={styles.confirmedText}>Confirmed</Text></View>
            </View>
            <View style={styles.cardActions}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/care/appointment-detail', params: { apptId: appt.id } }); }}
                android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
                style={styles.detailBtn}
              >
                <Text style={styles.detailBtnText}>View Details</Text>
              </Pressable>
              <Pressable
                onPress={() => Alert.alert('Reschedule', 'Reschedule functionality coming soon.')}
                android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
                style={styles.rescheduleBtn}
              >
                <Text style={styles.rescheduleBtnText}>Reschedule</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  const renderCompletedCard = (appt: typeof MOCK_APPOINTMENTS[0]) => (
    <Pressable
      key={appt.id}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/care/post-call-summary', params: { apptId: appt.id } }); }}
      android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
      style={[styles.upcomingCard, { marginBottom: 14 }]}
    >
      <View style={styles.cardTopRow}>
        <AvatarCircle name={appt.doctorName} size={48} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.docName}>{appt.doctorName}</Text>
          <Text style={styles.docSpec}>{appt.doctorSpecialization}</Text>
          <Text style={styles.apptTime}>{fmtDate(appt.slotTime)}</Text>
        </View>
        {appt.doctorDecision && (
          <View style={[styles.decisionBadge, { backgroundColor: appt.doctorDecision === 'approved' ? '#F0FDF4' : '#FFFBEB' }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: appt.doctorDecision === 'approved' ? Colors.success : Colors.warning }}>
              {appt.doctorDecision === 'approved' ? '✅ Approved' : '⚠️ Modified'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.cardActions}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/care/post-call-summary', params: { apptId: appt.id } }); }}
          android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
          style={styles.detailBtn}
        >
          <Text style={styles.detailBtnText}>View Summary</Text>
        </Pressable>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/care/rating', params: { apptId: appt.id, doctorId: appt.doctorId } }); }}
          android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
          style={styles.rescheduleBtn}
        >
          <Text style={styles.rescheduleBtnText}>Rate ⭐</Text>
        </Pressable>
      </View>
    </Pressable>
  );

  const renderCancelledCard = (appt: typeof MOCK_APPOINTMENTS[0]) => (
    <View key={appt.id} style={[styles.upcomingCard, { marginBottom: 14, opacity: 0.75 }]}>
      <View style={styles.cardTopRow}>
        <AvatarCircle name={appt.doctorName} size={48} colors={['#9CA3AF', '#6B7280']} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.docName}>{appt.doctorName}</Text>
          <Text style={styles.docSpec}>{appt.doctorSpecialization}</Text>
          <Text style={styles.apptTime}>{fmtDate(appt.slotTime)}</Text>
        </View>
        <View style={[styles.decisionBadge, { backgroundColor: '#FEF2F2' }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.danger }}>Cancelled</Text>
        </View>
      </View>
      {appt.refundStatus && (
        <View style={styles.refundRow}>
          <Text style={styles.refundText}>
            {appt.refundStatus === 'processed' ? '💚 Refund Processed' : appt.refundStatus === 'pending' ? '🟡 Refund Pending' : '🔴 No Refund'}
          </Text>
        </View>
      )}
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/care/consult-doctor'); }}
        android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
        style={styles.detailBtn}
      >
        <Text style={styles.detailBtnText}>Book Again</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['Upcoming', 'Completed', 'Cancelled'] as FilterTab[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter(f); }}
            android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {MOCK_APPOINTMENTS.filter((a) => a.status === filter.toLowerCase()).length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>📋</Text>
            <Text style={styles.emptyText}>No {filter.toLowerCase()} appointments</Text>
            {filter === 'Upcoming' && (
              <Pressable onPress={() => router.push('/care/consult-doctor')} android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}>
                <Text style={styles.bookCta}>Book a consultation →</Text>
              </Pressable>
            )}
          </View>
        )}
        {MOCK_APPOINTMENTS.filter((a) => a.status === filter.toLowerCase()).map((appt) =>
          filter === 'Upcoming' ? renderUpcomingCard(appt) :
          filter === 'Completed' ? renderCompletedCard(appt) :
          renderCancelledCard(appt)
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.textPrimary },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  filterRow: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: Colors.cardBg, borderRadius: 16, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: Colors.borderLight },
  filterTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  filterTabActive: { backgroundColor: Colors.primary },
  filterTabText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  filterTabTextActive: { color: '#fff' },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  upcomingCardGrad: { borderRadius: 22, padding: 16 },
  upcomingCard: { backgroundColor: Colors.cardBg, borderRadius: 22, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight, ...Colors.shadow.small },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  docNameWhite: { fontSize: 15, fontWeight: '800', color: '#fff' },
  specWhite: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  treatWhite: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: '600' },
  timeWhite: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  pulsingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#fff' },
  docName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  docSpec: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  treatName: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  apptTime: { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  confirmedBadge: { backgroundColor: Colors.primaryBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  confirmedText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  decisionBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  detailBtn: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  detailBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  rescheduleBtn: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  rescheduleBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  joinBtn: { height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  joinBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  joinAvail: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 10 },
  refundRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  refundText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  bookCta: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
});
