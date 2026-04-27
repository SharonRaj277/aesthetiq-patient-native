import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { MOCK_DOCTORS } from '../../constants/mockData';
import AvatarCircle from '../../components/AvatarCircle';

const QUICK_CHIPS = [
  { emoji: '😊', label: 'Very helpful' },
  { emoji: '🎯', label: 'Accurate diagnosis' },
  { emoji: '⚡', label: 'Quick response' },
  { emoji: '💬', label: 'Clear explanation' },
  { emoji: '🤝', label: 'Professional' },
  { emoji: '💝', label: 'Caring' },
];

export default function RatingScreen() {
  const router = useRouter();
  const { apptId, doctorId } = useLocalSearchParams<{ apptId?: string; doctorId?: string }>();
  const doctor = MOCK_DOCTORS.find((d) => d.id === doctorId) ?? MOCK_DOCTORS[0];

  const [stars, setStars] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const toggleChip = (label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]);
  };

  const handleSubmit = () => {
    if (stars === 0) { Alert.alert('Select Stars', 'Please rate your experience.'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Thank You!', '⭐ Rating submitted successfully.', [
      { text: 'OK', onPress: () => router.replace('/(tabs)') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Rate Experience</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Doctor Card */}
      <View style={styles.doctorCard}>
        <AvatarCircle name={doctor.name} size={60} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.docName}>{doctor.name}</Text>
          <Text style={styles.docSpec}>{doctor.specialization}</Text>
        </View>
      </View>

      {/* Stars */}
      <Text style={styles.sectionLabel}>How was your experience?</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Pressable
            key={s}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStars(s); }}
            hitSlop={8}
          >
            <Text style={[styles.star, s <= stars && styles.starFilled]}>★</Text>
          </Pressable>
        ))}
      </View>
      {stars > 0 && (
        <Text style={styles.starLabel}>
          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][stars]}
        </Text>
      )}

      {/* Quick Chips */}
      <Text style={styles.sectionLabel}>What did you like?</Text>
      <View style={styles.chipsWrap}>
        {QUICK_CHIPS.map((chip) => (
          <Pressable
            key={chip.label}
            onPress={() => toggleChip(chip.label)}
            android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}
            style={[styles.chip, selected.includes(chip.label) && styles.chipSelected]}
          >
            <Text style={styles.chipEmoji}>{chip.emoji}</Text>
            <Text style={[styles.chipLabel, selected.includes(chip.label) && styles.chipLabelSelected]}>{chip.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Comment */}
      <Text style={styles.sectionLabel}>Share your experience <Text style={styles.optional}>(optional)</Text></Text>
      <TextInput
        style={styles.commentInput}
        placeholder="Tell others about your experience..."
        placeholderTextColor={Colors.textMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        value={comment}
        onChangeText={setComment}
      />

      {/* Submit */}
      <Pressable
        onPress={handleSubmit}
        android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
        style={{ borderRadius: 16, overflow: 'hidden', marginHorizontal: 20, marginTop: 16 }}
      >
        <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.submitBtn}>
          <Text style={styles.submitBtnText}>Submit Rating</Text>
        </LinearGradient>
      </Pressable>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.textPrimary },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  doctorCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: Colors.cardBg, borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight, marginBottom: 4, ...Colors.shadow.small },
  docName: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  docSpec: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginHorizontal: 20, marginTop: 20, marginBottom: 12 },
  optional: { fontWeight: '400', color: Colors.textMuted },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  star: { fontSize: 40, color: Colors.borderLight },
  starFilled: { color: '#F59E0B' },
  starLabel: { textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: Colors.cardBg },
  chipSelected: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipLabelSelected: { color: Colors.primary },
  commentInput: { marginHorizontal: 20, backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, height: 100, fontSize: 14, color: Colors.textPrimary, borderWidth: 1.5, borderColor: Colors.borderLight },
  submitBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
