import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';

const SETUP_ITEMS = [
  { id: 's1', emoji: '🌑', text: 'In a dark room with no ambient light', required: true },
  { id: 's2', emoji: '📱', text: 'Phone fully charged (above 30%)', required: true },
  { id: 's3', emoji: '🧴', text: 'Face clean and product-free', required: true },
  { id: 's4', emoji: '🕶️', text: 'Glasses and accessories removed', required: false },
];

export default function SkinEnvironmentScreen() {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const allRequired = SETUP_ITEMS.filter((i) => i.required).every((i) => checked[i.id]);

  const toggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked((p) => ({ ...p, [id]: !p[id] }));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={['#1A1035', '#0D0A1A']} style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }} style={styles.backBtn}>
              <Text style={{ fontSize: 22, color: '#fff' }}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Set Up Your Environment</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSub}>
            The skin scan requires a dark environment for accurate multi-light capture.
          </Text>
          <View style={styles.darkRoomIndicator}>
            <Text style={styles.darkRoomEmoji}>🌑</Text>
            <Text style={styles.darkRoomText}>Dark Room Required</Text>
          </View>
        </LinearGradient>

        <Text style={styles.intro}>Check each item when ready:</Text>

        {SETUP_ITEMS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => toggle(item.id)}
            android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
            style={[styles.setupItem, checked[item.id] && styles.setupItemDone]}
          >
            <View style={[styles.checkbox, checked[item.id] && styles.checkboxDone]}>
              {checked[item.id] && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
            </View>
            <Text style={styles.setupEmoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.setupText, checked[item.id] && styles.setupTextDone]}>{item.text}</Text>
              {!item.required && <Text style={styles.optionalTag}>Optional</Text>}
            </View>
          </Pressable>
        ))}

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 Why dark room?</Text>
          <Text style={styles.tipText}>
            Multi-light skin scanning requires your screen to be the primary light source. Any ambient light will interfere with blue, green, and raking light captures, reducing accuracy.
          </Text>
        </View>

        <Pressable
          onPress={() => { if (allRequired) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.push('/scan/skin-multilight-guide'); } }}
          disabled={!allRequired}
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          style={{ borderRadius: 16, overflow: 'hidden', marginHorizontal: 20, opacity: allRequired ? 1 : 0.5 }}
        >
          <LinearGradient colors={['#EC4899', '#A855F7']} style={styles.readyBtn}>
            <Text style={styles.readyBtnText}>{allRequired ? "I'm Ready → Start Scan" : 'Check all required items'}</Text>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 20 },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 10 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  darkRoomIndicator: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16 },
  darkRoomEmoji: { fontSize: 40, marginBottom: 8 },
  darkRoomText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  intro: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginHorizontal: 20, marginTop: 20, marginBottom: 12 },
  setupItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1.5, borderColor: Colors.borderLight },
  setupItemDone: { borderColor: Colors.success + '60', backgroundColor: '#F0FDF4' },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  setupEmoji: { fontSize: 20 },
  setupText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  setupTextDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  optionalTag: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },
  tipCard: { marginHorizontal: 20, backgroundColor: Colors.primaryBg, borderRadius: 16, padding: 14, marginTop: 16, marginBottom: 20 },
  tipTitle: { fontSize: 13, fontWeight: '800', color: Colors.primary, marginBottom: 6 },
  tipText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 20 },
  readyBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  readyBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
