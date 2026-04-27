import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

// ─── Notification types ───────────────────────────────────────────
type NotifCategory = 'appointment' | 'treatment' | 'prescription' | 'report' | 'system';

interface Notification {
  id: string;
  category: NotifCategory;
  icon: string;
  tint: string;
  title: string;
  body: string;
  time: string;       // display string e.g. "2 hours ago"
  read: boolean;
  actionLabel?: string;
  actionRoute?: string;
}

// ─── Route map — single source of truth for every notification type ─
//
// Each category maps to the screen that makes most sense for the patient:
//   prescription  → doctor-treatment-plan  (doctor's full plan + meds)
//   treatment     → doctor-treatment-plan  (plan phases + session tracker)
//   report        → ai-report              (AI scan report)
//   appointment   → care/all-appointments  (appointment list)
//   system        → scan/type-selection    (onboarding / start scan)

const CATEGORY_DEFAULT_ROUTE: Record<NotifCategory, string> = {
  prescription: '/(tabs)/reports?filter=prescription',
  treatment:    '/doctor-treatment-plan',
  report:       '/ai-report',
  appointment:  '/care/all-appointments',
  system:       '/scan/type-selection',
};

// ─── Mock data ─────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    category: 'appointment',
    icon: '📅',
    tint: '#7C3AED',
    title: 'Appointment Confirmed',
    body: 'Your appointment with Dr. Priya Sharma has been confirmed for tomorrow at 11:00 AM.',
    time: '2 hours ago',
    read: false,
    actionLabel: 'View Appointment',
    actionRoute: '/care/appointment-detail',
  },
  {
    id: 'n2',
    category: 'prescription',
    icon: '💊',
    tint: '#0EA5E9',
    title: 'New Prescription Received',
    body: 'Dr. Rajan Mehta has sent you a prescription: Clindamycin Gel 1% + Adapalene 0.1%. Tap to view details.',
    time: '5 hours ago',
    read: false,
    actionLabel: 'View Prescription',
    actionRoute: '/(tabs)/reports?filter=prescription',
  },
  {
    id: 'n3',
    category: 'treatment',
    icon: '✨',
    tint: '#EC4899',
    title: 'Treatment Plan Ready',
    body: 'Dr. Priya Sharma has shared a personalised treatment plan for your skin concerns. Includes 3 sessions of RF Microneedling.',
    time: '1 day ago',
    read: false,
    actionLabel: 'View Plan',
    actionRoute: '/doctor-treatment-plan',
  },
  {
    id: 'n4',
    category: 'appointment',
    icon: '⏰',
    tint: '#F59E0B',
    title: 'Appointment Reminder',
    body: 'Reminder: You have an appointment with Dr. Ananya Iyer tomorrow at 3:00 PM for a Skin Consultation.',
    time: '1 day ago',
    read: true,
    actionLabel: 'View Details',
    actionRoute: '/care/appointment-detail',
  },
  {
    id: 'n5',
    category: 'report',
    icon: '📊',
    tint: '#10B981',
    title: 'Scan Report Ready',
    body: 'Your Dental Health scan report is ready. Score: 91/100. Tap to view your full AI report.',
    time: '2 days ago',
    read: true,
    actionLabel: 'View Report',
    actionRoute: '/ai-report',
  },
  {
    id: 'n6',
    category: 'appointment',
    icon: '❌',
    tint: '#EF4444',
    title: 'Appointment Cancelled',
    body: 'Your appointment on Dec 15 with Dr. Vikram Das has been cancelled. You can rebook at any time.',
    time: '3 days ago',
    read: true,
    actionLabel: 'Rebook',
    actionRoute: '/care/consult-doctor',
  },
  {
    id: 'n7',
    category: 'treatment',
    icon: '🗓️',
    tint: '#8B5CF6',
    title: 'Upcoming Treatment Session',
    body: 'Session 2 of 3 for RF Microneedling is scheduled for Dec 22 at 10:30 AM. Please arrive 10 minutes early.',
    time: '3 days ago',
    read: true,
    actionLabel: 'View Schedule',
    actionRoute: '/care/appointment-detail',
  },
  {
    id: 'n8',
    category: 'prescription',
    icon: '📋',
    tint: '#0EA5E9',
    title: 'Follow-up Note from Doctor',
    body: 'Dr. Priya Sharma has added a follow-up note: "Continue sunscreen SPF 50 daily. Avoid retinol for 2 weeks post-peel."',
    time: '5 days ago',
    read: true,
    actionLabel: 'View Note',
    actionRoute: '/(tabs)/reports?filter=prescription',
  },
  {
    id: 'n9',
    category: 'report',
    icon: '🔓',
    tint: '#7C3AED',
    title: 'Report Unlocked',
    body: 'Your Skin Analysis report has been unlocked successfully. Transaction ID: TXN_8472AF.',
    time: '1 week ago',
    read: true,
    actionLabel: 'View Report',
    actionRoute: '/ai-report?unlocked=true',
  },
  {
    id: 'n10',
    category: 'system',
    icon: '🎉',
    tint: '#F97316',
    title: 'Welcome to AesthetiQ!',
    body: 'Your account is set up. Start with a facial scan to get your personalised AesthetiQ score.',
    time: '1 week ago',
    read: true,
    actionLabel: 'Start Scan',
    actionRoute: '/scan/type-selection',
  },
];

const CATEGORIES: { key: NotifCategory | 'all'; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'appointment',  label: 'Appointments' },
  { key: 'treatment',    label: 'Treatments' },
  { key: 'prescription', label: 'Prescriptions' },
  { key: 'report',       label: 'Reports' },
];

// ─── Notification Card ────────────────────────────────────────────
function NotifCard({
  notif, onTap,
}: {
  notif: Notification;
  onTap: (notif: Notification) => void;
}) {
  return (
    <Pressable
      onPress={() => onTap(notif)}
      android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
      style={({ pressed }) => [
        styles.card,
        !notif.read && styles.cardUnread,
        pressed && { opacity: 0.85 },
      ]}
    >
      {/* Unread indicator stripe */}
      {!notif.read && <View style={[styles.unreadBar, { backgroundColor: notif.tint }]} />}

      <View style={styles.cardInner}>
        {/* Icon */}
        <View style={[styles.iconBox, { backgroundColor: notif.tint + '18' }]}>
          <Text style={styles.iconText}>{notif.icon}</Text>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, !notif.read && styles.cardTitleUnread]} numberOfLines={1}>
              {notif.title}
            </Text>
            <Text style={styles.cardTime}>{notif.time}</Text>
          </View>
          <Text style={styles.cardBody} numberOfLines={3}>{notif.body}</Text>

          {/* Action chip — visual affordance showing where the tap leads */}
          {notif.actionLabel && (
            <View
              style={[styles.actionBtn, { borderColor: notif.tint + '55', backgroundColor: notif.tint + '0D' }]}
            >
              <Text style={[styles.actionBtnText, { color: notif.tint }]}>{notif.actionLabel} →</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────
export default function NotificationsCentreScreen() {
  const router = useRouter();
  const [notifs, setNotifs]         = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter]         = useState<NotifCategory | 'all'>('all');

  const unreadCount = notifs.filter((n) => !n.read).length;

  const filtered = filter === 'all'
    ? notifs
    : notifs.filter((n) => n.category === filter);

  const markAllRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Single handler: mark read + navigate to the correct screen.
  // actionRoute takes priority; if absent, falls back to the category default.
  const handleTap = (notif: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark as read immediately
    setNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));

    // Resolve destination
    const destination = notif.actionRoute ?? CATEGORY_DEFAULT_ROUTE[notif.category];
    if (destination) {
      router.push(destination as any);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#2E1065', '#7C3AED']} style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>🔔 Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 ? (
            <Pressable onPress={markAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          ) : (
            <View style={{ width: 80 }} />
          )}
        </View>

        {/* Category filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORIES.map((cat) => {
            const active = filter === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilter(cat.key);
                }}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔕</Text>
            <Text style={styles.emptyTitle}>No notifications here</Text>
            <Text style={styles.emptySub}>You're all caught up in this category.</Text>
          </View>
        ) : (
          filtered.map((notif) => (
            <NotifCard
              key={notif.id}
              notif={notif}
              onTap={handleTap}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F7' },

  header:       { paddingBottom: 14 },
  headerTop:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, marginBottom: 12 },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow:    { fontSize: 28, color: '#fff' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: '#fff' },
  unreadBadge:  { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  unreadBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  markAllBtn:   { paddingHorizontal: 10, paddingVertical: 6 },
  markAllText:  { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },

  filterRow:    { paddingHorizontal: 16, gap: 8, paddingBottom: 2 },
  filterPill:   { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  filterPillActive: { backgroundColor: '#fff' },
  filterPillText:   { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  filterPillTextActive: { color: '#7C3AED' },

  list: { paddingHorizontal: 16, paddingTop: 14 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 10,
    overflow: 'hidden', flexDirection: 'row',
    borderWidth: 1, borderColor: '#E5E5EA',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  cardUnread: { borderColor: '#DDD6FE', backgroundColor: '#FAFAFE' },
  unreadBar:  { width: 4, alignSelf: 'stretch' },
  cardInner:  { flex: 1, flexDirection: 'row', padding: 14, gap: 12 },

  iconBox:    { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  iconText:   { fontSize: 20 },

  cardContent:  { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  cardTitle:    { flex: 1, fontSize: 14, fontWeight: '500', color: '#3C3C43' },
  cardTitleUnread: { fontWeight: '700', color: '#1C1C1E' },
  cardTime:     { fontSize: 11, color: '#B0B0B8', flexShrink: 0 },
  cardBody:     { fontSize: 13, color: '#636366', lineHeight: 19 },

  actionBtn:    { alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, marginTop: 6 },
  actionBtnText:{ fontSize: 12, fontWeight: '700' },

  empty:      { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#3C3C43' },
  emptySub:   { fontSize: 14, color: '#8E8E93' },
});
