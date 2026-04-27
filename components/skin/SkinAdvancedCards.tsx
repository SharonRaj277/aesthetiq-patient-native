/**
 * Phase 1 advanced skin scan visualisations.
 *
 * Renders the new optional fields surfaced by the upgraded analyzeScan prompt:
 *   • zoneScores     → SkinFaceHeatMap         (tappable face zones)
 *   • poreAnalysis   → PoreScoreCard
 *   • wrinkleMapping → WrinkleMapCard
 *   • overallSkinAge → SkinAgeBadge
 *   • hydrationAppearance → HydrationGauge
 *
 * Components are pure presentational — pass already-normalised data in.
 * Defensive about undefined fields so older Cloud Function deploys (without
 * the new keys) just hide the corresponding card.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import Svg, { Circle, Path, G, Line, Ellipse } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type {
  ZoneScores, ZoneScore, FaceZoneKey,
  PoreAnalysis, WrinkleMapping, OverallSkinAge, HydrationAppearance,
} from '../../services/api';
import type { FaceMeshResult } from '../../modules/arkit-face-mesh/src';

// ─── Shared colour helpers ────────────────────────────────────────

const scoreColor = (score: number): string => {
  if (score >= 90) return '#22C55E';
  if (score >= 70) return '#84CC16';
  if (score >= 50) return '#F59E0B';
  if (score >= 30) return '#F97316';
  return '#EF4444';
};

const wrinkleSeverityColor: Record<string, string> = {
  none:      'transparent',
  absent:    'transparent',
  fine:      '#FCD34D',
  subtle:    '#FCD34D',
  moderate:  '#F59E0B',
  prominent: '#F97316',
  deep:      '#EF4444',
};

// ─── Face zone hit-areas (path d= for SVG) ────────────────────────
// Coordinates are tuned for a 240×280 viewport.
const ZONE_PATHS: Record<FaceZoneKey, string> = {
  forehead:   'M 70 60 Q 120 30 170 60 L 170 100 Q 120 90 70 100 Z',
  leftCheek:  'M 70 130 Q 60 165 80 195 Q 105 200 110 170 Q 105 140 70 130 Z',
  rightCheek: 'M 170 130 Q 180 165 160 195 Q 135 200 130 170 Q 135 140 170 130 Z',
  nose:       'M 110 105 L 130 105 L 135 175 L 105 175 Z',
  underEye:   'M 80 110 Q 100 105 115 115 L 115 130 Q 95 130 80 125 Z M 125 115 Q 140 105 160 110 L 160 125 Q 145 130 125 130 Z',
  lips:       'M 100 200 Q 120 195 140 200 Q 130 215 120 215 Q 110 215 100 200 Z',
  chin:       'M 95 220 Q 120 250 145 220 Q 130 240 120 245 Q 110 240 95 220 Z',
  jawline:    'M 60 180 Q 75 240 120 260 Q 165 240 180 180 L 175 200 Q 145 250 120 255 Q 95 250 65 200 Z',
};

const ZONE_LABEL: Record<FaceZoneKey, string> = {
  forehead: 'Forehead', leftCheek: 'Left Cheek', rightCheek: 'Right Cheek',
  nose: 'Nose', chin: 'Chin', jawline: 'Jawline',
  underEye: 'Under-Eye', lips: 'Lips',
};

// ─── Personalized face map (projected mesh) ──────────────────────
// Projects the 1,220 ARKit vertices to 2D screen space and draws one convex
// hull polygon per zone, coloured by its score. Falls back gracefully — if
// any zone has no vertices the corresponding polygon is just skipped.

function projectMeshTo2D(
  vertices: { x: number; y: number; z: number }[],
  width = 240,
  height = 280,
  padding = 20,
): { pts: Array<{ x: number; y: number }>; ok: boolean } {
  if (!vertices.length) return { pts: [], ok: false };

  // ARKit local frame: +X right, +Y up, +Z toward camera. We orthographic-
  // project (drop Z) and flip Y because SVG Y grows downward.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of vertices) {
    if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  // Preserve aspect ratio by scaling on the smaller axis fit
  const sx = (width  - 2 * padding) / rangeX;
  const sy = (height - 2 * padding) / rangeY;
  const s  = Math.min(sx, sy);
  const offX = (width  - rangeX * s) / 2;
  const offY = (height - rangeY * s) / 2;

  const pts = vertices.map((v) => ({
    x: offX + (v.x - minX) * s,
    y: offY + (maxY - v.y) * s,   // flip Y
  }));
  return { pts, ok: true };
}

// Andrew's monotone-chain convex hull — O(n log n), good enough for 1,220 pts
function convexHull(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (points.length < 3) return points.slice();
  const sorted = [...points].sort((a, b) => (a.x - b.x) || (a.y - b.y));
  const cross = (
    o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number },
  ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: typeof sorted = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: typeof sorted = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

function pointsToPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 3) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
}

function PersonalizedFaceMap({
  mesh,
  zoneScores,
  onZonePress,
}: {
  mesh: FaceMeshResult;
  zoneScores: ZoneScores;
  onZonePress: (key: FaceZoneKey) => void;
}) {
  const projected = projectMeshTo2D(mesh.vertices);
  if (!projected.ok) return null;

  const zoneKeys = Object.keys(ZONE_PATHS) as FaceZoneKey[];

  // Outline = convex hull of ALL vertices (matches the user's actual face shape)
  const outlinePts = convexHull(projected.pts);
  const outlinePath = pointsToPath(outlinePts);

  return (
    <G>
      <Path d={outlinePath} stroke="#E5E5EA" strokeWidth={1.5} fill="none" />
      {zoneKeys.map((key) => {
        const indices = mesh.zoneVertexIndices[key] ?? [];
        if (!indices.length) return null;

        const zonePts = indices
          .map((i) => projected.pts[i])
          .filter(Boolean);
        if (zonePts.length < 3) return null;

        const hull = convexHull(zonePts);
        const path = pointsToPath(hull);
        const data = zoneScores[key];
        const fill = data ? scoreColor(data.score) : '#F1F1F4';
        const opacity = data ? 0.55 : 0.20;

        return (
          <Path
            key={key}
            d={path}
            fill={fill}
            fillOpacity={opacity}
            stroke={data ? scoreColor(data.score) : '#D1D1D6'}
            strokeWidth={1.2}
            onPress={() => onZonePress(key)}
          />
        );
      })}
    </G>
  );
}

// ─── Face heat map ────────────────────────────────────────────────

export function SkinFaceHeatMap({
  zoneScores,
  faceMesh,
}: {
  zoneScores: ZoneScores;
  faceMesh?: FaceMeshResult | null;
}) {
  const [active, setActive] = useState<FaceZoneKey | null>(null);
  const activeData: ZoneScore | undefined = active ? zoneScores[active] : undefined;

  const onZonePress = (key: FaceZoneKey) => {
    if (!zoneScores[key]) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActive(key);
  };

  const zoneKeys = Object.keys(ZONE_PATHS) as FaceZoneKey[];
  const hasMesh = !!(faceMesh && faceMesh.vertices?.length && faceMesh.zoneVertexIndices);

  return (
    <View style={styles.heatCard}>
      <Text style={styles.cardTitle}>Zone Analysis</Text>
      <Text style={styles.cardSub}>
        {hasMesh ? 'Mapped to your face — tap any area for details' : 'Tap any area for details'}
      </Text>

      <View style={{ alignItems: 'center', marginTop: 12 }}>
        <Svg width={240} height={280} viewBox="0 0 240 280">
          {hasMesh ? (
            <PersonalizedFaceMap
              mesh={faceMesh!}
              zoneScores={zoneScores}
              onZonePress={onZonePress}
            />
          ) : (
            <>
              <Ellipse cx={120} cy={140} rx={75} ry={110} stroke="#E5E5EA" strokeWidth={1.5} fill="none" />
              <G>
                {zoneKeys.map((key) => {
                  const data = zoneScores[key];
                  const fill = data ? scoreColor(data.score) : '#F1F1F4';
                  const opacity = data ? 0.55 : 0.25;
                  return (
                    <Path
                      key={key}
                      d={ZONE_PATHS[key]}
                      fill={fill}
                      fillOpacity={opacity}
                      stroke={data ? scoreColor(data.score) : '#D1D1D6'}
                      strokeWidth={1.2}
                      onPress={() => onZonePress(key)}
                    />
                  );
                })}
              </G>
            </>
          )}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { c: '#22C55E', l: '90+'   },
          { c: '#84CC16', l: '70-89' },
          { c: '#F59E0B', l: '50-69' },
          { c: '#F97316', l: '30-49' },
          { c: '#EF4444', l: '<30'   },
        ].map((s) => (
          <View key={s.l} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.c }]} />
            <Text style={styles.legendText}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* Bottom sheet with active zone details */}
      <Modal visible={!!active} transparent animationType="slide" onRequestClose={() => setActive(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setActive(null)}>
          <Pressable style={styles.sheet} onPress={() => { /* swallow */ }}>
            {active && activeData && (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>{ZONE_LABEL[active]}</Text>
                  <View style={[styles.severityPill, { backgroundColor: scoreColor(activeData.score) + '22', borderColor: scoreColor(activeData.score) }]}>
                    <Text style={[styles.severityText, { color: scoreColor(activeData.score) }]}>
                      {activeData.severity.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sheetScore}>{activeData.score}<Text style={styles.sheetScoreUnit}>/100</Text></Text>
                <Text style={styles.sheetLabel}>Primary Issue</Text>
                <Text style={styles.sheetText}>{activeData.primaryIssue}</Text>
                <Pressable style={styles.sheetClose} onPress={() => setActive(null)}>
                  <Text style={styles.sheetCloseText}>Close</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Pore score card ──────────────────────────────────────────────

const PORE_LEVEL: Record<string, { label: string; color: string }> = {
  minimal: { label: 'Minimal', color: '#22C55E' },
  small:   { label: 'Small',   color: '#84CC16' },
  medium:  { label: 'Medium',  color: '#F59E0B' },
  large:   { label: 'Large',   color: '#EF4444' },
};

export function PoreScoreCard({ data }: { data: PoreAnalysis }) {
  const ringRadius = 36;
  const circumference = 2 * Math.PI * ringRadius;
  const offset = circumference * (1 - data.overallScore / 100);
  const color = scoreColor(data.overallScore);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Pore Analysis</Text>

      <View style={styles.row}>
        {/* Ring */}
        <View style={{ width: 90, height: 90 }}>
          <Svg width={90} height={90}>
            <Circle cx={45} cy={45} r={ringRadius} stroke="#F1F1F4" strokeWidth={8} fill="none" />
            <Circle
              cx={45} cy={45} r={ringRadius}
              stroke={color} strokeWidth={8} fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 45 45)"
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.ringValue, { color }]}>{data.overallScore}</Text>
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: 14 }}>
          {(['foreheadPores', 'nosePores', 'cheekPores'] as const).map((k) => {
            const meta = PORE_LEVEL[data[k]] ?? PORE_LEVEL.medium;
            const label = k === 'foreheadPores' ? 'Forehead' : k === 'nosePores' ? 'Nose' : 'Cheeks';
            return (
              <View key={k} style={styles.miniRow}>
                <Text style={styles.miniLabel}>{label}</Text>
                <View style={[styles.miniBadge, { backgroundColor: meta.color + '22' }]}>
                  <Text style={[styles.miniBadgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.congestionBadge, { borderColor: data.congestion === 'none' ? '#22C55E' : data.congestion === 'mild' ? '#F59E0B' : '#EF4444' }]}>
        <Text style={styles.congestionText}>Congestion: {data.congestion}</Text>
      </View>
    </View>
  );
}

// ─── Wrinkle map card ─────────────────────────────────────────────

export function WrinkleMapCard({ data }: { data: WrinkleMapping }) {
  const ringRadius = 36;
  const circumference = 2 * Math.PI * ringRadius;
  const offset = circumference * (1 - data.overallScore / 100);
  const color = scoreColor(data.overallScore);

  // Each line is rendered only if its severity isn't 'none'/'absent'
  const lines: Array<{ key: string; coords: [number, number, number, number]; severity: string }> = [
    { key: 'foreheadLines',   coords: [70, 65,  170, 65 ],  severity: data.foreheadLines },
    { key: 'glabellarLines',  coords: [115, 88, 115, 105],  severity: data.glabellarLines },
    { key: 'crowsFeet',       coords: [55, 115, 70, 130],   severity: data.crowsFeet },
    { key: 'crowsFeetR',      coords: [170, 115, 185, 130], severity: data.crowsFeet },
    { key: 'nasolabialFolds', coords: [105, 175, 90, 215],  severity: data.nasolabialFolds },
    { key: 'nasolabialR',     coords: [135, 175, 150, 215], severity: data.nasolabialFolds },
    { key: 'marionette',      coords: [102, 220, 95, 240],  severity: data.marionette },
    { key: 'marionetteR',     coords: [138, 220, 145, 240], severity: data.marionette },
    { key: 'lipLines',        coords: [110, 198, 130, 198], severity: data.lipLines },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Wrinkle Map</Text>

      <View style={styles.row}>
        <View style={{ width: 110 }}>
          <Svg width={110} height={140} viewBox="0 0 240 280">
            <Ellipse cx={120} cy={140} rx={75} ry={110} stroke="#E5E5EA" strokeWidth={1.5} fill="none" />
            {lines.map((l) => {
              const c = wrinkleSeverityColor[l.severity];
              if (c === 'transparent') return null;
              return (
                <Line
                  key={l.key}
                  x1={l.coords[0]} y1={l.coords[1]}
                  x2={l.coords[2]} y2={l.coords[3]}
                  stroke={c} strokeWidth={3} strokeLinecap="round"
                />
              );
            })}
          </Svg>
        </View>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ width: 90, height: 90 }}>
            <Svg width={90} height={90}>
              <Circle cx={45} cy={45} r={ringRadius} stroke="#F1F1F4" strokeWidth={8} fill="none" />
              <Circle
                cx={45} cy={45} r={ringRadius}
                stroke={color} strokeWidth={8} fill="none"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 45 45)"
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={[styles.ringValue, { color }]}>{data.overallScore}</Text>
            </View>
          </View>
          <Text style={styles.miniLabel}>Wrinkle Score</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Skin age badge ───────────────────────────────────────────────

export function SkinAgeBadge({ data }: { data: OverallSkinAge }) {
  // We don't know the user's chronological age; the prompt provides
  // vsChronologicalNote which we surface verbatim. Tone is informational.
  const isLooking = /great|young|below|less than|under/i.test(data.vsChronologicalNote);
  return (
    <View style={[styles.skinAgeBadge, isLooking && styles.skinAgeBadgeGood]}>
      <Text style={[styles.skinAgeLabel, isLooking && { color: '#16A34A' }]}>SKIN AGE</Text>
      <Text style={[styles.skinAgeValue, isLooking && { color: '#16A34A' }]}>~{data.estimatedSkinAge}</Text>
      {isLooking && <Text style={styles.skinAgeBonus}>Looking great!</Text>}
    </View>
  );
}

// ─── Hydration indicator ──────────────────────────────────────────

const ZONE_HYDRATION_COLOR: Record<string, string> = {
  dry:    '#F97316',
  normal: '#22C55E',
  oily:   '#0EA5E9',
};

export function HydrationGauge({ data }: { data: HydrationAppearance }) {
  // Map the overall level onto a 0-100 axis for the bar
  const levelToPct: Record<HydrationAppearance['level'], number> = {
    dehydrated:    10,
    slightly_dry:  30,
    normal:        55,
    well_hydrated: 80,
    oily_surface:  95,
  };
  const pct = levelToPct[data.level];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Hydration</Text>

      {/* Gauge bar — three-segment colour scale */}
      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeSegment, { backgroundColor: '#FED7AA' }]} />
        <View style={[styles.gaugeSegment, { backgroundColor: '#BBF7D0' }]} />
        <View style={[styles.gaugeSegment, { backgroundColor: '#BAE6FD' }]} />
        <View style={[styles.gaugeMarker, { left: `${pct}%` }]} />
      </View>
      <View style={styles.gaugeScale}>
        <Text style={styles.gaugeScaleText}>Dehydrated</Text>
        <Text style={styles.gaugeScaleText}>Normal</Text>
        <Text style={styles.gaugeScaleText}>Oily</Text>
      </View>

      {/* T-zone vs Cheeks */}
      <View style={[styles.row, { marginTop: 14 }]}>
        <View style={styles.zoneCompare}>
          <Text style={styles.zoneCompareLabel}>T-Zone</Text>
          <View style={[styles.zoneCompareBadge, { backgroundColor: ZONE_HYDRATION_COLOR[data.tZone] + '22' }]}>
            <Text style={[styles.zoneCompareText, { color: ZONE_HYDRATION_COLOR[data.tZone] }]}>{data.tZone}</Text>
          </View>
        </View>
        <View style={styles.zoneCompare}>
          <Text style={styles.zoneCompareLabel}>Cheeks</Text>
          <View style={[styles.zoneCompareBadge, { backgroundColor: ZONE_HYDRATION_COLOR[data.cheeks] + '22' }]}>
            <Text style={[styles.zoneCompareText, { color: ZONE_HYDRATION_COLOR[data.cheeks] }]}>{data.cheeks}</Text>
          </View>
        </View>
      </View>

      {!!data.note && <Text style={styles.noteText}>{data.note}</Text>}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card:     { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E5E5EA' },
  heatCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'stretch' },

  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1C1C1E' },
  cardSub:   { fontSize: 12, color: '#8E8E93', marginTop: 2 },

  row: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },

  legend:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, color: '#636366', fontWeight: '600' },

  // bottom sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 30 },
  sheetHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle:    { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
  severityPill:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  severityText:  { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  sheetScore:      { fontSize: 44, fontWeight: '800', marginTop: 6, color: '#1C1C1E' },
  sheetScoreUnit:  { fontSize: 16, fontWeight: '600', color: '#8E8E93' },
  sheetLabel:      { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginTop: 12 },
  sheetText:       { fontSize: 14, color: '#3C3C43', marginTop: 4, lineHeight: 20 },
  sheetClose:      { marginTop: 22, alignSelf: 'center', paddingHorizontal: 28, paddingVertical: 10, backgroundColor: '#F2F2F7', borderRadius: 99 },
  sheetCloseText:  { fontSize: 14, fontWeight: '700', color: '#3C3C43' },

  // ring
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringValue:  { fontSize: 22, fontWeight: '800' },

  miniRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 3 },
  miniLabel:      { fontSize: 12, color: '#3C3C43', fontWeight: '600' },
  miniBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  miniBadgeText:  { fontSize: 10, fontWeight: '800' },

  congestionBadge: { alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  congestionText:  { fontSize: 11, fontWeight: '700', color: '#3C3C43', textTransform: 'capitalize' },

  // skin age
  skinAgeBadge:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: '#F2F2F7', alignItems: 'center' },
  skinAgeBadgeGood: { backgroundColor: '#DCFCE7' },
  skinAgeLabel:     { fontSize: 9, fontWeight: '800', color: '#8E8E93', letterSpacing: 0.6 },
  skinAgeValue:     { fontSize: 16, fontWeight: '800', color: '#3C3C43' },
  skinAgeBonus:     { fontSize: 10, fontWeight: '700', color: '#16A34A', marginTop: 1 },

  // hydration gauge
  gaugeTrack:    { height: 8, borderRadius: 4, marginTop: 14, flexDirection: 'row', overflow: 'visible' },
  gaugeSegment:  { flex: 1, height: 8 },
  gaugeMarker:   { position: 'absolute', top: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', borderWidth: 3, borderColor: '#7C3AED', marginLeft: -8 },
  gaugeScale:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  gaugeScaleText:{ fontSize: 10, fontWeight: '600', color: '#8E8E93' },
  zoneCompare:        { flex: 1, alignItems: 'center' },
  zoneCompareLabel:   { fontSize: 11, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 },
  zoneCompareBadge:   { marginTop: 4, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 99 },
  zoneCompareText:    { fontSize: 13, fontWeight: '800', textTransform: 'capitalize' },
  noteText:           { fontSize: 12, color: '#636366', marginTop: 14, lineHeight: 18, fontStyle: 'italic' },
});
