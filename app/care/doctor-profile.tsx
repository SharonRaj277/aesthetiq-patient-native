import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { MOCK_DOCTORS } from '../../constants/mockData';
import AvatarCircle from '../../components/AvatarCircle';

const SPEC_GRADIENT: Record<string, [string, string]> = {
  Dermatologist: ['#EC4899', '#A855F7'],
  'Aesthetic Dentist': ['#0EA5E9', '#A855F7'],
  'Aesthetic Physician': ['#4C1D95', '#7C3AED'],
  Orthodontist: ['#0EA5E9', '#06B6D4'],
  Periodontist: ['#22C55E', '#16A34A'],
};

export default function DoctorProfileScreen() {
  const router = useRouter();
  const { doctorId } = useLocalSearchParams<{ doctorId?: string }>();
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const doc = MOCK_DOCTORS.find((d) => d.id === doctorId) ?? MOCK_DOCTORS[0];
  const gradient = SPEC_GRADIENT[doc.specialization] ?? ['#4C1D95', '#7C3AED'];
  const slots = doc.availableSlots[selectedDate]?.times ?? [];

  const handleBook = () => {
    if (!selectedTime) {
      Alert.alert('Select a Time', 'Please select an available time slot first.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: '/care/booking-confirmed',
      params: {
        doctorId: doc.id,
        doctorName: doc.name,
        slot: `${doc.availableSlots[selectedDate].date}, ${selectedTime}`,
        fee: doc.fee.toString(),
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Gradient Hero */}
        <LinearGradient colors={gradient} style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <View style={styles.heroTop}>
              <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }} style={styles.backBtn}>
                <Text style={{ fontSize: 22, color: '#fff' }}>‹</Text>
              </Pressable>
            </View>
            <Text style={styles.heroName}>{doc.name}</Text>
            <Text style={styles.heroSpec}>{doc.specialization}</Text>
            <Text style={styles.heroQual}>{doc.qualification}</Text>
          </SafeAreaView>
        </LinearGradient>

        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <AvatarCircle name={doc.name} size={80} borderWidth={4} borderColor="#fff" onlineDot={doc.isOnline} />
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          {doc.treatmentStats.map((stat, i) => (
            <View key={stat.label} style={[styles.statItem, i < doc.treatmentStats.length - 1 && styles.statBorder]}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.content}>
          {/* About */}
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <Text style={styles.aboutText} numberOfLines={expanded ? undefined : 3}>{doc.about}</Text>
            <Pressable onPress={() => setExpanded(!expanded)} android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}>
              <Text style={styles.showMore}>{expanded ? 'Show less ↑' : 'Show more ↓'}</Text>
            </Pressable>
          </View>

          {/* Languages */}
          <Text style={styles.sectionTitle}>Languages</Text>
          <View style={styles.chipWrap}>
            {doc.languages.map((l) => (
              <View key={l} style={styles.langChip}><Text style={styles.langChipText}>{l}</Text></View>
            ))}
          </View>

          {/* Treatments */}
          <Text style={styles.sectionTitle}>Specialises In</Text>
          <View style={styles.chipWrap}>
            {doc.treatments.map((t) => (
              <View key={t} style={styles.treatChip}><Text style={styles.treatChipText}>{t}</Text></View>
            ))}
          </View>

          {/* Date Selector */}
          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesRow}>
            {doc.availableSlots.map((slot, i) => (
              <Pressable
                key={i}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDate(i); setSelectedTime(null); }}
                android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}
                style={{ borderRadius: 16, overflow: 'hidden' }}
              >
                {i === selectedDate ? (
                  <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.dateChipActive}>
                    <Text style={styles.dateChipTextActive}>{slot.date}</Text>
                    <View style={styles.dateDot} />
                  </LinearGradient>
                ) : (
                  <View style={styles.dateChip}>
                    <Text style={styles.dateChipText}>{slot.date}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>

          {/* Time Slots */}
          <Text style={styles.sectionTitle}>Available Times</Text>
          <View style={styles.slotsGrid}>
            {slots.map((time) => (
              <Pressable
                key={time}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedTime(time); }}
                android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}
                style={{ borderRadius: 12, overflow: 'hidden' }}
              >
                {time === selectedTime ? (
                  <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.timeSlotActive}>
                    <Text style={styles.timeSlotTextActive}>{time}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.timeSlot}>
                    <Text style={styles.timeSlotText}>{time}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Booking CTA */}
      <View style={styles.stickyFooter}>
        <View style={{ flex: 1 }}>
          {selectedTime ? (
            <Text style={styles.selectedSlotText}>
              {doc.availableSlots[selectedDate]?.date} · {selectedTime}
            </Text>
          ) : (
            <Text style={styles.selectSlotHint}>Select a time slot above</Text>
          )}
          <Text style={styles.feeText}>₹{doc.fee.toLocaleString('en-IN')} consultation fee</Text>
        </View>
        <Pressable
          onPress={handleBook}
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          style={{ borderRadius: 14, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={selectedTime ? ['#7C3AED', '#A855F7'] : ['#D1D5DB', '#D1D5DB']}
            style={styles.confirmBtn}
          >
            <Text style={styles.confirmBtnText}>Confirm & Pay</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 60, alignItems: 'flex-start' },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroName: { fontSize: 24, fontWeight: '900', color: '#fff' },
  heroSpec: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '600' },
  heroQual: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  avatarWrapper: { alignSelf: 'center', marginTop: -40, marginBottom: 8, zIndex: 10 },
  statsCard: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: Colors.cardBg, borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight, marginBottom: 4, ...Colors.shadow.small },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderRightWidth: 1, borderRightColor: Colors.borderLight },
  statValue: { fontSize: 16, fontWeight: '900', color: Colors.primary },
  statLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight },
  aboutText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  showMore: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langChip: { backgroundColor: Colors.primaryBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 },
  langChipText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  treatChip: { backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: Colors.borderLight },
  treatChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  datesRow: { gap: 10 },
  dateChip: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: Colors.cardBg, alignItems: 'center' },
  dateChipText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  dateChipActive: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  dateChipTextActive: { fontSize: 13, fontWeight: '700', color: '#fff' },
  dateDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)', marginTop: 4 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeSlot: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.cardBg },
  timeSlotText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  timeSlotActive: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  timeSlotTextActive: { fontSize: 13, fontWeight: '700', color: '#fff' },
  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(248,247,255,0.97)', padding: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: Colors.borderLight, flexDirection: 'row', alignItems: 'center', gap: 14 },
  selectedSlotText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  selectSlotHint: { fontSize: 13, color: Colors.textMuted },
  feeText: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  confirmBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14 },
  confirmBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
