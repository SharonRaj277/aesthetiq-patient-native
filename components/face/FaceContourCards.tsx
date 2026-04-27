/**
 * Phase 2B facial contour visualisations.
 *
 *   • LiDARBadge          → small pill: "LiDAR Measured" or "TrueDepth Estimated"
 *   • FacialDepthMapCard  → 64x64 depth grid rendered as a coloured heat map
 *   • JawlineProfileCard  → contour path + gonial-angle annotation + symmetry
 *   • ChinProjectionCard  → side-profile diagram with mm projection + E-plane
 *   • CheekboneCard       → left/right score bars + symmetry gauge
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import type { ContourAnalysis, ChinProjection, CheekboneProminence, FacialDepthMap } from '../../modules/arkit-face-mesh/src';

// ─── LiDAR / TrueDepth badge ─────────────────────────────────────

export function LiDARBadge({ hasLiDAR }: { hasLiDAR: boolean }) {
  return (
    <View style={[styles.badge, hasLiDAR ? styles.badgeLidar : styles.badgeTrueDepth]}>
      <Text style={[styles.badgeText, { color: hasLiDAR ? '#0E7490' : '#52525B' }]}>
        {hasLiDAR ? '◉ LiDAR Measured' : '◉ TrueDepth Estimated'}
      </Text>
    </View>
  );
}

// ─── Depth heat map ──────────────────────────────────────────────

function depthToColor(depth: number, min: number, max: number): string {
  // 0 mm (closest) → warm red; max → cool blue. HSL hue interpolation.
  if (max <= min) return 'rgb(180,180,180)';
  const t = Math.max(0, Math.min(1, (depth - min) / (max - min)));
  // hue 10 (red-orange) → 220 (blue); fixed saturation/lightness
  const hue = 10 + t * 210;
  return `hsl(${hue.toFixed(0)}, 75%, 55%)`;
}

export function FacialDepthMapCard({
  data,
  hasLiDAR,
}: {
  data: FacialDepthMap;
  hasLiDAR: boolean;
}) {
  const cellSize = 4;            // pixel size per grid cell
  const w = data.width  * cellSize;
  const h = data.height * cellSize;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardTitle}>Facial Depth Map</Text>
          <Text style={styles.cardSub}>
            {hasLiDAR ? 'Measured with LiDAR' : 'Estimated from TrueDepth'}
          </Text>
        </View>
        <LiDARBadge hasLiDAR={hasLiDAR} />
      </View>

      <View style={{ alignItems: 'center', marginTop: 12 }}>
        <Svg width={w} height={h}>
          {data.values.map((d, i) => {
            const gx = i % data.width;
            const gy = Math.floor(i / data.width);
            return (
              <Rect
                key={i}
                x={gx * cellSize}
                y={gy * cellSize}
                width={cellSize}
                height={cellSize}
                fill={depthToColor(d, data.minDepth, data.maxDepth)}
              />
            );
          })}
        </Svg>
      </View>

      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>Closest</Text>
        <View style={styles.scaleBar}>
          {[10, 50, 90, 140, 180, 220].map((hue, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: `hsl(${hue}, 75%, 55%)` }} />
          ))}
        </View>
        <Text style={styles.scaleText}>Deepest</Text>
      </View>
      <Text style={styles.depthRange}>
        Range: {data.minDepth.toFixed(1)} – {data.maxDepth.toFixed(1)} mm
      </Text>
    </View>
  );
}

// ─── Jawline profile + gonial angle ──────────────────────────────

function jawlineColor(angleDeg: number): { color: string; label: string } {
  // Defined: 115-130; soft: 100-115 or 130-145; weak: outside
  if (angleDeg >= 115 && angleDeg <= 130) return { color: '#22C55E', label: 'Defined' };
  if (angleDeg >= 100 && angleDeg <= 145) return { color: '#F59E0B', label: 'Soft' };
  return { color: '#EF4444', label: 'Weak' };
}

export function JawlineProfileCard({
  contour,
  hasLiDAR,
}: {
  contour: ContourAnalysis;
  hasLiDAR: boolean;
}) {
  const meta = jawlineColor(contour.jawlineAngleDegrees);

  // Project the jawline contour to 2D for SVG (orthographic XZ — side view)
  // X axis becomes screen X, Z axis becomes screen Y.
  const W = 220, H = 140, pad = 12;
  const pts = contour.jawlineContour;

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
  }
  const sx = (W - 2 * pad) / Math.max(0.0001, maxX - minX);
  const sz = (H - 2 * pad) / Math.max(0.0001, maxZ - minZ);
  const s = Math.min(sx, sz);
  const offX = (W - (maxX - minX) * s) / 2;
  const offY = (H - (maxZ - minZ) * s) / 2;

  const projected = pts.map((p) => ({
    x: offX + (p.x - minX) * s,
    y: offY + (maxZ - p.z) * s,
  }));

  const path = projected.length >= 2
    ? projected.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : '';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardTitle}>Jawline Profile</Text>
          <Text style={styles.cardSub}>
            Gonial angle {contour.jawlineAngleDegrees.toFixed(0)}° · Symmetry {contour.jawlineSymmetry.toFixed(0)}/100
          </Text>
        </View>
        <LiDARBadge hasLiDAR={hasLiDAR} />
      </View>

      <View style={{ alignItems: 'center', marginTop: 12 }}>
        <Svg width={W} height={H}>
          <Path d={path} stroke={meta.color} strokeWidth={3} fill="none" strokeLinecap="round" />
          {/* Annotate the inflection (mid) point */}
          {projected.length >= 3 && (() => {
            const mid = projected[Math.floor(projected.length / 2)];
            return (
              <>
                <Circle cx={mid.x} cy={mid.y} r={5} fill={meta.color} />
                <SvgText x={mid.x + 8} y={mid.y - 6} fontSize="11" fontWeight="700" fill={meta.color}>
                  {contour.jawlineAngleDegrees.toFixed(0)}°
                </SvgText>
              </>
            );
          })()}
        </Svg>
      </View>

      <View style={[styles.statusPill, { backgroundColor: meta.color + '22', borderColor: meta.color }]}>
        <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
      </View>
    </View>
  );
}

// ─── Chin projection diagram ─────────────────────────────────────

export function ChinProjectionCard({
  chin,
  hasLiDAR,
}: {
  chin: ChinProjection;
  hasLiDAR: boolean;
}) {
  const W = 220, H = 160, midX = W / 2, topY = 24, botY = H - 24;
  // Visual scale: 1 mm projection = 2 px arrow length, capped at ±60 px
  const arrowPx = Math.max(-60, Math.min(60, chin.projectionMM * 2));
  const ePlaneOffset = chin.rickettEPlanePosition === 'ahead' ? 8 : chin.rickettEPlanePosition === 'behind' ? -8 : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardTitle}>Chin Projection</Text>
          <Text style={styles.cardSub}>
            {chin.projectionMM > 0 ? 'Projects' : chin.projectionMM < 0 ? 'Retrudes' : 'On plane'} {Math.abs(chin.projectionMM).toFixed(1)} mm from subnasal
          </Text>
        </View>
        <LiDARBadge hasLiDAR={hasLiDAR} />
      </View>

      <View style={{ alignItems: 'center', marginTop: 12 }}>
        <Svg width={W} height={H}>
          {/* Subnasal plane — vertical reference line */}
          <Line x1={midX} y1={topY} x2={midX} y2={botY} stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4,3" />
          <SvgText x={midX + 6} y={topY + 10} fontSize="10" fill="#64748B">Subnasal</SvgText>

          {/* Ricketts E-plane — diagonal */}
          <Line
            x1={midX + ePlaneOffset} y1={topY}
            x2={midX - 30} y2={botY}
            stroke="#7C3AED" strokeWidth={1.5}
          />
          <Circle cx={midX + (chin.projectionMM > 0 ? 12 : -8)} cy={botY - 22} r={4} fill="#7C3AED" />

          {/* Chin projection arrow */}
          <Line
            x1={midX} y1={botY - 38}
            x2={midX + arrowPx} y2={botY - 38}
            stroke="#22C55E" strokeWidth={3} strokeLinecap="round"
          />
          <SvgText x={midX + arrowPx + 6} y={botY - 34} fontSize="11" fontWeight="700" fill="#16A34A">
            {chin.projectionMM.toFixed(1)} mm
          </SvgText>
        </Svg>
      </View>

      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>Vertical height</Text>
        <Text style={styles.metricValue}>{chin.verticalHeightMM.toFixed(1)} mm</Text>
      </View>
      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>Ricketts E-plane</Text>
        <Text style={[styles.metricValue, { textTransform: 'capitalize' }]}>{chin.rickettEPlanePosition}</Text>
      </View>
    </View>
  );
}

// ─── Cheekbone card ──────────────────────────────────────────────

export function CheekboneCard({
  data,
  hasLiDAR,
}: {
  data: CheekboneProminence;
  hasLiDAR: boolean;
}) {
  const bar = (score: number) => Math.max(4, Math.min(100, score));

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardTitle}>Cheekbone Prominence</Text>
          <Text style={styles.cardSub}>Symmetry {data.symmetry.toFixed(0)}/100</Text>
        </View>
        <LiDARBadge hasLiDAR={hasLiDAR} />
      </View>

      <View style={{ marginTop: 12, gap: 10 }}>
        <View>
          <View style={styles.cheekRow}>
            <Text style={styles.cheekLabel}>Left</Text>
            <Text style={styles.cheekScore}>{data.leftScore.toFixed(0)}</Text>
          </View>
          <View style={styles.cheekTrack}>
            <View style={[styles.cheekFill, { width: `${bar(data.leftScore)}%`, backgroundColor: '#A855F7' }]} />
          </View>
        </View>
        <View>
          <View style={styles.cheekRow}>
            <Text style={styles.cheekLabel}>Right</Text>
            <Text style={styles.cheekScore}>{data.rightScore.toFixed(0)}</Text>
          </View>
          <View style={styles.cheekTrack}>
            <View style={[styles.cheekFill, { width: `${bar(data.rightScore)}%`, backgroundColor: '#7C3AED' }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card:           { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E5E5EA' },
  cardHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle:      { fontSize: 15, fontWeight: '800', color: '#1C1C1E' },
  cardSub:        { fontSize: 12, color: '#8E8E93', marginTop: 2 },

  badge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  badgeLidar:     { backgroundColor: '#CFFAFE', borderColor: '#67E8F9' },
  badgeTrueDepth: { backgroundColor: '#F4F4F5', borderColor: '#D4D4D8' },
  badgeText:      { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },

  scaleRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  scaleBar:    { flex: 1, height: 8, borderRadius: 4, flexDirection: 'row', overflow: 'hidden' },
  scaleText:   { fontSize: 10, fontWeight: '600', color: '#8E8E93' },
  depthRange:  { fontSize: 11, color: '#64748B', marginTop: 6, textAlign: 'center' },

  statusPill:     { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  statusPillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  metricRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  metricLabel:  { fontSize: 12, color: '#636366' },
  metricValue:  { fontSize: 13, fontWeight: '700', color: '#1C1C1E' },

  cheekRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cheekLabel:  { fontSize: 12, fontWeight: '600', color: '#3C3C43' },
  cheekScore:  { fontSize: 13, fontWeight: '800', color: '#1C1C1E' },
  cheekTrack:  { height: 8, borderRadius: 4, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  cheekFill:   { height: 8, borderRadius: 4 },
});
