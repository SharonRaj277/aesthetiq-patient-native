import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
  TextInput, Alert, Linking, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

// ─── Contact channels ─────────────────────────────────────────────
const CHANNELS = [
  {
    icon: 'mail-outline' as const,
    tint: '#7C3AED',
    label: 'Email Support',
    sub: 'support@aesthetiq.in',
    action: () => Linking.openURL('mailto:support@aesthetiq.in?subject=AesthetiQ Support'),
  },
  {
    icon: 'logo-whatsapp' as const,
    tint: '#25D366',
    label: 'WhatsApp',
    sub: 'Chat with us on WhatsApp',
    action: () => Linking.openURL('https://wa.me/918000000000?text=Hi%2C%20I%20need%20help%20with%20AesthetiQ'),
  },
  {
    icon: 'call-outline' as const,
    tint: '#0EA5E9',
    label: 'Call Us',
    sub: 'Mon–Sat, 9 AM – 6 PM IST',
    action: () => Linking.openURL('tel:+918000000000'),
  },
];

// ─── Screen ───────────────────────────────────────────────────────
export default function ContactUsScreen() {
  const router = useRouter();
  const [subject, setSubject]   = useState('');
  const [message, setMessage]   = useState('');
  const [sending, setSending]   = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing Info', 'Please fill in both the subject and message fields.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSending(true);
    // Simulate send
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    setSubject('');
    setMessage('');
    Alert.alert('Message Sent ✓', 'Our support team will get back to you within 24 hours.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <LinearGradient colors={['#0E7490', '#06B6D4']} style={styles.header}>
            <View style={styles.headerTop}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backArrow}>‹</Text>
              </Pressable>
              <Text style={styles.headerTitle}>💬 Contact Us</Text>
              <View style={{ width: 40 }} />
            </View>
            <Text style={styles.headerSub}>We're here to help</Text>
          </LinearGradient>

          <View style={styles.body}>

            {/* Quick Contact Channels */}
            <Text style={styles.sectionTitle}>Reach Us Directly</Text>
            <View style={styles.channelsCard}>
              {CHANNELS.map((ch, i) => (
                <Pressable
                  key={ch.label}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    ch.action();
                  }}
                  android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
                  style={({ pressed }) => [
                    styles.channelRow,
                    i < CHANNELS.length - 1 && styles.rowBorder,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={[styles.channelIcon, { backgroundColor: ch.tint + '18' }]}>
                    <Ionicons name={ch.icon} size={18} color={ch.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.channelLabel}>{ch.label}</Text>
                    <Text style={styles.channelSub}>{ch.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
                </Pressable>
              ))}
            </View>

            {/* Message Form */}
            <Text style={styles.sectionTitle}>Send a Message</Text>
            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                placeholder="What's this about?"
                placeholderTextColor="#B0B0B8"
                value={subject}
                onChangeText={setSubject}
                maxLength={80}
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your issue or question in detail…"
                placeholderTextColor="#B0B0B8"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCount}>{message.length}/500</Text>

              <Pressable
                onPress={handleSend}
                disabled={sending}
                style={[styles.sendPressable, sending && { opacity: 0.6 }]}
              >
                <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.sendBtn}>
                  <Ionicons name={sending ? 'hourglass-outline' : 'send-outline'} size={16} color="#fff" />
                  <Text style={styles.sendBtnText}>{sending ? 'Sending…' : 'Send Message'}</Text>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Response Time */}
            <View style={styles.responseInfo}>
              <Ionicons name="time-outline" size={15} color="#8B5CF6" />
              <Text style={styles.responseText}>Average response time: <Text style={{ fontWeight: '700' }}>under 4 hours</Text></Text>
            </View>

            <View style={{ height: 60 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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

  body: { paddingHorizontal: 20, paddingTop: 16 },

  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8, marginTop: 20, marginLeft: 4 },

  channelsCard: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  channelRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, gap: 12 },
  rowBorder:   { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(60,60,67,0.1)' },
  channelIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  channelLabel:{ fontSize: 15, fontWeight: '500', color: '#1C1C1E' },
  channelSub:  { fontSize: 12, color: '#8E8E93', marginTop: 2 },

  formCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#3C3C43', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E5EA', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#1C1C1E',
    backgroundColor: '#FAFAFA',
  },
  textArea:  { height: 110, paddingTop: 10 },
  charCount: { fontSize: 11, color: '#B0B0B8', textAlign: 'right', marginTop: 4 },

  sendPressable: { marginTop: 14, borderRadius: 12, overflow: 'hidden' },
  sendBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48 },
  sendBtnText:   { fontSize: 15, fontWeight: '700', color: '#fff' },

  responseInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 16 },
  responseText: { fontSize: 13, color: '#8E8E93' },
});
