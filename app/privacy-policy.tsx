import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect the following types of information:\n\n• Account Information: name, email address, phone number, and profile photo when you register.\n• Health Profile: conditions, medications, allergies, and lifestyle information you voluntarily provide.\n• Scan Images: photos captured during face, skin, and dental scans.\n• Usage Data: app interactions, feature usage, and crash reports (anonymised).\n• Device Information: device model, OS version, and app version for support purposes.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use your data to:\n\n• Generate AI-powered health reports and recommendations\n• Personalise your health insights over time\n• Enable doctor consultations and appointment booking\n• Send notifications you have opted into\n• Improve the accuracy and performance of our AI models\n• Comply with legal obligations\n\nWe do not use your data for advertising profiling or sell it to third parties.',
  },
  {
    title: '3. Scan Image Storage',
    body: 'Scan images are uploaded to our secure servers for AI processing only. Images are:\n\n• Encrypted in transit using TLS 1.3\n• Stored encrypted at rest on AWS servers (ap-south-1 region)\n• Automatically deleted within 30 days of upload\n• Never shared with third parties without your explicit consent',
  },
  {
    title: '4. Health Data Protection',
    body: 'Health data is treated with the highest level of sensitivity. We comply with applicable data protection laws. Your health profile data is:\n\n• Accessible only to you and (if you choose) your consulting doctor\n• Never included in AI training datasets without explicit anonymised consent\n• Protected by role-based access controls on our backend',
  },
  {
    title: '5. Sharing Your Data',
    body: 'We share your data only in the following circumstances:\n\n• With doctors you explicitly book a consultation with\n• With payment processors (Razorpay) for transaction processing — we do not store card details\n• With cloud infrastructure providers (AWS, Firebase) under strict data processing agreements\n• When required by law or valid legal process\n\nWe never sell your personal or health data.',
  },
  {
    title: '6. Data Retention',
    body: 'We retain your data as follows:\n\n• Account data: as long as your account is active\n• Health profile: as long as your account is active\n• Scan images: deleted within 30 days of upload\n• AI reports: retained for 12 months, then archived\n• Payment records: 7 years (statutory requirement)\n\nYou may request deletion of your account and associated data at any time.',
  },
  {
    title: '7. Your Rights',
    body: 'You have the right to:\n\n• Access all personal data we hold about you\n• Correct inaccurate data\n• Request deletion of your data\n• Export your data in a portable format\n• Withdraw consent for analytics at any time\n• Lodge a complaint with the relevant data protection authority\n\nExercise these rights via Settings → Privacy & Security, or email privacy@aesthetiq.in.',
  },
  {
    title: '8. Cookies & Analytics',
    body: 'The App uses anonymised analytics (Firebase Analytics) to understand how features are used. No personally identifiable information is included in analytics events. You can opt out in Settings → Notifications → Usage Analytics.',
  },
  {
    title: '9. Children\'s Privacy',
    body: 'AesthetiQ is not intended for users under 18. We do not knowingly collect data from minors. If you believe a minor has provided us with personal information, contact us at support@aesthetiq.in and we will delete it promptly.',
  },
  {
    title: '10. Changes to This Policy',
    body: 'We may update this Privacy Policy periodically. We will notify you of material changes via in-app notification and email. The "last updated" date at the top of this page reflects the most recent revision.',
  },
  {
    title: '11. Contact Us',
    body: 'For privacy-related enquiries:\n\nAesthetiQ Technologies Pvt. Ltd.\nprivacy@aesthetiq.in\n\nWe aim to respond to all privacy requests within 72 hours.',
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <LinearGradient colors={['#1E3A8A', '#2563EB']} style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backArrow}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>🛡️ Privacy Policy</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSub}>Last updated: April 2025</Text>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.intro}>
            At AesthetiQ, your privacy is fundamental to how we operate. This policy explains what data we collect, how we use it, and the choices you have.
          </Text>

          {SECTIONS.map((s) => (
            <View key={s.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{s.title}</Text>
              <Text style={styles.sectionBody}>{s.body}</Text>
            </View>
          ))}

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F7' },

  header:    { paddingBottom: 20, paddingHorizontal: 20, paddingTop: 0 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 6 },
  backBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: '#fff' },
  headerTitle:{ fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  body:  { paddingHorizontal: 20, paddingTop: 16 },
  intro: { fontSize: 14, color: '#636366', lineHeight: 22, marginBottom: 20 },

  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', marginBottom: 6 },
  sectionBody:  { fontSize: 14, color: '#636366', lineHeight: 22 },
});
