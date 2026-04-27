/**
 * arkit-face-mesh — JS wrapper around the native ARKit module.
 *
 * Exposes:
 *   isFaceMeshSupported() : sync — true on iPhone X+ (TrueDepth required)
 *   captureFaceMesh()     : async — returns FaceMeshResult or { supported: false }
 *
 * Designed to be safely called on Android, web, and unsupported iPhones —
 * the native module is only registered for iOS, so on other platforms we
 * short-circuit to an unsupported result.
 */

import { Platform, NativeModulesProxy } from 'expo-modules-core';

// Type re-exports — matches the dictionary returned from Swift
export interface Vertex3 { x: number; y: number; z: number }

export interface FaceMeshZoneIndices {
  forehead:   number[];
  leftCheek:  number[];
  rightCheek: number[];
  nose:       number[];
  chin:       number[];
  jawline:    number[];
  underEye:   number[];
  lips:       number[];
}

export interface FaceMeshResult {
  supported:          true;
  vertices:           Vertex3[];           // 1,220 points
  blendShapes:        Record<string, number>;
  faceTransform:      number[];            // 16 floats (column-major)
  captureTimestamp:   number;              // ms epoch
  zoneVertexIndices:  FaceMeshZoneIndices;
}

export interface FaceMeshUnsupported { supported: false }

export type CaptureResult = FaceMeshResult | FaceMeshUnsupported;

// ─── Phase 2B: contour analysis types ────────────────────────────

export interface ChinProjection {
  projectionMM:           number;
  verticalHeightMM:       number;
  rickettEPlanePosition:  'behind' | 'on' | 'ahead';
}

export interface CheekboneProminence {
  leftScore:  number;   // 0-100
  rightScore: number;   // 0-100
  symmetry:   number;   // 0-100
}

export interface FacialDepthMap {
  width:     number;     // grid cells per row
  height:    number;     // grid cells per col
  values:    number[];   // row-major mm depths
  minDepth:  number;
  maxDepth:  number;
}

export interface ContourAnalysis {
  jawlineContour:      Vertex3[];
  jawlineAngleDegrees: number;
  jawlineSymmetry:     number;
  chinProjection:      ChinProjection;
  cheekboneProminence: CheekboneProminence;
  facialDepthMap:      FacialDepthMap;
}

export interface FaceMeshWithDepthResult extends FaceMeshResult {
  hasLiDAR:        boolean;
  depthEnhanced:   boolean;
  contourAnalysis: ContourAnalysis;
}

export type CaptureWithDepthResult = FaceMeshWithDepthResult | FaceMeshUnsupported;

// ─── Lazy native module accessor ─────────────────────────────────
// Importing the native module at module-eval time crashes on platforms
// where it isn't registered, so we resolve it lazily inside the public
// functions and treat any access failure as "not supported".

function getNative(): any | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // Modern Expo Modules expose via NativeModulesProxy under the module Name
    const native = (NativeModulesProxy as any)?.ArkitFaceMesh;
    return native ?? null;
  } catch {
    return null;
  }
}

export function isFaceMeshSupported(): boolean {
  const native = getNative();
  if (!native) return false;
  try {
    return native.isSupported() === true;
  } catch {
    return false;
  }
}

export async function captureFaceMesh(): Promise<CaptureResult> {
  const native = getNative();
  if (!native) return { supported: false };

  try {
    const result = await native.captureFaceMesh();
    if (!result || result.supported === false) return { supported: false };
    return result as FaceMeshResult;
  } catch (err) {
    // Timeout (no face within 6s) or runtime ARKit error — soft-fail.
    console.warn('[arkit-face-mesh] capture failed:', err);
    return { supported: false };
  }
}

/**
 * Phase 2B: capture mesh + LiDAR-fused contour analysis.
 * Falls back to plain captureFaceMesh() if the native call rejects.
 */
export async function captureFaceMeshWithDepth(): Promise<CaptureWithDepthResult> {
  const native = getNative();
  if (!native) return { supported: false };

  try {
    const result = await native.captureFaceMeshWithDepth();
    if (!result || result.supported === false) return { supported: false };
    return result as FaceMeshWithDepthResult;
  } catch (err) {
    console.warn('[arkit-face-mesh] depth capture failed, trying plain mesh:', err);
    const fallback = await captureFaceMesh();
    if (!fallback.supported) return { supported: false };
    // Surface as FaceMeshResult (no contour) — caller treats as "no depth"
    return { supported: false };
  }
}

export default {
  isFaceMeshSupported,
  captureFaceMesh,
  captureFaceMeshWithDepth,
};
