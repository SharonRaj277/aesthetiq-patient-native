import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/colors';

// ─── Types ────────────────────────────────────────────────────────
type ReportType = 'xray' | 'mri' | 'cbc' | 'blood' | 'prescription' | 'other';
type Uploader   = 'doctor' | 'patient';
type FilterKey  = 'all' | ReportType | 'doctor' | 'patient';

interface MedicalReport {
  id: string;
  type: ReportType;
  title: string;
  uploadedBy: Uploader;
  date: Date;
  uri?: string;
  doctorName?: string;
}

// ─── Static Data ──────────────────────────────────────────────────
const REPORT_META: Record<ReportType, { emoji: string; label: string; gradient: [string, string] }> = {
  xray:         { emoji: '🩻', label: 'X-Ray',        gradient: ['#0EA5E9', '#06B6D4'] },
  mri:          { emoji: '🧠', label: 'MRI',          gradient: ['#7C3AED', '#A855F7'] },
  cbc:          { emoji: '🩸', label: 'CBC',          gradient: ['#EF4444', '#F43F5E'] },
  blood:        { emoji: '🔬', label: 'Blood Test',   gradient: ['#F59E0B', '#DC2626'] },
  prescription: { emoji: '💊', label: 'Prescription', gradient: ['#22C55E', '#16A34A'] },
  other:        { emoji: '📄', label: 'Report',       gradient: ['#6B7280', '#4B5563'] },
};

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all',          label: 'All'          },
  { key: 'xray',         label: 'X-Ray'        },
  { key: 'mri',          label: 'MRI'          },
  { key: 'cbc',          label: 'CBC'          },
  { key: 'blood',        label: 'Blood Test'   },
  { key: 'prescription', label: 'Prescription' },
  { key: 'doctor',       label: 'By Doctor'    },
  { key: 'patient',      label: 'By Me'        },
];

const INITIAL_REPORTS: MedicalReport[] = [
  {
    id: '1', type: 'xray',  title: 'Chest X-Ray',
    uploadedBy: 'doctor',  doctorName: 'Dr. Ananya Krishnan',
    date: new Date('2025-03-10T10:30:00'),
  },
  {
    id: '2', type: 'cbc',   title: 'Complete Blood Count',
    uploadedBy: 'doctor',  doctorName: 'Dr. Ananya Krishnan',
    date: new Date('2025-03-08T09:15:00'),
  },
  {
    id: '3', type: 'mri',   title: 'Brain MRI Scan',
    uploadedBy: 'doctor',  doctorName: 'Dr. Rahul Mehta',
    date: new Date('2025-02-22T14:00:00'),
  },
  {
    id: '4', type: 'blood', title: 'Lipid Panel',
    uploadedBy: 'patient',
    date: new Date('2025-03-05T11:45:00'),
  },
  {
    id: '5', type: 'prescription', title: 'Prescription – Vitamin D',
    uploadedBy: 'doctor', doctorName: 'Dr. Ananya Krishnan',
    date: new Date('2025-03-01T16:20:00'),
  },
  {
    id: '6', type: 'blood', title: 'Thyroid Profile',
    uploadedBy: 'patient',
    date: new Date('2025-02-15T08:30:00'),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────
const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

// ─── Screen ───────────────────────────────────────────────────────
const VALID_FILTERS: FilterKey[] = ['all', 'xray', 'mri', 'cbc', 'blood', 'prescription', 'other', 'doctor', 'patient'];

export default function ReportsScreen() {
  // Read ?filter= param so deep links (e.g. notifications) can pre-select a tab
  const params       = useLocalSearchParams<{ filter?: string }>();
  const paramFilter  = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const initialFilter = (VALID_FILTERS.includes(paramFilter as FilterKey) ? paramFilter : 'all') as FilterKey;
  const [filter,  setFilter]  = useState<FilterKey>(initialFilter);
  const [reports, setReports] = useState<MedicalReport[]>(INITIAL_REPORTS);

  const filtered = reports.filter((r) => {
    if (filter === 'all')     return true;
    if (filter === 'doctor' || filter === 'patient') return r.uploadedBy === filter;
    return r.type === filter;
  });

  // ── Upload flow ──────────────────────────────────────────────
  const handleUpload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Upload Report', 'Select source', [
      { text: 'Photo Library', onPress: pickFromLibrary },
      { text: 'Camera',        onPress: pickFromCamera  },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      promptReportType(result.assets[0].uri);
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      promptReportType(result.assets[0].uri);
    }
  };

  const promptReportType = (uri: string) => {
    Alert.alert('Report Type', 'What type of report is this?', [
      { text: 'X-Ray',        onPress: () => saveReport('xray',         'X-Ray Report',            uri) },
      { text: 'MRI',          onPress: () => saveReport('mri',          'MRI Report',              uri) },
      { text: 'CBC',          onPress: () => saveReport('cbc',          'CBC Report',              uri) },
      { text: 'Blood Test',   onPress: () => saveReport('blood',        'Blood Test Report',       uri) },
      { text: 'Prescription', onPress: () => saveReport('prescription', 'Prescription',            uri) },
      { text: 'Other',        onPress: () => saveReport('other',        'Medical Report',          uri) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const saveReport = (type: ReportType, title: string, uri: string) => {
    const entry: MedicalReport = {
      id: Date.now().toString(),
      type, title, uri,
      uploadedBy: 'patient',
      date: new Date(),
    };
    setReports((prev) => [entry, ...prev]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Uploaded ✓', 'Your report has been added successfully.');
  };

  // ── Download ─────────────────────────────────────────────────
  const handleDownload = (report: MedicalReport) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (report.uri) {
      Linking.openURL(report.uri).catch(() =>
        Alert.alert('Download', `"${report.title}" is ready to save.`)
      );
    } else {
      Alert.alert('Download', `"${report.title}" will be downloaded to your device.`);
    }
  };

  const docCount     = reports.filter((r) => r.uploadedBy === 'doctor').length;
  const patientCount = reports.filter((r) => r.uploadedBy === 'patient').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Medical Reports</Text>
            <Text style={styles.headerSub}>{reports.length} reports available</Text>
          </View>
          <Pressable
            onPress={handleUpload}
            android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
            style={{ borderRadius: 14, overflow: 'hidden' }}
          >
            <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.uploadHeaderBtn}>
              <Text style={styles.uploadHeaderBtnText}>⬆ Upload</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total',     value: reports.length.toString(), color: Colors.primary },
            { label: 'From Doc',  value: docCount.toString(),       color: Colors.teal    },
            { label: 'By Me',     value: patientCount.toString(),   color: Colors.success },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Filters ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_TABS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(f.key);
              }}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Report Cards ── */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 44 }}>🗂️</Text>
            <Text style={styles.emptyText}>No reports found</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {filtered.map((report) => {
              const meta     = REPORT_META[report.type];
              const isDoctor = report.uploadedBy === 'doctor';
              return (
                <View key={report.id} style={styles.reportCard}>
                  {/* Icon */}
                  <LinearGradient colors={meta.gradient} style={styles.reportIcon}>
                    <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
                  </LinearGradient>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportTitle}>{report.title}</Text>

                    {/* Date + Time */}
                    <View style={styles.reportMetaRow}>
                      <Text style={styles.reportDate}>📅 {fmtDate(report.date)}</Text>
                      <Text style={styles.reportDot}>·</Text>
                      <Text style={styles.reportTime}>🕐 {fmtTime(report.date)}</Text>
                    </View>

                    {/* Uploader badge */}
                    <View style={[styles.uploaderBadge, isDoctor ? styles.doctorBadge : styles.patientBadge]}>
                      <Text style={[styles.uploaderText, { color: isDoctor ? '#0369A1' : '#6D28D9' }]}>
                        {isDoctor
                          ? `🩺 ${report.doctorName ?? 'Doctor'}`
                          : '👤 Uploaded by me'}
                      </Text>
                    </View>
                  </View>

                  {/* Download (doctor reports only) */}
                  {isDoctor && (
                    <Pressable
                      onPress={() => handleDownload(report)}
                      android_ripple={{ color: 'rgba(14,165,233,0.2)', borderless: true }}
                      style={styles.downloadBtn}
                    >
                      <LinearGradient colors={['#0EA5E9', '#06B6D4']} style={styles.downloadGrad}>
                        <Text style={{ fontSize: 14 }}>⬇</Text>
                      </LinearGradient>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 20 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary },
  headerSub:   { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  uploadHeaderBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  uploadHeaderBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Stats
  statsRow: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 20, marginBottom: 20,
  },
  statCard: {
    flex: 1, backgroundColor: Colors.cardBg, borderRadius: 16,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderLight,
    ...Colors.shadow.small,
  },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', marginTop: 2, textAlign: 'center' },

  // Filters
  filterRow:           { paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  filterChip:          { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: Colors.cardBg },
  filterChipActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText:      { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  filterChipTextActive:{ color: '#fff' },

  // Cards
  cardList: { paddingHorizontal: 20, gap: 12 },
  reportCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16,
    borderWidth: 1.5, borderColor: Colors.borderLight,
    ...Colors.shadow.small,
  },
  reportIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  reportTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  reportMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  reportDate: { fontSize: 11, color: Colors.textMuted },
  reportDot:  { fontSize: 11, color: Colors.textMuted },
  reportTime: { fontSize: 11, color: Colors.textMuted },
  uploaderBadge: {
    alignSelf: 'flex-start', marginTop: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  doctorBadge:  { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  patientBadge: { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
  uploaderText: { fontSize: 11, fontWeight: '700' },

  // Download
  downloadBtn:  { marginLeft: 4 },
  downloadGrad: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Empty state
  emptyState:  { alignItems: 'center', paddingVertical: 56, gap: 12 },
  emptyText:   { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  emptyAction: { fontSize: 14, color: Colors.primary, fontWeight: '700' },

  // Upload CTA
  uploadCta: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 24,
    backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16,
    borderWidth: 1.5, borderColor: Colors.borderLight, borderStyle: 'dashed',
  },
  uploadCtaTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  uploadCtaSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 2, lineHeight: 18 },
});
