import React, { useState } from 'react';
import {
  View, Text, Switch, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

// ─── Data ─────────────────────────────────────────────────────────
const SECTIONS = [
  {
    title: 'Scans & Reports',
    items: [
      { key: 'scan_ready',      icon: 'scan-outline' as const,          tint: '#7C3AED', label: 'Scan Results Ready',       sub: 'When your AI report is available'          },
      { key: 'scan_reminder',   icon: 'calendar-outline' as const,       tint: '#0EA5E9', label: 'Scan Reminders',           sub: 'Monthly skin & dental check reminders'      },
      { key: 'report_unlock',   icon: 'lock-open-outline' as const,      tint: '#10B981', label: 'Report Unlocked',          sub: 'Confirmation when a report is unlocked'    },
    ],
  },
  {
    title: 'Appointments',
    items: [
      { key: 'appt_reminder',   icon: 'alarm-outline' as const,          tint: '#F59E0B', label: 'Appointment Reminders',    sub: '1 day and 1 hour before your appointment'  },
      { key: 'appt_confirmed',  icon: 'checkmark-circle-outline' as const,tint: '#10B981', label: 'Booking Confirmed',        sub: 'When a doctor confirms your booking'       },
      { key: 'appt_cancelled',  icon: 'close-circle-outline' as const,   tint: '#EF4444', label: 'Cancellations',            sub: 'If an appointment is rescheduled/cancelled' },
    ],
  },
  {
    title: 'Health & Wellness',
    items: [
      { key: 'health_tips',     icon: 'heart-outline' as const,          tint: '#EC4899', label: 'Health Tips',              sub: 'Weekly personalised skin & dental tips'    },
      { key: 'progress_alerts', icon: 'trending-up-outline' as const,    tint: '#8B5CF6', label: 'Progress Updates',         sub: 'When your score changes significantly'     },
    ],
  },
  {
    title: 'Promotions',
    items: [
      { key: 'offers',          icon: 'pricetag-outline' as const,       tint: '#F97316', label: 'Offers & Discounts',       sub: 'Special deals on consultations'            },
      { key: 'newsletter',      icon: 'mail-outline' as const,           tint: '#06B6D4', label: 'Newsletter',               sub: 'Monthly product & feature updates'         },
    ],
  },
];

const DEFAULT_STATE: Record<string, boolean> = {
  scan_ready: true, scan_reminder: true, report_unlock: true,
  appt_reminder: true, appt_confirmed: true, appt_cancelled: true,
  health_tips: false, progress_alerts: true,
  offers: false, newsletter: false,
};

// ─── Toggle Row ───────────────────────────────────────────────────
function ToggleRow({
  icon, tint, label, sub, value, onChange, isLast,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string; label: string; sub: string;
  value: boolean; onChange: (v: boolean) => void; isLast: boolean;
}) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={[styles.iconBox, { backgroundColor: tint + '18' }]}>
        <Ionicons name={icon} size={17} color={tint} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(v);
        }}
        trackColor={{ false: '#E5E5EA', true: '#7C3AED' }}
        thumbColor={Platform.OS === 'android' ? (value ? '#7C3AED' : '#fff') : undefined}
        ios_backgroundColor="#E5E5EA"
      />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState(DEFAULT_STATE);

  const toggle = (key: string, value: boolean) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const enabledCount = Object.values(settings).filter(Boolean).length;
  const totalCount   = Object.values(settings).length;

  const toggleAll = (on: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next: Record<string, boolean> = {};
    Object.keys(settings).forEach((k) => { next[k] = on; });
    setSettings(next);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backArrow}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>🔔 Notifications</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSub}>{enabledCount} of {totalCount} alerts enabled</Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* Master toggle */}
          <View style={styles.masterCard}>
            <Ionicons name="notifications-outline" size={20} color="#7C3AED" />
            <Text style={styles.masterLabel}>All Notifications</Text>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => toggleAll(enabledCount < totalCount)}
              style={[styles.masterBtn, enabledCount === totalCount && styles.masterBtnOff]}
            >
              <Text style={styles.masterBtnText}>
                {enabledCount === totalCount ? 'Disable All' : 'Enable All'}
              </Text>
            </Pressable>
          </View>

          {SECTIONS.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.card}>
                {section.items.map((item, i) => (
                  <ToggleRow
                    key={item.key}
                    icon={item.icon}
                    tint={item.tint}
                    label={item.label}
                    sub={item.sub}
                    value={settings[item.key] ?? false}
                    onChange={(v) => toggle(item.key, v)}
                    isLast={i === section.items.length - 1}
                  />
                ))}
              </View>
            </View>
          ))}

          <Text style={styles.note}>
            Push notification delivery depends on your device settings. Go to your phone's Settings → AesthetiQ to manage OS-level permissions.
          </Text>
          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F7' },

  header:    { paddingBottom: 20, paddingHorizontal: 20, paddingTop: 0 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 6 },
  backBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: '#fff' },
  headerTitle:{ fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  body: { paddingHorizontal: 20, paddingTop: 20 },

  masterCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 6,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  masterLabel:  { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  masterBtn:    { backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  masterBtnOff: { backgroundColor: '#EF4444' },
  masterBtnText:{ fontSize: 13, fontWeight: '700', color: '#fff' },

  section:      { marginTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8, marginLeft: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },

  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 12, minHeight: 56 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(60,60,67,0.1)' },
  iconBox:   { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowText:   { flex: 1, gap: 2 },
  rowLabel:  { fontSize: 15, fontWeight: '500', color: '#1C1C1E' },
  rowSub:    { fontSize: 12, color: '#8E8E93' },

  note: { fontSize: 12, color: '#8E8E93', lineHeight: 18, marginTop: 20, textAlign: 'center' },
});
