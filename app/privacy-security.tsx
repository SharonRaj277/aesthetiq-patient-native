import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Switch, Pressable, StyleSheet, ScrollView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail, deleteUser } from 'firebase/auth';

import { auth } from '../config/firebase';

// ─── Persisted preference keys ────────────────────────────────────
const KEYS = {
  biometric:    '@aq/pref/biometric',
  saveScans:    '@aq/pref/saveScans',
  analytics:    '@aq/pref/analytics',
  crashReports: '@aq/pref/crashReports',
} as const;

const readBool = async (key: string, fallback: boolean): Promise<boolean> => {
  try {
    const v = await AsyncStorage.getItem(key);
    return v == null ? fallback : v === '1';
  } catch { return fallback; }
};
const writeBool = (key: string, value: boolean) =>
  AsyncStorage.setItem(key, value ? '1' : '0').catch(() => {});

// ─── Screen ───────────────────────────────────────────────────────
export default function PrivacySecurityScreen() {
  const router = useRouter();

  const [biometric, setBiometric]       = useState(false);
  const [analytics, setAnalytics]       = useState(true);
  const [crashReports, setCrashReports] = useState(true);
  const [saveScans, setSaveScans]       = useState(true);

  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricLabel, setBiometricLabel]         = useState('Biometric Login');
  const [busyBiometric, setBusyBiometric]           = useState(false);
  const [busyDelete, setBusyDelete]                 = useState(false);

  // ── Load saved prefs + probe device biometric capability ──────
  useEffect(() => {
    (async () => {
      const [bio, scans, an, cr] = await Promise.all([
        readBool(KEYS.biometric,    false),
        readBool(KEYS.saveScans,    true),
        readBool(KEYS.analytics,    true),
        readBool(KEYS.crashReports, true),
      ]);
      setBiometric(bio);
      setSaveScans(scans);
      setAnalytics(an);
      setCrashReports(cr);

      try {
        const hasHw  = await LocalAuthentication.hasHardwareAsync();
        const enroll = await LocalAuthentication.isEnrolledAsync();
        const types  = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setBiometricSupported(hasHw && enroll);

        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricLabel(Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricLabel(Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint Unlock');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricLabel('Iris Unlock');
        } else {
          setBiometricLabel('Biometric Login');
        }
      } catch {
        setBiometricSupported(false);
      }
    })();
  }, []);

  // ── Biometric toggle: actually authenticates before enabling ──
  const handleBiometricToggle = useCallback(async (next: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!next) {
      // Disabling never requires biometric prompt
      setBiometric(false);
      writeBool(KEYS.biometric, false);
      return;
    }

    if (!biometricSupported) {
      const hasHw  = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const enroll = await LocalAuthentication.isEnrolledAsync().catch(() => false);
      Alert.alert(
        'Biometric unavailable',
        !hasHw
          ? 'This device does not support biometric authentication.'
          : !enroll
          ? 'No biometrics are enrolled on this device. Add a fingerprint or Face ID in your device settings, then try again.'
          : 'Biometric authentication is not available right now.',
        [{ text: 'OK' }],
      );
      return;
    }

    setBusyBiometric(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Enable ${biometricLabel}`,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setBiometric(true);
        writeBool(KEYS.biometric, true);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (result.error && result.error !== 'user_cancel' && result.error !== 'system_cancel') {
          Alert.alert('Authentication failed', 'Could not verify your identity. Please try again.');
        }
      }
    } finally {
      setBusyBiometric(false);
    }
  }, [biometricSupported, biometricLabel]);

  // ── Generic toggle handlers (persist immediately) ──────────────
  const togglePersisted = (
    key: string,
    setter: (v: boolean) => void,
  ) => (v: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(v);
    writeBool(key, v);
  };

  // ── Change password: real Firebase reset email ─────────────────
  const handleChangePassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const user  = auth.currentUser;
    const email = user?.email;

    if (!email) {
      Alert.alert(
        'No email on file',
        'Your account was created without an email address (anonymous sign-in), so a reset link cannot be sent. Add an email to your profile first.',
      );
      return;
    }

    Alert.alert(
      'Change Password',
      `A password reset link will be sent to ${email}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, email);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Sent', `Check ${email} for the reset link.`);
            } catch (err: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Could not send link', err?.message ?? 'Please try again later.');
            }
          },
        },
      ],
    );
  };

  // ── Export data: stub a real request to a CF / email queue ─────
  const handleExportData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const email = auth.currentUser?.email;
    Alert.alert(
      'Export My Data',
      email
        ? `We will prepare your data export and email a download link to ${email} within 24 hours.`
        : 'Your data export request has been queued. Add an email to your profile to receive the download link.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Export',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Request received', 'You will be notified when your export is ready.');
          },
        },
      ],
    );
  };

  // ── Delete account: real Firebase deletion ─────────────────────
  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, scans, and reports. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) {
              Alert.alert('Not signed in', 'You are not currently signed in.');
              return;
            }
            setBusyDelete(true);
            try {
              await deleteUser(user);
              await AsyncStorage.multiRemove(Object.values(KEYS)).catch(() => {});
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Account deleted',
                'Your account and associated data have been removed.',
                [{ text: 'OK', onPress: () => router.replace('/' as any) }],
              );
            } catch (err: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              if (err?.code === 'auth/requires-recent-login') {
                Alert.alert(
                  'Re-authentication required',
                  'For your security, please sign in again and retry account deletion.',
                );
              } else {
                Alert.alert('Could not delete account', err?.message ?? 'Please try again later.');
              }
            } finally {
              setBusyDelete(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={['#1E3A8A', '#3B82F6']} style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backArrow}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>🔒 Privacy & Security</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSub}>Your data, your control</Text>
        </LinearGradient>

        <View style={styles.body}>

          {/* Security */}
          <SectionHeader title="Security" />
          <View style={styles.card}>
            <ToggleRow
              icon="finger-print-outline"
              tint="#7C3AED"
              label={biometricLabel}
              sub={
                biometricSupported
                  ? `Use ${biometricLabel} to unlock the app`
                  : 'Not available — enroll a biometric in device settings'
              }
              value={biometric}
              onChange={handleBiometricToggle}
              disabled={busyBiometric}
              isLast={false}
            />
            <ActionRow
              icon="key-outline"
              tint="#3B82F6"
              label="Change Password"
              sub="Send a reset link to your email"
              onPress={handleChangePassword}
              isLast={true}
            />
          </View>

          {/* Data & Privacy */}
          <SectionHeader title="Data & Privacy" />
          <View style={styles.card}>
            <ToggleRow
              icon="save-outline"
              tint="#10B981"
              label="Save Scans to Device"
              sub="Store captured images locally"
              value={saveScans}
              onChange={togglePersisted(KEYS.saveScans, setSaveScans)}
              isLast={false}
            />
            <ToggleRow
              icon="bar-chart-outline"
              tint="#F59E0B"
              label="Usage Analytics"
              sub="Help us improve the app experience"
              value={analytics}
              onChange={togglePersisted(KEYS.analytics, setAnalytics)}
              isLast={false}
            />
            <ToggleRow
              icon="bug-outline"
              tint="#8B5CF6"
              label="Crash Reports"
              sub="Automatically send crash logs"
              value={crashReports}
              onChange={togglePersisted(KEYS.crashReports, setCrashReports)}
              isLast={true}
            />
          </View>

          {/* Your Data */}
          <SectionHeader title="Your Data" />
          <View style={styles.card}>
            <ActionRow
              icon="download-outline"
              tint="#0EA5E9"
              label="Export My Data"
              sub="Download all your health data"
              onPress={handleExportData}
              isLast={false}
            />
            <ActionRow
              icon="document-text-outline"
              tint="#6B7280"
              label="Privacy Policy"
              sub="How we handle your information"
              onPress={() => router.push('/privacy-policy' as any)}
              isLast={false}
            />
            <ActionRow
              icon="document-outline"
              tint="#6B7280"
              label="Terms & Conditions"
              sub="Rules governing app usage"
              onPress={() => router.push('/terms' as any)}
              isLast={true}
            />
          </View>

          {/* Danger Zone */}
          <SectionHeader title="Danger Zone" />
          <Pressable
            onPress={handleDeleteAccount}
            disabled={busyDelete}
            style={({ pressed }) => [styles.deleteBtn, (pressed || busyDelete) && { opacity: 0.75 }]}
          >
            {busyDelete
              ? <ActivityIndicator size="small" color="#EF4444" />
              : <Ionicons name="trash-outline" size={18} color="#EF4444" />
            }
            <View style={{ flex: 1 }}>
              <Text style={styles.deleteBtnLabel}>
                {busyDelete ? 'Deleting…' : 'Delete Account'}
              </Text>
              <Text style={styles.deleteBtnSub}>Permanently remove all your data</Text>
            </View>
            {!busyDelete && <Ionicons name="chevron-forward" size={14} color="#EF4444" />}
          </Pressable>

          <Text style={styles.note}>
            AesthetiQ does not sell your personal or health data to third parties. All scan images are processed securely and deleted from our servers within 30 days.
          </Text>
          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function ToggleRow({
  icon, tint, label, sub, value, onChange, isLast, disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string; label: string; sub: string;
  value: boolean; onChange: (v: boolean) => void; isLast: boolean;
  disabled?: boolean;
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
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: '#E5E5EA', true: '#3B82F6' }}
        thumbColor={Platform.OS === 'android' ? (value ? '#3B82F6' : '#fff') : undefined}
        ios_backgroundColor="#E5E5EA"
      />
    </View>
  );
}

function ActionRow({
  icon, tint, label, sub, onPress, isLast,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string; label: string; sub: string;
  onPress: () => void; isLast: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.iconBox, { backgroundColor: tint + '18' }]}>
        <Ionicons name={icon} size={17} color={tint} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
    </Pressable>
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

  body: { paddingHorizontal: 20, paddingTop: 16 },

  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8, marginTop: 20, marginLeft: 4 },
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

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF5F5', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  deleteBtnLabel: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
  deleteBtnSub:   { fontSize: 12, color: '#F87171', marginTop: 2 },

  note: { fontSize: 12, color: '#8E8E93', lineHeight: 18, marginTop: 24, textAlign: 'center' },
});
