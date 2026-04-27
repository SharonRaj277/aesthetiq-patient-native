import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';

export default function TreatmentDisclaimerScreen() {
  const router = useRouter();
  const { treatmentName, nextRoute } = useLocalSearchParams<{ treatmentName: string; nextRoute: string }>();
  const [agreed, setAgreed] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Treatment Disclaimer</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.iconWrap}>
          <Text style={styles.icon}>📋</Text>
        </View>

        {treatmentName ? (
          <View style={styles.treatmentBadge}>
            <Text style={styles.treatmentBadgeText}>{treatmentName}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Important Notice</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            AesthetiQ provides AI-powered skin and facial analysis to help guide your aesthetic journey. However, our analysis and treatment recommendations are for informational purposes only and do not constitute medical advice, diagnosis, or treatment.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>What You Should Know</Text>
        {[
          { icon: '🤖', text: 'AI analysis may not be 100% accurate. Always consult a qualified professional.' },
          { icon: '👩‍⚕️', text: 'All treatments should be administered by licensed practitioners only.' },
          { icon: '⚕️', text: 'Results vary based on individual skin type, health history, and treatment adherence.' },
          { icon: '📸', text: 'Images and scan data are used only for analysis and are not shared without consent.' },
          { icon: '🚫', text: 'AesthetiQ is not responsible for outcomes of treatments chosen based on app recommendations.' },
        ].map((item, i) => (
          <View key={i} style={styles.disclaimerItem}>
            <Text style={styles.disclaimerEmoji}>{item.icon}</Text>
            <Text style={styles.disclaimerText}>{item.text}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Medical Conditions</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            If you have any underlying medical conditions, are pregnant, or are on prescription medication, please consult your doctor before undergoing any aesthetic treatment, regardless of tier level.
          </Text>
        </View>

        {/* Consent checkbox */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAgreed((v) => !v); }}
          android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
          style={styles.consentRow}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
            {agreed && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
          </View>
          <Text style={styles.consentText}>
            I understand and agree that AesthetiQ's recommendations are informational only and I take full responsibility for my treatment decisions.
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (!agreed) return;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push((nextRoute ?? '/care/consult-doctor') as any);
          }}
          disabled={!agreed}
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          style={{ borderRadius: 16, overflow: 'hidden', marginTop: 16, opacity: agreed ? 1 : 0.5 }}
        >
          <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.agreeBtn}>
            <Text style={styles.agreeBtnText}>I Agree & Continue →</Text>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.textPrimary },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  iconWrap: { alignItems: 'center', marginBottom: 12 },
  icon: { fontSize: 56 },
  treatmentBadge: { alignSelf: 'center', backgroundColor: Colors.primaryBg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, marginBottom: 16 },
  treatmentBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10, marginTop: 16 },
  card: { backgroundColor: Colors.cardBg, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight, marginBottom: 8 },
  bodyText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 22 },
  disclaimerItem: { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
  disclaimerEmoji: { fontSize: 18, marginTop: 1 },
  disclaimerText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  consentRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: Colors.cardBg, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight, marginTop: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  consentText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  agreeBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  agreeBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
