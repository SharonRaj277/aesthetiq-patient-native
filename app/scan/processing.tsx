import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { scanStore, scanImageStore } from '../../services/scanStore';
import { analyzeScan, type AnalyzeScanResponse } from '../../services/api';
import { Analytics } from '../../services/analytics';
import { saveScanToFirestore } from '../../hooks/useLiveScans';
import { uriToDataUri } from '../../services/api';
import { auth } from '../../config/firebase';

// ─── Domain-specific rotating messages ───────────────────────────
const DOMAIN_MESSAGES: Record<string, string[]> = {
  face: [
    'Analyzing facial symmetry...',
    'Mapping facial landmarks...',
    'Evaluating proportions and balance...',
    'Assessing jawline and profile...',
    'Generating your facial harmony report...',
  ],
  skin: [
    'Analyzing skin under multiple light conditions...',
    'Detecting acne and pigmentation patterns...',
    'Evaluating texture and pores...',
    'Cross-checking multi-light insights...',
    'Generating your skin health report...',
  ],
  dental: [
    'Analyzing your dental images...',
    'Evaluating teeth and gum condition...',
    'Mapping pain and symptom patterns...',
    'Identifying potential issues...',
    'Generating your dental report...',
  ],
};

// Progress checkpoints aligned to 5 messages (0–100)
const STAGE_PCTS = [15, 35, 58, 78, 92];

const GRADIENTS: Record<string, [string, string]> = {
  face:   ['#7C3AED', '#A855F7'],
  skin:   ['#6B21A8', '#BE185D'],
  dental: ['#0C4A6E', '#0369A1'],
};

const ANALYSIS_TAGS: Record<string, string[]> = {
  face:   ['Landmark Detection', 'Symmetry Analysis', 'Structure Mapping'],
  skin:   ['Multi-Light Analysis', 'Pigmentation Map', 'Barrier Assessment'],
  dental: ['Visual Screening', 'Symptom Correlation', 'Urgency Assessment'],
};

export default function ScanProcessingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const type = ((Array.isArray(params.type) ? params.type[0] : params.type) ?? 'face') as 'face' | 'skin' | 'dental';

  const messages   = DOMAIN_MESSAGES[type] ?? DOMAIN_MESSAGES.face;
  const tags       = ANALYSIS_TAGS[type]   ?? ANALYSIS_TAGS.face;

  // ── State ──────────────────────────────────────────────────────
  const [msgIdx, setMsgIdx]     = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [displayMsg, setDisplayMsg] = useState(messages[0]);

  // ── Animated values ────────────────────────────────────────────
  const progress  = useRef(new Animated.Value(0)).current;
  const pulse     = useRef(new Animated.Value(1)).current;
  const msgFade   = useRef(new Animated.Value(1)).current;

  // ── Helpers ────────────────────────────────────────────────────
  const animateTo = (pct: number, duration = 600) =>
    new Promise<void>((resolve) =>
      Animated.timing(progress, { toValue: pct, duration, useNativeDriver: false }).start(() => resolve())
    );

  const fadeMsg = (next: string) =>
    new Promise<void>((resolve) => {
      Animated.timing(msgFade, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
        setDisplayMsg(next);
        Animated.timing(msgFade, { toValue: 1, duration: 320, useNativeDriver: true }).start(() => resolve());
      });
    });

  // ── Main processing flow ────────────────────────────────────────
  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const pending          = scanStore.take();
    const imageUris        = pending?.imageUris ?? [];
    const faceMesh         = pending?.faceMesh ?? null;
    const contourAnalysis  = pending?.contourAnalysis ?? null;
    const hasLiDAR         = !!pending?.hasLiDAR;
    const depthEnhanced    = !!pending?.depthEnhanced;
    let cancelled          = false;

    const run = async () => {
      // Event 1: scan started
      Analytics.scanStarted({ scanType: type });

      // Show first message immediately
      await animateTo(STAGE_PCTS[0], 300);
      setStageIdx(0);

      let apiResult: AnalyzeScanResponse | null = null;
      let apiError: string | null = null;

      console.log('🚀 Sending scan to Cloud Function | type:', type, '| images:', imageUris.length);

      // Fire CF call in parallel with animations.
      // analyzeScan() calls Firebase Cloud Functions only.
      // In dev mode it falls back to a mock response — never crashes the UI.
      const apiPromise = analyzeScan(imageUris, type, undefined, {
        faceMesh,
        contourAnalysis,
        hasLiDAR,
        depthEnhanced,
      }).then((data) => {
        console.log('✅ analyzeScan result:', data.scanId);
        return data;
      }).catch((err) => {
        // Should never reach here given internal fallbacks, but guard anyway
        console.error('❌ analyzeScan unexpected error:', err);
        apiError = (err as any)?.message ?? 'Analysis failed';
        return null;
      });

      // Cycle through messages 1–4 with rotating captions
      for (let i = 1; i <= 4; i++) {
        // Wait 1.6 s between stages (gives 1.5–2 s per message feel)
        await new Promise<void>((r) => setTimeout(r, 1600));
        if (cancelled) return;

        // Fade message transition
        await fadeMsg(messages[i]);
        setMsgIdx(i);

        // Advance progress bar
        await animateTo(STAGE_PCTS[i]);
        setStageIdx(i);

        if (i < 4) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Wait for API to finish (may already be done)
      apiResult = await apiPromise;
      if (cancelled) return;

      // Attach mesh + contour client-side so the report renders depth-enhanced
      // visualisations even before the backend persists/echoes the new fields.
      if (apiResult && faceMesh) {
        apiResult = { ...apiResult, hasFaceMesh: true, faceMesh };
      }
      if (apiResult && contourAnalysis) {
        apiResult = {
          ...apiResult,
          contourAnalysis,
          hasLiDAR,
          depthEnhanced,
        };
      }

      // apiError is only set for unexpected failures; analyzeScan() already
      // falls back to mock internally, so apiResult will almost always be set.
      if (apiError && !apiResult) {
        Alert.alert(
          'Analysis Notice',
          'Could not complete analysis. Showing a simulated result.',
          [{ text: 'OK' }],
        );
      }

      // Complete animation
      await animateTo(100, 400);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Event 2: scan completed (fire before navigation)
      const completedScanId = apiResult?.scanId ?? (type === 'skin' ? 'scan2' : type === 'dental' ? 'scan3' : 'scan1');
      Analytics.scanCompleted({ scanId: completedScanId, scanType: type });

      // Persist scan to Firestore so doctor sees it in real-time (non-blocking, non-fatal).
      // Guard against undefined scanId — Firestore rejects undefined field values.
      if (apiResult && auth.currentUser) {
        const safeScanId = apiResult.scanId ?? `scan_${Date.now()}`;

        // Cache the first image as a data URI so simulateResult can use it later.
        // Fire-and-forget — failure here must not block navigation.
        if (imageUris[0]) {
          uriToDataUri(imageUris[0])
            .then((dataUri) => scanImageStore.set(safeScanId, dataUri))
            .catch((e) => console.warn('[scanImageStore] cache failed:', e));
        }
        saveScanToFirestore(auth.currentUser.uid, {
          scanId:   safeScanId,
          type:     apiResult.type     ?? type,
          summary:  apiResult.summary  ?? '',
          urgency:  apiResult.urgency  ?? '',
          concerns: apiResult.concerns ?? [],
          recommendedTreatments: (apiResult.recommendedTreatments ?? []).map((r) => ({
            name:     r.name,
            category: (r as any).category ?? '',
          })),
        });
      }

      // Final fade to "ready" message
      await fadeMsg('Your AI Report is Ready ✓');
      setIsComplete(true);

      // Pause 1.2 s then navigate
      await new Promise<void>((r) => setTimeout(r, 1200));
      if (cancelled) return;

      if (apiResult) {
        router.replace({
          pathname: '/ai-report',
          params: {
            scanId:   apiResult.scanId,
            type:     apiResult.type,
            _result:  JSON.stringify(apiResult),
          },
        });
      } else {
        // True last-resort: use mock scan IDs that ai-report already knows about
        const fallbackId = type === 'skin' ? 'scan2' : type === 'dental' ? 'scan3' : 'scan1';
        router.replace({ pathname: '/ai-report', params: { scanId: fallbackId, type } });
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  // ── Pulsing ring — stops when complete ────────────────────────
  useEffect(() => {
    if (isComplete) { pulse.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isComplete]);

  const widthPct = progress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const pct      = STAGE_PCTS[stageIdx] ?? (isComplete ? 100 : 0);
  const scanIcon = type === 'skin' ? '🧴' : type === 'dental' ? '🦷' : '😊';

  return (
    <LinearGradient colors={GRADIENTS[type] ?? GRADIENTS.face} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>

          {/* ── Pulsing icon circle ── */}
          <View style={styles.iconWrap}>
            <Animated.View style={[styles.pulseRing, {
              transform: [{ scale: pulse }],
              opacity: pulse.interpolate({ inputRange: [1, 1.12], outputRange: [0.3, 0] }),
            }]} />
            <View style={styles.iconCircle}>
              <Text style={styles.scanIcon}>{scanIcon}</Text>
              {isComplete && (
                <View style={styles.successBadge}>
                  <Text style={{ fontSize: 18 }}>✓</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Title ── */}
          <Text style={styles.title}>
            {isComplete ? 'Analysis Complete!' : 'Processing Your Scan'}
          </Text>

          {/* ── Rotating domain message (fades in/out) ── */}
          <Animated.Text style={[styles.rotatingMsg, { opacity: msgFade }]}>
            {displayMsg}
          </Animated.Text>

          {/* ── Progress bar ── */}
          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <Animated.View style={[styles.progressFill, { width: widthPct }]}>
                <View style={styles.progressShimmer} />
              </Animated.View>
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.progressPct}>{isComplete ? 100 : pct}%</Text>
            </View>
          </View>

          {/* ── Stage dots ── */}
          <View style={styles.dotsRow}>
            {messages.map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  i < stageIdx  && styles.dotDone,
                  i === stageIdx && styles.dotActive,
                  i === stageIdx && {
                    transform: [{ scale: pulse.interpolate({ inputRange: [1, 1.12], outputRange: [1, 1.3] }) }],
                  },
                  isComplete && styles.dotDone,
                ]}
              />
            ))}
          </View>

          {/* ── Domain-specific analysis tags ── */}
          <View style={styles.tagsWrap}>
            {tags.map((tag, i) => {
              const lit = isComplete || i <= stageIdx * 0.7;
              return (
                <View key={i} style={[styles.tag, lit && styles.tagActive]}>
                  <Text style={[styles.tagText, lit && styles.tagTextActive]}>
                    {lit ? '✓ ' : ''}{tag}
                  </Text>
                </View>
              );
            })}
          </View>

        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient:  { flex: 1 },
  safe:      { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Icon
  iconWrap:   { alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  pulseRing:  { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.35)' },
  iconCircle: { width: 116, height: 116, borderRadius: 58, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.45)' },
  scanIcon:   { fontSize: 58 },
  successBadge: { position: 'absolute', bottom: -4, right: -4, width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  // Text
  title:       { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 14 },
  rotatingMsg: { fontSize: 15, color: 'rgba(255,255,255,0.92)', textAlign: 'center', lineHeight: 24, marginBottom: 28, fontWeight: '600', minHeight: 50 },

  // Progress
  progressWrap:    { width: '100%', marginBottom: 8 },
  progressBg:      { width: '100%', height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 4, backgroundColor: '#fff', overflow: 'hidden', position: 'relative' },
  progressShimmer: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 40, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 4 },
  progressFooter:  { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6, marginBottom: 20 },
  progressPct:     { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Dots
  dotsRow:   { flexDirection: 'row', gap: 7, marginBottom: 28, alignItems: 'center' },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotDone:   { backgroundColor: 'rgba(255,255,255,0.6)' },
  dotActive: { width: 22, backgroundColor: '#fff', borderRadius: 4 },

  // Tags
  tagsWrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tag:           { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  tagActive:     { backgroundColor: 'rgba(255,255,255,0.88)' },
  tagText:       { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  tagTextActive: { color: Colors.primary },
});
