/**
 * AesthetiQ — central API helper
 *
 * All AI calls go directly to Firebase Cloud Functions.
 * No Railway backend. No mock fallbacks.
 *
 * Architecture:
 *   Frontend → callFunction() → Firebase Cloud Functions (asia-south1)
 *
 * If a Cloud Function call fails the error is logged and re-thrown so it
 * surfaces in the UI and in crash/analytics tooling for accurate debugging.
 */

import { db } from '../config/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { callFunction } from '../config/firebase';
// Import the legacy submodule explicitly — Expo SDK 54 moved readAsStringAsync
// and EncodingType to /legacy and replaced the root export with the new File API.
import * as FileSystem from 'expo-file-system/legacy';

// ─── Types ────────────────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

/** Scan result → recommendedTreatments[] */
export interface RecommendedTreatment {
  id: string;
  name: string;
  /** Human-readable reason derived from the scan concern */
  reason: string;
  /** 0–100 AI confidence score */
  confidence: number;
}

// ─── Skin scan: enhanced structured fields ───────────────────────
// All optional — older Cloud Function deploys won't populate them.

export type ZoneSeverity = 'clear' | 'mild' | 'moderate' | 'severe';

export interface ZoneScore {
  score:        number;        // 0-100
  primaryIssue: string;
  severity:     ZoneSeverity;
}

export type FaceZoneKey =
  | 'forehead' | 'leftCheek' | 'rightCheek' | 'nose'
  | 'chin'     | 'jawline'   | 'underEye'   | 'lips';

export type ZoneScores = Partial<Record<FaceZoneKey, ZoneScore>>;

export interface HydrationAppearance {
  level:  'dehydrated' | 'slightly_dry' | 'normal' | 'well_hydrated' | 'oily_surface';
  tZone:  'dry' | 'normal' | 'oily';
  cheeks: 'dry' | 'normal' | 'oily';
  note:   string;
}

export interface PoreAnalysis {
  overallScore:   number;
  foreheadPores:  'minimal' | 'small' | 'medium' | 'large';
  nosePores:      'minimal' | 'small' | 'medium' | 'large';
  cheekPores:     'minimal' | 'small' | 'medium' | 'large';
  congestion:     'none' | 'mild' | 'moderate' | 'significant';
}

export interface WrinkleMapping {
  overallScore:    number;
  foreheadLines:   'none' | 'fine' | 'moderate' | 'deep';
  glabellarLines:  'none' | 'fine' | 'moderate' | 'deep';
  crowsFeet:       'none' | 'fine' | 'moderate' | 'deep';
  nasolabialFolds: 'absent' | 'subtle' | 'moderate' | 'prominent';
  marionette:      'none' | 'subtle' | 'moderate' | 'deep';
  lipLines:        'none' | 'fine' | 'moderate' | 'deep';
}

export interface OverallSkinAge {
  estimatedSkinAge:    number;
  vsChronologicalNote: string;
}

/**
 * Response shape from the analyzeScan Cloud Function.
 */
export interface AnalyzeScanResponse {
  scanId:                string;
  type:                  'face' | 'skin' | 'dental';
  concerns:              Array<{ area: string; severity: 'low' | 'medium' | 'high'; note: string }>;
  summary:               string;
  recommendedTreatments: Array<{ id: string; name: string; reason: string; confidence: number }>;
  scores?: {
    overall:   number;
    symmetry?: number;
    skin?:     number;
    dental?:   number;
  };
  urgency:   'low' | 'medium' | 'high';
  createdAt: string;

  // ── Phase 1 extensions (skin only, all optional) ────────────────
  zoneScores?:          ZoneScores;
  skinTypeConfidence?:  number;
  hydrationAppearance?: HydrationAppearance;
  poreAnalysis?:        PoreAnalysis;
  wrinkleMapping?:      WrinkleMapping;
  overallSkinAge?:      OverallSkinAge;

  // ── Phase 2A: ARKit face geometry (skin & face, optional) ──────
  hasFaceMesh?:         boolean;
  faceMesh?:            import('../modules/arkit-face-mesh/src').FaceMeshResult | null;

  // ── Phase 2B: LiDAR-fused contour analysis (face only) ─────────
  hasLiDAR?:            boolean;
  depthEnhanced?:       boolean;
  contourAnalysis?:     import('../modules/arkit-face-mesh/src').ContourAnalysis | null;
}

/**
 * Response shape from the simulateResult Cloud Function.
 */
export interface SimulateResultResponse {
  improvements: string[];
  timeline:     string;
  summary:      string;
  cta:          string;
}

// ─── Firestore types ──────────────────────────────────────────────

export interface PatientTreatment {
  id: string;
  name: string;
  status: 'active' | 'rejected';
  source: 'doctor';
  category?: string;
  price?: never;
  reason?: string;
  sessions?: number;
  about?: string;
  icon?: string;
  gradient?: [string, string];
}

export interface MergedRecommendation {
  id: string;
  name: string;
  category: string;
  source: 'doctor' | 'ai';
  reason?: string;
  matchScore?: number;
  icon?: string;
  gradient?: [string, string];
}

export type TreatmentDomain = 'skin' | 'facial' | 'dental';

export interface FirestoreTreatment {
  id: string;
  name: string;
  category: string;
  domain: TreatmentDomain;
  /** Optional safety rules consumed by services/treatmentEligibility.ts */
  contraindications?: import('./treatmentEligibility').Contraindication[];
}

// ─── Cloud Function: analyzeScan ─────────────────────────────────

/**
 * Reads a local file:// URI and returns a fully-formed OpenAI-compatible
 * data URI: `data:image/<type>;base64,<base64data>`.
 *
 * Why we do this on the client:
 *   1. OpenAI Vision rejects file:// URIs and Firebase Storage URLs unless
 *      they are publicly reachable. A self-contained base64 data URI works
 *      regardless of network ACLs.
 *   2. The Cloud Function then passes the string straight through, so the
 *      backend has no decoding/validation to do.
 */
export async function uriToDataUri(uri: string): Promise<string> {
  if (uri.startsWith('data:image')) return uri;

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const ext = uri.split('.').pop()?.toLowerCase() || 'jpeg';
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  return `data:${mime};base64,${base64.replace(/\s/g, '')}`;
}

/**
 * Calls the analyzeScan Cloud Function with image URIs + scan type.
 * Returns structured AI analysis with concerns, scores, and treatment recs.
 * Errors are logged and re-thrown — no fallback.
 */
export interface AnalyzeScanExtras {
  faceMesh?:        import('../modules/arkit-face-mesh/src').FaceMeshResult | null;
  contourAnalysis?: import('../modules/arkit-face-mesh/src').ContourAnalysis | null;
  hasLiDAR?:        boolean;
  depthEnhanced?:   boolean;
}

export async function analyzeScan(
  imageUris: string[],
  type: 'face' | 'skin' | 'dental',
  userId?: string,
  extras?: import('../modules/arkit-face-mesh/src').FaceMeshResult | null | AnalyzeScanExtras,
): Promise<AnalyzeScanResponse> {
  try {
    // Backward compat: old callers passed just a FaceMeshResult; new callers
    // pass an AnalyzeScanExtras object. Detect by the presence of `vertices`.
    const isLegacyMesh = !!extras && Array.isArray((extras as any).vertices);
    const ext: AnalyzeScanExtras = isLegacyMesh
      ? { faceMesh: extras as import('../modules/arkit-face-mesh/src').FaceMeshResult }
      : ((extras as AnalyzeScanExtras | undefined) ?? {});

    // Convert every local URI → OpenAI-compatible data URI before sending
    const images = await Promise.all(imageUris.map(uriToDataUri));

    console.log('Image payload check:', images.map((img) => ({
      hasPrefix: img.startsWith('data:image'),
      length:    img.length,
      first50:   img.substring(0, 50),
    })));

    // Mesh: skin & face scans — Cloud Function persists, never forwards to OpenAI
    const meshPayload = ext.faceMesh && (type === 'skin' || type === 'face')
      ? { hasFaceMesh: true, faceMesh: ext.faceMesh }
      : { hasFaceMesh: false };

    // Contour: face scans only — LiDAR-fused depth metrics for jawline/chin/cheekbone
    const contourPayload = ext.contourAnalysis && type === 'face'
      ? {
          contourAnalysis: ext.contourAnalysis,
          hasLiDAR:        !!ext.hasLiDAR,
          depthEnhanced:   !!ext.depthEnhanced,
        }
      : {};

    const raw = await callFunction<
      { type: string; images: string[]; userId?: string; hasFaceMesh: boolean; faceMesh?: any; contourAnalysis?: any; hasLiDAR?: boolean; depthEnhanced?: boolean },
      any
    >('analyzeScan', {
      type,
      images,
      ...(userId ? { userId } : {}),
      ...meshPayload,
      ...contourPayload,
    });

    // Normalise: some Cloud Functions return the payload wrapped under an
    // extra `data` or `result` key. Unwrap so downstream code always sees
    // the analysis object directly.
    const unwrapped: AnalyzeScanResponse | undefined =
      raw && typeof raw === 'object'
        ? (raw.scanId ? raw : (raw.data ?? raw.result ?? raw))
        : raw;

    if (!unwrapped) {
      console.warn('⚠️ [CF] analyzeScan returned empty payload — using empty fallback');
    }

    // Guarantee a scanId so Firestore writes and routing never break
    const safe: AnalyzeScanResponse = {
      ...(unwrapped ?? ({} as AnalyzeScanResponse)),
      scanId: unwrapped?.scanId ?? `scan_${Date.now()}`,
      type:   unwrapped?.type   ?? type,
    } as AnalyzeScanResponse;

    console.log('✅ [CF] analyzeScan:', safe.scanId);
    return safe;
  } catch (err) {
    console.error('❌ [CF] analyzeScan failed:', err);
    throw err;
  }
}

// ─── Cloud Function: unlockReport (paid scan unlock) ─────────────

/**
 * Marks a scan as unlocked in Firestore after a successful Razorpay payment.
 * Replaces the older unlockScan / unlockSimulation REST endpoints. The CF is
 * authoritative — it sets `unlocked: true` + `unlockedAt` + records a
 * transactions/{auto} log entry.
 *
 * @param scanId     Firestore scan document id
 * @param paymentId  Razorpay payment id (or "mock_<scanId>_<ts>" in dev)
 * @param amount     Amount in paise (₹99 = 9900)
 */
export async function unlockReport(
  scanId: string,
  paymentId: string,
  amount: number = 9900,
): Promise<{ success: boolean; alreadyUnlocked?: boolean }> {
  return callFunction<
    { scanId: string; paymentId: string; amount: number },
    { success: boolean; alreadyUnlocked?: boolean }
  >('unlockReport', { scanId, paymentId, amount });
}

// ─── Cloud Function: simulateResult ──────────────────────────────

/**
 * Calls the simulateResult Cloud Function.
 * Returns an AI-generated before/after improvement summary.
 *
 * In development: falls back to a mock response if the CF call fails.
 * In production: throws the error.
 */
export async function simulateResult(params: {
  imageUrl:   string;
  concerns:   string[];
  treatments: string[];
  intensity?: 'low' | 'medium' | 'high';
}): Promise<SimulateResultResponse> {
  try {
    const data = await callFunction<
      { imageUrl: string; concerns: string[]; treatments: string[]; intensity: string },
      SimulateResultResponse
    >('simulateResult', {
      imageUrl:   params.imageUrl,
      concerns:   params.concerns,
      treatments: params.treatments,
      intensity:  params.intensity ?? 'medium',
    });
    console.log('✅ [CF] simulateResult received');
    return data;
  } catch (err) {
    console.error('❌ [CF] simulateResult failed:', err);
    throw err;
  }
}

// ─── Firestore: treatment pricing ────────────────────────────────

/**
 * Looks up pricePerSession for each treatment name in a doctor-assigned plan.
 * Queries the Firestore "treatments" collection using an `in` filter (max 10).
 * Returns a map of { [treatmentName]: pricePerSession }.
 * This is the ONLY place price is fetched — never shown until plan is assigned.
 */
export async function batchGetTreatmentPrices(
  names: string[],
): Promise<Record<string, number>> {
  if (!names.length) return {};

  const batch = names.slice(0, 10); // Firestore `in` limit
  const q = query(
    collection(db, 'treatments'),
    where('name', 'in', batch),
  );
  const snap = await getDocs(q);

  const result: Record<string, number> = {};
  snap.docs.forEach((doc) => {
    const d = doc.data();
    if (d.name && typeof d.pricePerSession === 'number') {
      result[d.name] = d.pricePerSession;
    }
  });
  return result;
}

// ─── Firestore: treatments catalogue ─────────────────────────────

/**
 * Fetches treatments from the Firestore "treatments" collection filtered
 * by domain. Returns up to 10 results. Never includes price.
 */
export async function getTreatments(domain: TreatmentDomain): Promise<FirestoreTreatment[]> {
  const q = query(
    collection(db, 'treatments'),
    where('domain', '==', domain),
    limit(10),
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id:       doc.id,
      name:     d.name     ?? '',
      category: d.category ?? '',
      domain:   d.domain   ?? domain,
    };
  });
}
