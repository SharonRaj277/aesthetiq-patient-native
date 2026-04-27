/**
 * depthEnhancedScoring.ts
 *
 * Combines GPT-4o's qualitative facial assessment with LiDAR-fused contour
 * measurements to produce more robust facial-aesthetic scores. Pure utility —
 * no React, no networking, no platform code. Easy to unit test.
 *
 * Used only when both `aiAnalysis` and `contour` are present. Callers should
 * pass `null` for `contour` on non-LiDAR / non-TrueDepth devices and render
 * the unmodified AI scores in that case.
 */

import type { ContourAnalysis } from '../modules/arkit-face-mesh/src';

// ─── Inputs (loose shape — only the fields we read) ──────────────

export interface FacialAnalysisLite {
  jawline?:        { definition?: number };  // 0-100
  chin?:           Record<string, any>;
  cheeks?:         { boneProminence?: number };
  facialSymmetry?: { overallScore?: number };
}

export interface EnhancedFacialAnalysis extends FacialAnalysisLite {
  jawlineEnhanced:     number;
  chinEnhanced:        {
    projectionMM:       number;
    rickettEPlane:      'behind' | 'on' | 'ahead';
    measurementSource:  'lidar' | 'truedepth';
    [k: string]: any;
  };
  cheekboneEnhanced:   {
    prominence?:  number;
    leftScore:    number;
    rightScore:   number;
    symmetry:     number;
  };
  symmetryEnhanced:    number;
  depthDataAvailable:  true;
  measurementSource:   'lidar' | 'truedepth';
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Map the gonial angle (degrees) to a 0–100 jawline-definition score.
 * Clinical sweet spot is roughly 120–130°. Outside that band the score
 * decays linearly. We clamp to [0, 100].
 */
function gonialAngleToScore(deg: number): number {
  if (deg <= 0) return 50; // no measurement
  const ideal = 125;
  const diff = Math.abs(deg - ideal);
  return Math.max(0, Math.min(100, Math.round(100 - diff * 4)));
}

/**
 * Weighted blend of two 0–100 scores. Weights need not sum to 1 — they're
 * normalised internally so callers can write `combine(a, b, 0.4, 0.6)`.
 */
export function combineScores(a: number, b: number, wa: number, wb: number): number {
  const sum = wa + wb;
  if (sum <= 0) return Math.round((a + b) / 2);
  return Math.round((a * wa + b * wb) / sum);
}

// ─── Public API ──────────────────────────────────────────────────

export function enhanceWithDepthData(
  aiAnalysis: FacialAnalysisLite,
  contour: ContourAnalysis,
  hasLiDAR: boolean,
): EnhancedFacialAnalysis {
  const measurementSource: 'lidar' | 'truedepth' = hasLiDAR ? 'lidar' : 'truedepth';

  // Jawline: 60% measured, 40% AI assessment
  const aiJawline      = aiAnalysis.jawline?.definition ?? 60;
  const measuredJaw    = gonialAngleToScore(contour.jawlineAngleDegrees);
  const jawlineEnhanced = combineScores(aiJawline, measuredJaw, 0.4, 0.6);

  // Chin: replace AI estimate with measured value when available
  const chinEnhanced = {
    ...(aiAnalysis.chin ?? {}),
    projectionMM:       contour.chinProjection.projectionMM,
    verticalHeightMM:   contour.chinProjection.verticalHeightMM,
    rickettEPlane:      contour.chinProjection.rickettEPlanePosition,
    measurementSource,
  };

  // Cheekbone: AI prominence + measured per-side scores + symmetry
  const cheekboneEnhanced = {
    prominence:  aiAnalysis.cheeks?.boneProminence,
    leftScore:   contour.cheekboneProminence.leftScore,
    rightScore:  contour.cheekboneProminence.rightScore,
    symmetry:    contour.cheekboneProminence.symmetry,
  };

  // Symmetry: 50/50 visual + geometric
  const aiSym       = aiAnalysis.facialSymmetry?.overallScore ?? 70;
  const geoSym      = (contour.jawlineSymmetry + contour.cheekboneProminence.symmetry) / 2;
  const symmetryEnhanced = combineScores(aiSym, geoSym, 0.5, 0.5);

  return {
    ...aiAnalysis,
    jawlineEnhanced,
    chinEnhanced,
    cheekboneEnhanced,
    symmetryEnhanced,
    depthDataAvailable: true,
    measurementSource,
  };
}
