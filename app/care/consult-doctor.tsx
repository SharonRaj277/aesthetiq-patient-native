import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { MOCK_DOCTORS } from '../../constants/mockData';
import AvatarCircle from '../../components/AvatarCircle';

const SPECS = ['All', 'Dermatologist', 'Aesthetic Dentist', 'Aesthetic Physician', 'Orthodontist'];

export default function ConsultDoctorScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('All');

  const filtered = MOCK_DOCTORS.filter((d) => {
    const matchesSearch =
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization.toLowerCase().includes(search.toLowerCase());
    const matchesSpec = selectedSpec === 'All' || d.specialization === selectedSpec;
    return matchesSearch && matchesSpec;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Find a Doctor</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={{ fontSize: 18 }}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors or specialization..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Text style={{ fontSize: 16, color: Colors.textMuted }}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Specialization Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.specsRow}>
          {SPECS.map((s) => (
            <Pressable
              key={s}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedSpec(s); }}
              android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}
              style={[styles.specChip, selectedSpec === s && styles.specChipActive]}
            >
              <Text style={[styles.specChipText, selectedSpec === s && styles.specChipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Results */}
        <Text style={styles.resultsLabel}>{filtered.length} doctor{filtered.length !== 1 ? 's' : ''} found</Text>

        {filtered.map((doc) => (
          <Pressable
            key={doc.id}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/care/doctor-profile', params: { doctorId: doc.id } }); }}
            android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
            style={styles.doctorCard}
          >
            {/* Top Row */}
            <View style={styles.cardTop}>
              <AvatarCircle name={doc.name} size={60} onlineDot={doc.isOnline} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.docName}>{doc.name}</Text>
                <Text style={styles.docSpec}>{doc.specialization}</Text>
                <Text style={styles.docQual}>{doc.qualification}</Text>
                <View style={styles.docMeta}>
                  <Text style={styles.docRating}>⭐ {doc.rating}</Text>
                  <Text style={styles.docMetaDivider}>·</Text>
                  <Text style={styles.docExp}>{doc.experience} yrs</Text>
                  <Text style={styles.docMetaDivider}>·</Text>
                  <Text style={styles.docLang}>{doc.languages[0]}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.docFee}>₹{doc.fee.toLocaleString('en-IN')}</Text>
                <Text style={styles.docFeeUnit}>/consult</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Bottom Row */}
            <View style={styles.cardBottom}>
              <View style={styles.slotBadge}>
                <Text style={[styles.slotText, { color: doc.isOnline ? Colors.success : Colors.warning }]}>
                  {doc.isOnline ? '🟢 Available today' : `📅 ${doc.availableSlots[0]?.date || 'Tomorrow'}`}
                </Text>
              </View>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: '/care/doctor-profile', params: { doctorId: doc.id } }); }}
                android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
                style={{ borderRadius: 14, overflow: 'hidden' }}
              >
                <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.bookNowBtn}>
                  <Text style={styles.bookNowText}>Book Now</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        ))}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>🔍</Text>
            <Text style={styles.emptyText}>No doctors found</Text>
            <Pressable onPress={() => { setSearch(''); setSelectedSpec('All'); }}>
              <Text style={styles.clearFilters}>Clear filters</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.textPrimary },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: Colors.cardBg, borderRadius: 16, paddingHorizontal: 14, height: 52, gap: 10, borderWidth: 1.5, borderColor: Colors.borderLight, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  specsRow: { paddingHorizontal: 20, gap: 8, marginBottom: 14 },
  specChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: Colors.cardBg },
  specChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  specChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  specChipTextActive: { color: '#fff' },
  resultsLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginHorizontal: 20, marginBottom: 12 },
  doctorCard: { marginHorizontal: 20, marginBottom: 14, backgroundColor: Colors.cardBg, borderRadius: 22, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight, ...Colors.shadow.small },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  docName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  docSpec: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  docQual: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  docMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  docRating: { fontSize: 12, fontWeight: '600', color: Colors.warning },
  docMetaDivider: { fontSize: 12, color: Colors.textMuted },
  docExp: { fontSize: 12, color: Colors.textMuted },
  docLang: { fontSize: 12, color: Colors.textMuted },
  docFee: { fontSize: 16, fontWeight: '900', color: Colors.primary },
  docFeeUnit: { fontSize: 11, color: Colors.textMuted },
  cardDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 12 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slotBadge: {},
  slotText: { fontSize: 13, fontWeight: '700' },
  bookNowBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14 },
  bookNowText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  clearFilters: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
});
