import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';
import AvatarCircle from '../components/AvatarCircle';
import { useUser } from '../contexts/UserContext';

const SKIN_TYPES = ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'];
const CONCERNS   = ['Acne', 'Pigmentation', 'Fine Lines', 'Pores', 'Dullness', 'Sensitivity', 'Redness', 'Dark Circles'];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user, updateProfile } = useUser();

  const [name,     setName]     = useState(user?.fullName ?? '');
  const [email,    setEmail]    = useState(user?.email    ?? '');
  const [dob,      setDob]      = useState('');
  const [skinType, setSkinType] = useState('');
  const [concerns, setConcerns] = useState<string[]>([]);
  const [photo,    setPhoto]    = useState<string | undefined>(user?.profileImage);
  const [loading,  setLoading]  = useState(false);

  const toggleConcern = (c: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConcerns((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  // ── Photo picker ──────────────────────────────────────────────────
  const handleChangePhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Change Photo',
      'Choose a source',
      [
        {
          text: 'Camera',
          onPress: () => pickImage('camera'),
        },
        {
          text: 'Photo Library',
          onPress: () => pickImage('library'),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera access is required to take a photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library access is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]?.uri) {
        setPhoto(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open image picker. Please try again.');
    }
  };

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Name Required', 'Please enter your name.'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    await updateProfile({ fullName: name.trim(), profileImage: photo });
    setLoading(false);
    Alert.alert('Saved!', 'Profile updated successfully.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backArrow}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Avatar with camera overlay */}
          <View style={styles.avatarSection}>
            <Pressable onPress={handleChangePhoto} style={styles.avatarPressable}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatarImg} />
              ) : (
                <AvatarCircle name={name || 'U'} size={88} borderWidth={3} borderColor={Colors.primary} />
              )}
              {/* Camera badge */}
              <View style={styles.cameraBadge}>
                <Text style={{ fontSize: 14 }}>📷</Text>
              </View>
            </Pressable>
            <Pressable onPress={handleChangePhoto}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </Pressable>
          </View>

          {/* Basic Info */}
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.card}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput style={styles.fieldInput} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={[styles.fieldRow, styles.fieldBorder]}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput style={styles.fieldInput} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="Email address" placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={[styles.fieldRow, styles.fieldBorder]}>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              <TextInput style={styles.fieldInput} value={dob} onChangeText={setDob} placeholder="DD / MM / YYYY" placeholderTextColor={Colors.textMuted} />
            </View>
          </View>

          {/* Skin Type */}
          <Text style={styles.sectionTitle}>Skin Type</Text>
          <View style={styles.chipWrap}>
            {SKIN_TYPES.map((s) => (
              <Pressable
                key={s}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSkinType(s); }}
                style={[styles.chip, skinType === s && styles.chipActive]}
              >
                <Text style={[styles.chipText, skinType === s && styles.chipTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>

          {/* Skin Concerns */}
          <Text style={styles.sectionTitle}>Skin Concerns</Text>
          <View style={styles.chipWrap}>
            {CONCERNS.map((c) => (
              <Pressable
                key={c}
                onPress={() => toggleConcern(c)}
                style={[styles.chip, concerns.includes(c) && styles.chipActive]}
              >
                <Text style={[styles.chipText, concerns.includes(c) && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          {/* Save */}
          <Pressable
            onPress={handleSave}
            disabled={loading}
            style={{ borderRadius: 16, overflow: 'hidden', marginTop: 24 }}
          >
            <LinearGradient colors={loading ? ['#D1D5DB', '#D1D5DB'] : ['#7C3AED', '#A855F7']} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
            </LinearGradient>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 16 },
  backBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.textPrimary },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },

  // Avatar
  avatarSection:   { alignItems: 'center', marginBottom: 24, gap: 10 },
  avatarPressable: { position: 'relative' },
  avatarImg: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: Colors.primary,
  },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 4,
  },
  changePhotoText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // Form
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10, marginTop: 20 },
  card:         { backgroundColor: Colors.cardBg, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.borderLight, overflow: 'hidden' },
  fieldRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  fieldBorder:  { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  fieldLabel:   { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, width: 100 },
  fieldInput:   { flex: 1, fontSize: 14, color: Colors.textPrimary },
  chipWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: Colors.cardBg },
  chipActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:     { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  saveBtn:      { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  saveBtnText:  { fontSize: 15, fontWeight: '800', color: '#fff' },
});
