/**
 * AI Report Screen
 * Supports 3 domains: Facial Harmony | Skin Analysis | Dental Health
 *
 * For Facial domain, adds clinical landmark-based sections:
 *   Clinical Measurements · Symmetry Breakdown · Facial Proportions
 *   Profile Analysis · Landmark Overlay · AI Interpretation ·
 *   Treatment Justification · Doctor CTA
 *
 * Route: /ai-report?scanId=scan1&type=face
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert, ActivityIndicator,
  StyleSheet, Animated, Easing,
  Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line, Ellipse, Text as SvgText } from 'react-native-svg';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Colors } from '../constants/colors';
import { MOCK_SCANS, type ScanConcern } from '../constants/mockData';
import type { RecommendedTreatment, SimulateResultResponse } from '../services/api';
import { simulateResult } from '../services/api';
import { scanImageStore } from '../services/scanStore';
import {
  SkinFaceHeatMap,
  PoreScoreCard,
  WrinkleMapCard,
  SkinAgeBadge,
  HydrationGauge,
} from '../components/skin/SkinAdvancedCards';
import {
  FacialDepthMapCard,
  JawlineProfileCard,
  ChinProjectionCard,
  CheekboneCard,
} from '../components/face/FaceContourCards';
import { unlockReport, isReportUnlocked, mockUnlockReport, isMockPaymentMode, type PaymentStatus } from '../services/reportUnlockService';
import { useScanUnlock } from '../hooks/useScanUnlock';
import { LockedSection } from '../components/paywall/LockedSection';
import { UnlockCard, UnlockFloatingBar } from '../components/paywall/UnlockCard';
import { Analytics } from '../services/analytics';
import ReportPaywall from '../components/ReportPaywall';
import { useUser } from '../contexts/UserContext';
import { useLivePlan } from '../hooks/useLivePlan';
import { assignDoctorToPatient, type DoctorDomain } from '../services/doctorAssignment';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
type Domain = 'face' | 'skin' | 'dental';

interface ClinicalMeasurement {
  label: string;
  value: string;
  numericScore: number; // 0–100 for bar
  unit?: string;
  status: 'good' | 'fair' | 'concern';
  note: string;
}

interface SymmetryPoint {
  label: string;
  status: 'Even' | 'Slight' | 'Noticeable';
  delta: string; // e.g. "0.8mm"
}

interface FacialThird {
  label: string;
  pct: number;
  ideal: number; // 33.3
}

interface ProfileMetric {
  label: string;
  value: string;
  status: 'optimal' | 'moderate' | 'attention';
  insight: string;
}

interface TreatmentRec {
  name: string;
  target: string;
  expectedOutcome: string;
  measurementJustification: string;
}

interface FacialClinicalData {
  measurements: ClinicalMeasurement[];
  symmetry: SymmetryPoint[];
  thirds: FacialThird[];
  profile: ProfileMetric[];
  topStrengths: string[];
  topConcerns: string[];
  treatments: TreatmentRec[];
}

// ── Skin clinical types ───────────────────────────────────────────
interface SkinMetric {
  label: string;
  score: number;       // 0–100
  unit?: string;
  status: 'good' | 'fair' | 'concern';
  note: string;
  icon: string;
}

interface SkinCondition {
  name: string;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  affectedZones: string[];
  clinicalNote: string;
  icon: string;
}

type LightType = 'Natural' | 'White' | 'Blue' | 'Green' | 'Red' | 'Raking';

interface MultiLightImage {
  light: LightType;
  revealNote: string;   // short tile caption
  findings: string[];   // AI findings for detail view
  limitation: string;   // what this light cannot detect
  gradientColors: [string, string];
  icon: string;
}

interface CrossLightInsight {
  finding: string;
  detectedIn: LightType[];
  significance: 'High' | 'Medium' | 'Low';
  recommendation: string;
}

interface SkinClinicalData {
  metrics: SkinMetric[];
  conditions: SkinCondition[];
  multiLight: MultiLightImage[];
  crossLightInsights: CrossLightInsight[];
  aiSummary: string;
}

// ── Dental clinical types ─────────────────────────────────────────
type DentalUrgencyTier = 1 | 2 | 3 | 4;

interface PainZone {
  id: string;
  label: string;           // e.g. "Upper Left"
  painLevel: 1 | 2 | 3;   // 1=Mild 2=Moderate 3=Severe
  aiFindings: string[];
}

interface DentalVisualFinding {
  category: string;        // e.g. "Caries (Decay)"
  icon: string;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  note: string;
}

interface DentalSymptomSummary {
  painType: string;        // e.g. "Constant, throbbing"
  triggers: string[];      // e.g. ["Hot drinks", "Cold food"]
  durationDays: number;
  nightPain: boolean;
  swelling: boolean;
  badTaste: boolean;
  radiatingPain: boolean;
  fever: boolean;
}

interface DentalTreatmentSuggestion {
  name: string;
  priority: 'routine' | 'soon' | 'urgent';
  reason: string;          // "Based on visible decay and throbbing pain..."
}

interface DentalClinicalData {
  urgencyTier: DentalUrgencyTier;
  urgencyReason: string;
  painZones: PainZone[];
  symptomSummary: DentalSymptomSummary | null;
  visualFindings: DentalVisualFinding[];
  aiInterpretation: string;
  treatmentSuggestions: DentalTreatmentSuggestion[];
  limitations: string[];
}

// ─────────────────────────────────────────────────────────────────
// MOCK CLINICAL DATA  (replaced by real backend payload when wired)
// ─────────────────────────────────────────────────────────────────
function buildFacialClinicalData(symmetryScore: number): FacialClinicalData {
  const s = symmetryScore ?? 85;
  return {
    measurements: [
      { label: 'Symmetry Score',       value: `${s}`,      numericScore: s,       unit: '/100', status: s >= 80 ? 'good' : s >= 65 ? 'fair' : 'concern', note: 'Overall bilateral symmetry across all facial zones.' },
      { label: 'Facial Thirds Balance', value: '34 / 33 / 33', numericScore: 88,  unit: '%',    status: 'good',    note: 'Upper, middle, and lower facial thirds are near-ideal proportion.' },
      { label: 'Golden Ratio Score',    value: '1.61',      numericScore: 92,      unit: 'φ',    status: 'good',    note: 'Facial width-to-height ratio closely matches the 1.618 golden mean.' },
      { label: 'Gonial Angle',          value: '138°',      numericScore: 58,      unit: '°',    status: 'fair',    note: 'Slightly obtuse angle (normal: 120–130°). May contribute to a softer jawline appearance.' },
      { label: 'Chin Projection',       value: '−2mm',      numericScore: 48,      unit: 'mm',   status: 'concern', note: 'Chin is 2mm behind the ideal Ricketts E-line. Subtle retrogenia noted.' },
    ],
    symmetry: [
      { label: 'Eye Level',      status: 'Even',       delta: '0.3mm' },
      { label: 'Brow Level',     status: 'Slight',     delta: '1.2mm' },
      { label: 'Jaw Symmetry',   status: 'Slight',     delta: '1.8mm' },
      { label: 'Mouth Corners',  status: 'Even',       delta: '0.4mm' },
    ],
    thirds: [
      { label: 'Upper Third', pct: 34, ideal: 33.3 },
      { label: 'Middle Third', pct: 33, ideal: 33.3 },
      { label: 'Lower Third', pct: 33, ideal: 33.3 },
    ],
    profile: [
      { label: 'Jawline Definition', value: 'Soft–Moderate', status: 'moderate', insight: 'Gonial angle of 138° creates a softer jaw contour. Contouring or filler may sharpen definition.' },
      { label: 'Chin Projection',    value: 'Slightly Receded', status: 'attention', insight: '−2mm from Ricketts E-line. Chin augmentation or filler could improve anterior projection.' },
      { label: 'Nasolabial Angle',   value: '104°', status: 'optimal', insight: 'Within the 90–110° optimal range. Indicates well-balanced nose-lip interface.' },
    ],
    topStrengths: [
      'Golden ratio facial proportions (φ = 1.61) — near ideal',
      'Facial thirds balance is clinically well-proportioned',
      'Eye-level symmetry within normal clinical tolerance (< 0.5mm)',
      'Nasolabial angle within optimal 90–110° range',
    ],
    topConcerns: [
      'Gonial angle (138°) exceeds optimal range — contributes to softer jawline',
      'Chin projection 2mm behind Ricketts E-line (mild retrogenia)',
      'Brow asymmetry of 1.2mm — cosmetically noticeable at close range',
    ],
    treatments: [
      {
        name: 'Jawline Contouring (Filler)',
        target: 'Gonial angle definition',
        expectedOutcome: 'Sharpened posterior jaw contour; more defined face shape',
        measurementJustification: 'Based on your gonial angle of 138° (optimal: 120–130°), your jawline appears softer than ideal. Strategic filler placement at the mandibular angle can reduce this angle visually by 8–12°.',
      },
      {
        name: 'Chin Augmentation (Filler)',
        target: 'Anterior chin projection',
        expectedOutcome: 'Improved lateral profile balance; stronger chin-jaw-neck line',
        measurementJustification: 'Your chin sits 2mm behind the Ricketts E-line. A small filler volume (0.5–1ml) can restore the ideal projection and improve overall profile harmony.',
      },
      {
        name: 'RF Microneedling',
        target: 'Skin texture & collagen stimulation',
        expectedOutcome: 'Improved skin quality, reduced laxity around jaw and cheeks',
        measurementJustification: 'Facial third analysis shows the lower third has minor soft tissue laxity. RF energy will tighten the tissue envelope and complement structural refinements.',
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────
// MOCK DENTAL CLINICAL DATA  (replaced by real backend payload when wired)
// ─────────────────────────────────────────────────────────────────
function buildDentalClinicalData(overallScore: number): DentalClinicalData {
  const s = overallScore ?? 66;
  const tier: DentalUrgencyTier = s >= 85 ? 1 : s >= 65 ? 2 : s >= 45 ? 3 : 4;
  return {
    urgencyTier: tier,
    urgencyReason:
      tier === 1 ? 'No active concern detected. Routine maintenance recommended.' :
      tier === 2 ? 'Early signs of enamel wear and mild gum inflammation detected. Review within 4–6 weeks.' :
      tier === 3 ? 'Active decay detected on lower molar zone. Filling advised before further progression.' :
                   'Possible pulpitis or abscess indicated by symptom pattern. See a dentist within 24–48 hours.',

    painZones: [
      {
        id: 'lower-left', label: 'Lower Left',
        painLevel: 2,
        aiFindings: [
          'Visual discolouration at lower-left molar — consistent with secondary caries',
          'Gingival margin appears inflamed in this zone',
          'Possible occlusal wear on premolar surface',
        ],
      },
      {
        id: 'upper-front', label: 'Upper Front',
        painLevel: 1,
        aiFindings: [
          'Mild enamel erosion at incisal edge of upper central incisors',
          'Slight calculus deposit at gum line (Class I)',
          'No visible cracks or chips detected',
        ],
      },
    ],

    symptomSummary: {
      painType: 'Intermittent, dull ache with occasional throbbing',
      triggers: ['Cold drinks', 'Biting down', 'Sweet foods'],
      durationDays: 5,
      nightPain: false,
      swelling: false,
      badTaste: true,
      radiatingPain: false,
      fever: false,
    },

    visualFindings: [
      { category: 'Caries (Decay)',    icon: '🦷', severity: 'moderate', note: 'Dark discolouration on lower-left molar consistent with active decay. Estimated Class II involvement.' },
      { category: 'Gum Health',        icon: '🩸', severity: 'mild',     note: 'Mild gingivitis along lower anterior region. Gingival margin redness and slight swelling detected.' },
      { category: 'Plaque / Calculus', icon: '⚪', severity: 'moderate', note: 'Supragingival calculus visible on lower incisors. Plaque index elevated in posterior regions.' },
      { category: 'Alignment',         icon: '📐', severity: 'mild',     note: 'Mild crowding of lower anterior teeth. Overjet within normal range. No skeletal concerns identified.' },
      { category: 'Tooth Condition',   icon: '✨', severity: 'mild',     note: 'Enamel erosion on upper incisal edges — consistent with acidic diet exposure. No fractures detected.' },
    ],

    aiInterpretation: `Dental scan score of ${s}/100 with ${tier >= 3 ? 'active' : 'early'} pathology detected. The primary concern is the lower-left molar zone where image analysis identified discolouration patterns consistent with Class II caries. Cross-referenced with reported symptoms (cold sensitivity, bad taste), this is consistent with dentin involvement — which does not yet indicate pulp exposure. The gum inflammation is localised and reversible with professional cleaning. Enamel erosion on upper front teeth is likely dietary in origin. ${tier >= 3 ? 'Prompt dental review is recommended to prevent progression to root canal territory.' : 'No immediate emergency, but timely intervention will prevent escalation.'}`,

    treatmentSuggestions: [
      {
        name: 'Composite Filling',
        priority: 'soon',
        reason: 'Visual decay on lower-left molar confirmed by image analysis. Reported cold sensitivity and bad taste are consistent with dentin exposure. Filling will halt progression and eliminate symptoms.',
      },
      {
        name: 'Professional Scale & Polish',
        priority: 'routine',
        reason: 'Supragingival calculus detected at lower anteriors. Regular scaling prevents progression to periodontitis and reverses current gingivitis.',
      },
      {
        name: 'Fluoride Application',
        priority: 'routine',
        reason: 'Enamel erosion on upper incisors identified. Topical fluoride strengthens enamel mineral structure and reduces further acid dissolution.',
      },
    ],

    limitations: [
      'X-ray required to confirm depth of caries and proximity to pulp',
      'Periapical pathology (abscess, root resorption) cannot be ruled out without radiograph',
      'This scan does not assess bone level — periodontal staging requires clinical probing',
      'Impacted or wisdom teeth are outside the scope of visual AI analysis',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────
// MOCK SKIN CLINICAL DATA  (replaced by real backend payload when wired)
// ─────────────────────────────────────────────────────────────────
function buildSkinClinicalData(overallScore: number): SkinClinicalData {
  const s = overallScore ?? 72;
  return {
    metrics: [
      { label: 'Acne Severity',         score: 56, unit: '/100', status: 'fair',    note: 'Active sebaceous activity with comedonal pattern in the T-zone. No inflammatory nodules.', icon: '🔴' },
      { label: 'Pore Score',            score: 38, unit: '/100', status: 'concern', note: 'Enlarged pores in nasal bridge and chin. Pore area 18% above baseline.', icon: '🔍' },
      { label: 'Wrinkle Score',         score: 78, unit: '/100', status: 'good',    note: 'Fine lines minimal. No deep glabellar or marionette lines visible.', icon: '〰️' },
      { label: 'Texture',               score: 68, unit: '/100', status: 'fair',    note: 'Micro-relief irregularities detected in the T-zone and forehead. Moderate roughness.', icon: '🔬' },
      { label: 'Pigmentation Evenness', score: 55, unit: '/100', status: 'fair',    note: 'Uneven melanin distribution across cheeks. PIH patches detected in left cheek zone.', icon: '🎨' },
    ],
    conditions: [
      { name: 'Acne / Congestion', severity: 'moderate', affectedZones: ['T-zone', 'Chin', 'Forehead'], clinicalNote: 'Active sebaceous hyperactivity with comedonal activity in T-zone. No inflammatory nodules detected.', icon: '🔴' },
      { name: 'Pigmentation',      severity: 'mild',     affectedZones: ['Left Cheek', 'Upper Lip'], clinicalNote: 'Post-inflammatory hyperpigmentation (PIH) patterns consistent with previous acne lesions. UV-induced melasma risk moderate.', icon: '🟤' },
      { name: 'Redness',           severity: 'mild',     affectedZones: ['Nose', 'Cheeks'], clinicalNote: 'Erythema index elevated around nasal wings and bilateral cheek zones. Suggests mild rosacea or reactive skin.', icon: '🌡️' },
      { name: 'Sensitivity',       severity: 'moderate', affectedZones: ['Entire Face'], clinicalNote: 'TEWL of 18 g/m²/h (normal < 10). Compromised barrier function. Prone to irritant reactions.', icon: '⚡' },
    ],
    multiLight: [
      {
        light: 'Natural', gradientColors: ['#FCD34D', '#F59E0B'], icon: '☀️',
        revealNote: 'True skin colour & visible texture',
        findings: ['Overall skin tone appears dull with yellowish cast', 'Visible pores in T-zone under natural light', 'Surface roughness apparent on cheeks and forehead'],
        limitation: 'Cannot reveal sub-surface pigmentation, vascular patterns, or bacteria activity.',
      },
      {
        light: 'White', gradientColors: ['#E2E8F0', '#94A3B8'], icon: '💡',
        revealNote: 'Surface condition & oil balance',
        findings: ['T-zone shows moderate sebum activity', 'Dry patches detected along jawline', 'Forehead texture irregularities highlighted'],
        limitation: 'Overexposes surface gloss; may obscure deeper pigmentation layers.',
      },
      {
        light: 'Blue', gradientColors: ['#3B82F6', '#1D4ED8'], icon: '🔵',
        revealNote: 'Bacteria & pore blockages',
        findings: ['Fluorescent spots indicate active Cutibacterium acnes in T-zone', 'Comedone clusters visible in nose and chin', 'Mild follicular activity detected on forehead'],
        limitation: 'Cannot distinguish between bacterial and fungal infections. Requires clinical swab for confirmation.',
      },
      {
        light: 'Green', gradientColors: ['#22C55E', '#15803D'], icon: '🟢',
        revealNote: 'Haemoglobin & vascular activity',
        findings: ['Elevated haemoglobin absorption in nasal wings — suggests early telangiectasia', 'Cheek erythema confirmed bilaterally', 'No visible broken capillaries detected'],
        limitation: 'Does not differentiate between active inflammation and chronic redness.',
      },
      {
        light: 'Red', gradientColors: ['#EF4444', '#B91C1C'], icon: '🔴',
        revealNote: 'Melanin depth & sun damage',
        findings: ['Deep dermal melanin deposits confirmed in left cheek zone', 'Solar lentigines (sun spots) detected — 3 sites on upper cheeks', 'No dermal fibrosis patterns noted'],
        limitation: 'Red light analysis requires correlation with UV history for accurate melanin staging.',
      },
      {
        light: 'Raking', gradientColors: ['#8B5CF6', '#6D28D9'], icon: '✨',
        revealNote: 'Fine lines, scars & topography',
        findings: ['Shallow atrophic acne scars detected in left cheek (grade 1–2)', 'Fine lines visible around orbital zone', 'Surface topography shows 0.8mm elevation irregularity in forehead'],
        limitation: 'Optimal for surface topology only. Not effective for vascular or pigmentation analysis.',
      },
    ],
    crossLightInsights: [
      {
        finding: 'Active bacterial colonisation with concurrent sebaceous hyperactivity',
        detectedIn: ['Blue', 'White'],
        significance: 'High',
        recommendation: 'Topical benzoyl peroxide (2.5%) or azelaic acid (15%) combined with oil-control protocol. Avoid occlusive moisturisers.',
      },
      {
        finding: 'Post-inflammatory hyperpigmentation (PIH) confirmed at dermal depth',
        detectedIn: ['Red', 'Natural'],
        significance: 'High',
        recommendation: 'Alpha-arbutin 2% or tranexamic acid serum. SPF 50+ mandatory. Consider 4–6 session chemical peel series.',
      },
      {
        finding: 'Compromised epidermal barrier with elevated vascular reactivity',
        detectedIn: ['Green', 'White'],
        significance: 'Medium',
        recommendation: 'Ceramide-rich barrier repair cream. Avoid retinoids until barrier is restored. Niacinamide 10% for dual action on tone and redness.',
      },
      {
        finding: 'Superficial atrophic scarring with micro-relief irregularities',
        detectedIn: ['Raking', 'Natural'],
        significance: 'Medium',
        recommendation: 'RF microneedling (3–4 sessions) to induce controlled collagen remodelling. Avoid aggressive manual exfoliation.',
      },
    ],
    aiSummary: `Multi-light skin analysis at ${s}/100 reveals a complex interplay of active bacterial congestion (blue-light confirmed), dermal-depth hyperpigmentation (red-light confirmed), and a significantly compromised moisture barrier. Cross-light correlation identifies the T-zone as the primary concern zone with overlapping acne, enlarged pores, and early pigmentation. Your skin profile is consistent with combination-sensitive skin with moderate inflammatory activity. Clinical intervention priority: barrier restoration first, followed by targeted brightening and texture refinement.`,
  };
}

// ─────────────────────────────────────────────────────────────────
// MOCK RECOMMENDED TREATMENTS  (replaced by apiData.recommendedTreatments)
// ─────────────────────────────────────────────────────────────────
const MOCK_RECOMMENDED: Record<Domain, RecommendedTreatment[]> = {
  face: [
    {
      id: 'mock_face_1',
      name: 'Jawline Contouring (Filler)',
      reason: 'Gonial angle measured at 138° (optimal: 120–130°). Your jaw contour is softer than the ideal clinical range. Strategic filler placement at the gonion can sharpen this by 8–12° visually.',
      confidence: 92,
    },
    {
      id: 'mock_face_2',
      name: 'Chin Augmentation (Filler)',
      reason: 'Chin sits 2mm posterior to the Ricketts E-line. A 0.5–1ml filler volume restores ideal projection and improves the chin-jaw-neck profile ratio.',
      confidence: 88,
    },
    {
      id: 'mock_face_3',
      name: 'Brow Lift (Botox)',
      reason: 'Brow asymmetry detected at 1.2mm — cosmetically perceptible at close range. Targeted toxin units can correct this without altering natural expression.',
      confidence: 74,
    },
  ],
  skin: [
    {
      id: 'mock_skin_1',
      name: 'Chemical Peel (AHA/BHA)',
      reason: 'Melanin index above threshold in cheek zones. Multi-light analysis confirmed grade-2 hyperpigmentation. AHA/BHA peel targets the stratum corneum to reduce melanin density by 30–50%.',
      confidence: 90,
    },
    {
      id: 'mock_skin_2',
      name: 'RF Microneedling',
      reason: 'Pore area analysis shows 18% enlargement in T-zone. Transepidermal water loss (TEWL) elevated by 12%. RF energy stimulates collagen synthesis and tightens the follicular opening.',
      confidence: 82,
    },
    {
      id: 'mock_skin_3',
      name: 'HydraFacial',
      reason: 'Hydration index scored 42/100 (optimal: >65). Sebaceous activity map shows moderate congestion across nasal bridge. HydraFacial restores moisture barrier and clears clogged follicles.',
      confidence: 76,
    },
  ],
  dental: [
    {
      id: 'mock_dental_1',
      name: 'Professional Teeth Whitening',
      reason: 'VITA shade analysis returned B3 — 3 shades below optimal A1 baseline. Staining distribution is uniform across the incisal third, making in-office bleaching highly effective.',
      confidence: 94,
    },
    {
      id: 'mock_dental_2',
      name: 'Orthodontic Assessment',
      reason: 'Midline deviation detected at 1.8mm and overjet measured at 4.2mm (normal: 2–3mm). Both metrics suggest a mild Class II tendency warranting orthodontic review.',
      confidence: 78,
    },
    {
      id: 'mock_dental_3',
      name: 'Gum Contouring',
      reason: 'Gingival display at rest measures 3.2mm (normal: 0–2mm). A subtle gummy smile is evident. Laser contouring can rebalance the tooth-to-gum ratio with minimal recovery.',
      confidence: 65,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────
// DOMAIN CONFIG
// ─────────────────────────────────────────────────────────────────
interface DomainConfig {
  label: string; shortLabel: string;
  gradient: [string, string]; accentColor: string; accentBg: string; icon: string;
  scoreLabel: (s: number) => string;
  aiSummary: (s: number, f: string[]) => string;
  subScoreKey?: 'symmetry' | 'skin' | 'dental';
  subScoreLabel?: string;
}

const DOMAIN: Record<Domain, DomainConfig> = {
  face: {
    label: 'Facial Harmony Report', shortLabel: 'Facial',
    gradient: ['#2E1065', '#6D28D9'], accentColor: '#A78BFA', accentBg: '#EDE9FE', icon: '✨',
    scoreLabel: (s) => s >= 85 ? 'Excellent facial harmony' : s >= 70 ? 'Balanced facial harmony' : s >= 55 ? 'Moderate facial harmony' : 'Needs attention',
    aiSummary: (s, f) => `Your facial harmony score of ${s}/100 reflects ${s >= 80 ? 'strong' : s >= 65 ? 'moderate' : 'developing'} proportional balance. Landmark-based analysis of symmetry, facial thirds, and structural projections identified ${f.length} notable observations. ${s >= 80 ? 'Clinical measurements indicate well-proportioned facial anatomy with targeted refinements possible.' : 'Several areas may benefit from a specialist consultation.'}`,
    subScoreKey: 'symmetry', subScoreLabel: 'Symmetry Index',
  },
  skin: {
    label: 'Skin Analysis Report', shortLabel: 'Skin',
    gradient: ['#6B21A8', '#BE185D'], accentColor: '#F9A8D4', accentBg: '#FDF2F8', icon: '🧬',
    scoreLabel: (s) => s >= 85 ? 'Excellent skin health' : s >= 70 ? 'Good skin condition' : s >= 55 ? 'Moderate skin health' : 'Elevated skin concerns',
    aiSummary: (s, f) => `Multi-light skin analysis returned a health index of ${s}/100. Hydration, pigmentation, pore activity, and vascular patterns were evaluated across ${f.length} key zones. ${s >= 75 ? 'Your skin barrier appears largely intact.' : 'Signs of barrier compromise and uneven tone were detected.'}`,
    subScoreKey: 'skin', subScoreLabel: 'Skin Health Index',
  },
  dental: {
    label: 'Dental Health Report', shortLabel: 'Dental',
    gradient: ['#0C4A6E', '#0369A1'], accentColor: '#7DD3FC', accentBg: '#F0F9FF', icon: '🦷',
    scoreLabel: (s) => s >= 85 ? 'Excellent dental health' : s >= 70 ? 'Good dental condition' : s >= 55 ? 'Fair dental health' : 'Dental attention needed',
    aiSummary: (s, f) => `Dental scan produced a score of ${s}/100 based on enamel, gum health, occlusal alignment, and staining. ${f.length} observations recorded. ${s >= 80 ? 'Structural integrity is strong with minor cosmetic concerns.' : 'Some areas warrant professional review.'}`,
    subScoreKey: 'dental', subScoreLabel: 'Dental Health Index',
  },
};

// ─────────────────────────────────────────────────────────────────
// SEVERITY CONFIG
// ─────────────────────────────────────────────────────────────────
const SEV_CFG = {
  low:    { label: 'Low',    bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', dot: '#22C55E' },
  medium: { label: 'Medium', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B' },
  high:   { label: 'High',   bg: '#FFF1F2', border: '#FECACA', text: '#991B1B', dot: '#EF4444' },
} as const;

const STATUS_CFG = {
  good:     { color: '#16A34A', bg: '#F0FDF4', label: 'Good' },
  fair:     { color: '#D97706', bg: '#FFFBEB', label: 'Fair' },
  concern:  { color: '#DC2626', bg: '#FFF1F2', label: 'Concern' },
  optimal:  { color: '#16A34A', bg: '#F0FDF4', label: 'Optimal' },
  moderate: { color: '#D97706', bg: '#FFFBEB', label: 'Moderate' },
  attention:{ color: '#DC2626', bg: '#FFF1F2', label: 'Attention' },
} as const;

const SYM_CFG = {
  Even:       { color: '#16A34A', bg: '#F0FDF4' },
  Slight:     { color: '#D97706', bg: '#FFFBEB' },
  Noticeable: { color: '#DC2626', bg: '#FFF1F2' },
};

// ─────────────────────────────────────────────────────────────────
// LANDMARK DATA (inline SVG)
// ─────────────────────────────────────────────────────────────────
const SVG_W = width - 48;
const SVG_H = SVG_W * 1.18;
const cx = SVG_W / 2;
const cy = SVG_H / 2;

const LANDMARKS = [
  { id: 'l_eye',    x: cx - 52, y: cy - 62, label: 'L Eye',    color: '#7C3AED', insight: 'Left eye reference point. Level within 0.3mm of right eye.' },
  { id: 'r_eye',    x: cx + 52, y: cy - 62, label: 'R Eye',    color: '#7C3AED', insight: 'Right eye reference point. Eye level deviation: 0.3mm — clinically even.' },
  { id: 'l_brow',   x: cx - 58, y: cy - 84, label: 'L Brow',   color: '#A855F7', insight: 'Left brow apex. Asymmetry of 1.2mm vs right brow. Slight deviation.' },
  { id: 'r_brow',   x: cx + 58, y: cy - 84, label: 'R Brow',   color: '#A855F7', insight: 'Right brow apex. Brow asymmetry is cosmetically perceptible at close range.' },
  { id: 'nose_tip', x: cx,      y: cy - 8,  label: 'Nose Tip', color: '#EC4899', insight: 'Nasal tip at midline. Nasolabial angle: 104° — within optimal 90–110° range.' },
  { id: 'chin',     x: cx,      y: cy + 125,label: 'Chin',     color: '#22C55E', insight: 'Chin landmark. Projection: −2mm from Ricketts E-line. Mild retrogenia.' },
  { id: 'jaw_l',    x: cx - 86, y: cy + 82, label: 'L Jaw',    color: '#22C55E', insight: 'Left gonion. Gonial angle: 138° — slightly obtuse. Contributes to soft jawline.' },
  { id: 'jaw_r',    x: cx + 86, y: cy + 82, label: 'R Jaw',    color: '#22C55E', insight: 'Right gonion. Jaw symmetry deviation: 1.8mm — slight asymmetry.' },
  { id: 'cheek_l',  x: cx - 84, y: cy + 8,  label: 'L Cheek',  color: '#0EA5E9', insight: 'Left zygomatic prominence. Cheek volume appears symmetric.' },
  { id: 'cheek_r',  x: cx + 84, y: cy + 8,  label: 'R Cheek',  color: '#0EA5E9', insight: 'Right zygomatic prominence. Bilateral cheek projection is balanced.' },
  { id: 'mouth_l',  x: cx - 28, y: cy + 44, label: 'Mouth',    color: '#F59E0B', insight: 'Left oral commissure. Mouth corner deviation: 0.4mm — clinically even.' },
  { id: 'mouth_r',  x: cx + 28, y: cy + 44, label: '',         color: '#F59E0B', insight: 'Right oral commissure. Mouth symmetry is within normal range.' },
];

const CONNECTIONS: [string, string][] = [
  ['l_brow','l_eye'], ['r_brow','r_eye'],
  ['l_eye','nose_tip'], ['r_eye','nose_tip'],
  ['nose_tip','mouth_l'], ['nose_tip','mouth_r'],
  ['mouth_l','chin'], ['mouth_r','chin'],
  ['jaw_l','chin'], ['jaw_r','chin'],
  ['jaw_l','cheek_l'], ['jaw_r','cheek_r'],
  ['l_eye','cheek_l'], ['r_eye','cheek_r'],
  ['l_brow','r_brow'],
];

function getLM(id: string) { return LANDMARKS.find((l) => l.id === id); }

// ─────────────────────────────────────────────────────────────────
// REUSABLE PRIMITIVES
// ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, color, label, size = 148 }: { score: number; color: string; label: string; size?: number }) {
  const [displayed, setDisplayed] = useState(0);
  const ringAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let v = 0;
    const step = Math.max(1, Math.ceil(score / 45));
    const id = setInterval(() => { v = Math.min(v + step, score); setDisplayed(v); if (v >= score) clearInterval(id); }, 25);
    Animated.timing(ringAnim, { toValue: score / 100, duration: 1100, delay: 100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 400, useNativeDriver: true }).start();
    return () => clearInterval(id);
  }, [score]);

  const thickness = 10;
  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: thickness, borderColor: 'rgba(255,255,255,0.18)' }} />
        <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: thickness, borderColor: color, opacity: ringAnim }} />
        <View style={{ width: size - thickness * 2 - 8, height: size - thickness * 2 - 8, borderRadius: (size - thickness * 2 - 8) / 2, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 46, fontWeight: '900', color: '#fff', letterSpacing: -2 }}>{displayed}</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: -4 }}>out of 100</Text>
        </View>
      </View>
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'center' }}>{label}</Text>
      </Animated.View>
    </View>
  );
}

function SeverityBadge({ severity }: { severity: ScanConcern['severity'] }) {
  const cfg = SEV_CFG[severity];
  return (
    <View style={[rp.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[rp.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[rp.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

function FadeSlide({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>{children}</Animated.View>;
}

function SLabel({ text }: { text: string }) {
  return <Text style={rp.sectionLabel}>{text}</Text>;
}

// Animated progress bar
function MeasurementBar({ score, color, delay = 0 }: { score: number; color: string; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: score / 100, duration: 800, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [score]);
  return (
    <View style={cl.barTrack}>
      <Animated.View style={[cl.barFill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: color }]} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// FACIAL-ONLY SECTIONS
// ─────────────────────────────────────────────────────────────────

function ClinicalMeasurementsCard({ data }: { data: ClinicalMeasurement[] }) {
  return (
    <View style={rp.card}>
      <View style={cl.cardHeader}>
        <Text style={cl.cardIcon}>📐</Text>
        <Text style={cl.cardTitle}>Clinical Measurements</Text>
        <View style={cl.sourcePill}>
          <Text style={cl.sourceText}>Landmark-based</Text>
        </View>
      </View>

      {data.map((m, i) => {
        const cfg = STATUS_CFG[m.status];
        return (
          <View key={i} style={[cl.measureRow, i > 0 && cl.rowBorder]}>
            <View style={cl.measureLeft}>
              <Text style={cl.measureLabel}>{m.label}</Text>
              <Text style={cl.measureNote}>{m.note}</Text>
            </View>
            <View style={cl.measureRight}>
              <View style={[cl.statusChip, { backgroundColor: cfg.bg }]}>
                <Text style={[cl.statusChipText, { color: cfg.color }]}>{m.value}{m.unit && <Text style={{ fontSize: 10 }}> {m.unit}</Text>}</Text>
              </View>
              <MeasurementBar score={m.numericScore} color={cfg.color} delay={i * 80} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function SymmetryBreakdownCard({ data }: { data: SymmetryPoint[] }) {
  return (
    <View style={rp.card}>
      <View style={cl.cardHeader}>
        <Text style={cl.cardIcon}>⚖️</Text>
        <Text style={cl.cardTitle}>Symmetry Breakdown</Text>
      </View>
      {data.map((pt, i) => {
        const cfg = SYM_CFG[pt.status];
        return (
          <View key={i} style={[cl.symRow, i > 0 && cl.rowBorder]}>
            <Text style={cl.symLabel}>{pt.label}</Text>
            <Text style={cl.symDelta}>{pt.delta}</Text>
            <View style={[cl.symBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[cl.symBadgeText, { color: cfg.color }]}>{pt.status}</Text>
            </View>
          </View>
        );
      })}
      <View style={cl.symLegend}>
        {(['Even', 'Slight', 'Noticeable'] as const).map((k) => (
          <View key={k} style={cl.symLegendItem}>
            <View style={[cl.symLegendDot, { backgroundColor: SYM_CFG[k].color }]} />
            <Text style={cl.symLegendText}>{k}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function FacialProportionsCard({ thirds }: { thirds: FacialThird[] }) {
  return (
    <View style={rp.card}>
      <View style={cl.cardHeader}>
        <Text style={cl.cardIcon}>📏</Text>
        <Text style={cl.cardTitle}>Facial Proportions</Text>
        <Text style={cl.idealNote}>Ideal: 33.3% each</Text>
      </View>

      {/* Visual stacked bar */}
      <View style={cl.thirdsBarWrap}>
        {thirds.map((t, i) => {
          const colors = ['#6D28D9', '#A855F7', '#C4B5FD'];
          return (
            <View key={i} style={[cl.thirdsSegment, { flex: t.pct, backgroundColor: colors[i] }]}>
              <Text style={cl.thirdsSegmentText}>{t.pct}%</Text>
            </View>
          );
        })}
      </View>
      <View style={cl.thirdsLabels}>
        {thirds.map((t, i) => {
          const diff = t.pct - t.ideal;
          const isImbalanced = Math.abs(diff) >= 2;
          return (
            <View key={i} style={cl.thirdsLabelCol}>
              <Text style={cl.thirdsLabelName}>{t.label.replace(' Third', '')}</Text>
              <Text style={[cl.thirdsLabelPct, { color: isImbalanced ? '#D97706' : '#16A34A' }]}>
                {t.pct}%
              </Text>
              <Text style={cl.thirdsLabelDiff}>
                {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Imbalance callout */}
      {thirds.some((t) => Math.abs(t.pct - t.ideal) >= 2) && (
        <View style={cl.imbalanceNote}>
          <Text style={cl.imbalanceText}>
            ⚠️ Thirds deviation detected. Clinically significant imbalance is typically &gt; 5%. Current variance is minor.
          </Text>
        </View>
      )}
    </View>
  );
}

function ProfileAnalysisCard({ data }: { data: ProfileMetric[] }) {
  return (
    <View style={rp.card}>
      <View style={cl.cardHeader}>
        <Text style={cl.cardIcon}>👤</Text>
        <Text style={cl.cardTitle}>Profile Analysis</Text>
      </View>
      {data.map((m, i) => {
        const cfg = STATUS_CFG[m.status];
        return (
          <View key={i} style={[cl.profileRow, i > 0 && cl.rowBorder]}>
            <View style={cl.profileTop}>
              <Text style={cl.profileLabel}>{m.label}</Text>
              <View style={[cl.statusChip, { backgroundColor: cfg.bg }]}>
                <Text style={[cl.statusChipText, { color: cfg.color }]}>{m.value}</Text>
              </View>
            </View>
            <Text style={cl.profileInsight}>{m.insight}</Text>
          </View>
        );
      })}
    </View>
  );
}

// Inline landmark SVG with tappable dots + tooltip
function LandmarkOverlayCard() {
  const [visible, setVisible] = useState(false);
  const [tooltip, setTooltip] = useState<{ id: string; x: number; y: number; text: string } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!visible) {
      setVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setVisible(false);
        setTooltip(null);
      });
    }
  };

  const tapDot = (lm: typeof LANDMARKS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTooltip(tooltip?.id === lm.id ? null : { id: lm.id, x: lm.x, y: lm.y, text: lm.insight });
  };

  return (
    <View style={rp.card}>
      <View style={cl.cardHeader}>
        <Text style={cl.cardIcon}>🗺️</Text>
        <Text style={cl.cardTitle}>Landmark Overlay</Text>
        <Pressable
          onPress={toggle}
          style={[cl.toggleBtn, visible && cl.toggleBtnActive]}
          android_ripple={{ color: 'rgba(124,58,237,0.15)', borderless: true }}
        >
          <Text style={[cl.toggleBtnText, visible && cl.toggleBtnTextActive]}>
            {visible ? 'Hide' : 'Show Analysis'}
          </Text>
        </Pressable>
      </View>

      <Text style={cl.overlayHint}>
        {visible ? 'Tap any landmark dot to see its clinical insight.' : 'Toggle to view AI-detected facial landmarks and measurement lines.'}
      </Text>

      {visible && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={cl.svgWrap}>
            <Svg width={SVG_W - 32} height={SVG_H - 32}>
              {/* Face oval */}
              <Ellipse cx={(SVG_W - 32) / 2} cy={(SVG_H - 32) / 2} rx={105} ry={138}
                fill="none" stroke="#DDD6FE" strokeWidth="1.5" strokeDasharray="5 4" />

              {/* Connection lines */}
              {CONNECTIONS.map(([a, b], i) => {
                const la = getLM(a); const lb = getLM(b);
                if (!la || !lb) return null;
                // Offset positions for the smaller SVG
                const ox = -16; const oy = -16;
                return (
                  <Line key={i}
                    x1={la.x + ox} y1={la.y + oy}
                    x2={lb.x + ox} y2={lb.y + oy}
                    stroke={la.color} strokeWidth="0.8" opacity={0.3}
                  />
                );
              })}

              {/* Landmark dots */}
              {LANDMARKS.map((lm) => {
                const isActive = tooltip?.id === lm.id;
                const ox = -16; const oy = -16;
                return (
                  <React.Fragment key={lm.id}>
                    {/* Outer glow */}
                    <Circle cx={lm.x + ox} cy={lm.y + oy} r={isActive ? 14 : 8}
                      fill={lm.color} opacity={isActive ? 0.2 : 0.12} />
                    {/* Dot */}
                    <Circle cx={lm.x + ox} cy={lm.y + oy} r={isActive ? 6 : 4}
                      fill={lm.color} opacity={0.92} />
                    {/* Label for named landmarks */}
                    {lm.label ? (
                      <SvgText
                        x={lm.x + ox + 8} y={lm.y + oy - 6}
                        fontSize="8" fill={lm.color} fontWeight="700" opacity={0.85}
                      >
                        {lm.label}
                      </SvgText>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </Svg>

            {/* Tap targets overlay (absolute Pressables over SVG) */}
            {LANDMARKS.map((lm) => {
              const ox = -16; const oy = -16;
              return (
                <Pressable
                  key={lm.id}
                  onPress={() => tapDot(lm)}
                  style={{
                    position: 'absolute',
                    left: lm.x + ox - 16,
                    top:  lm.y + oy - 16,
                    width: 32,
                    height: 32,
                  }}
                />
              );
            })}
          </View>

          {/* Tooltip */}
          {tooltip && (
            <View style={cl.tooltip}>
              <Text style={cl.tooltipTitle}>{LANDMARKS.find((l) => l.id === tooltip.id)?.label || 'Landmark'}</Text>
              <Text style={cl.tooltipText}>{tooltip.text}</Text>
            </View>
          )}

          {/* Legend */}
          <View style={cl.lmLegend}>
            {[
              { color: '#7C3AED', label: 'Eyes & Brows' },
              { color: '#EC4899', label: 'Nose' },
              { color: '#F59E0B', label: 'Mouth' },
              { color: '#22C55E', label: 'Jaw & Chin' },
              { color: '#0EA5E9', label: 'Cheeks' },
            ].map((it) => (
              <View key={it.label} style={cl.lmLegendItem}>
                <View style={[cl.lmLegendDot, { backgroundColor: it.color }]} />
                <Text style={cl.lmLegendText}>{it.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function AiInterpretationCard({ strengths, concerns }: { strengths: string[]; concerns: string[] }) {
  return (
    <View style={[rp.card, { gap: 0 }]}>
      <View style={cl.cardHeader}>
        <Text style={cl.cardIcon}>🧠</Text>
        <Text style={cl.cardTitle}>AI Interpretation</Text>
        <View style={cl.aiBadge}>
          <Text style={cl.aiBadgeText}>AI-generated</Text>
        </View>
      </View>

      <Text style={cl.interpSubHead}>Top Strengths</Text>
      {strengths.map((s, i) => (
        <View key={i} style={[cl.interpRow, i > 0 && { marginTop: 6 }]}>
          <Text style={cl.interpIcon}>✅</Text>
          <Text style={cl.interpText}>{s}</Text>
        </View>
      ))}

      <View style={[cl.rowBorder, { marginVertical: 14 }]} />

      <Text style={[cl.interpSubHead, { color: '#B91C1C' }]}>Top Concerns</Text>
      {concerns.map((c, i) => (
        <View key={i} style={[cl.interpRow, i > 0 && { marginTop: 6 }]}>
          <Text style={cl.interpIcon}>⚠️</Text>
          <Text style={cl.interpText}>{c}</Text>
        </View>
      ))}
    </View>
  );
}

function TreatmentRecsCard({ treatments }: { treatments: TreatmentRec[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <View style={{ gap: 10 }}>
      {treatments.map((t, i) => {
        const open = expanded === i;
        return (
          <Pressable
            key={i}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpanded(open ? null : i); }}
            style={cl.treatCard}
            android_ripple={{ color: 'rgba(124,58,237,0.06)' }}
          >
            <View style={cl.treatHeader}>
              <View style={cl.treatIndexBadge}>
                <Text style={cl.treatIndexText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={cl.treatName}>{t.name}</Text>
                <Text style={cl.treatTarget}>Target: {t.target}</Text>
              </View>
              <Text style={{ fontSize: 16, color: Colors.primary }}>{open ? '▲' : '▼'}</Text>
            </View>

            {open && (
              <View style={cl.treatBody}>
                <View style={cl.treatOutcomeRow}>
                  <Text style={cl.treatOutcomeLabel}>Expected Outcome</Text>
                  <Text style={cl.treatOutcomeText}>{t.expectedOutcome}</Text>
                </View>

                <View style={cl.justificationBox}>
                  <View style={cl.justificationHeader}>
                    <Text style={{ fontSize: 13 }}>📐</Text>
                    <Text style={cl.justificationTitle}>Measurement Justification</Text>
                  </View>
                  <Text style={cl.justificationText}>{t.measurementJustification}</Text>
                </View>

                {/* Price lock */}
                <View style={cl.priceLock}>
                  <Text style={cl.priceLockText}>🔒 Pricing available after doctor consultation</Text>
                </View>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function DoctorCTA({ onPress, subtitle, loading = false }: { onPress: () => void; subtitle?: string; loading?: boolean }) {
  return (
    <View style={cl.doctorCta}>
      <View style={cl.doctorCtaLeft}>
        <Text style={cl.doctorCtaIcon}>👨‍⚕️</Text>
        <View style={{ flex: 1 }}>
          <Text style={cl.doctorCtaTitle}>Consult a Doctor</Text>
          <Text style={cl.doctorCtaSub}>{subtitle ?? 'For accurate clinical diagnosis & personalised treatment plan'}</Text>
        </View>
      </View>
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={[cl.doctorCtaBtn, loading && { opacity: 0.65 }]}
        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
      >
        {loading
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={cl.doctorCtaBtnText}>Book</Text>
        }
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SKIN-ONLY COMPONENTS
// ─────────────────────────────────────────────────────────────────

const CONDITION_SEV: Record<SkinCondition['severity'], { label: string; bg: string; border: string; text: string; bar: string; barPct: string }> = {
  none:     { label: 'None',     bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', bar: '#22C55E', barPct: '0%'   },
  mild:     { label: 'Mild',     bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', bar: '#F59E0B', barPct: '33%'  },
  moderate: { label: 'Moderate', bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412', bar: '#F97316', barPct: '66%'  },
  severe:   { label: 'Severe',   bg: '#FFF1F2', border: '#FECACA', text: '#991B1B', bar: '#EF4444', barPct: '100%' },
};

const LIGHT_COLORS: Record<LightType, string> = {
  Natural: '#F59E0B',
  White:   '#94A3B8',
  Blue:    '#3B82F6',
  Green:   '#22C55E',
  Red:     '#EF4444',
  Raking:  '#8B5CF6',
};

function SkinMetricsCard({ metrics }: { metrics: SkinMetric[] }) {
  return (
    <View style={rp.card}>
      <View style={cl.cardHeader}>
        <Text style={cl.cardIcon}>📊</Text>
        <Text style={cl.cardTitle}>Skin Metrics</Text>
        <View style={cl.sourcePill}>
          <Text style={cl.sourceText}>Multi-light analysis</Text>
        </View>
      </View>
      <View style={sk.metricsGrid}>
        {metrics.map((m, i) => {
          const cfg = STATUS_CFG[m.status];
          return (
            <View key={i} style={sk.metricTile}>
              <Text style={sk.metricIcon}>{m.icon}</Text>
              <Text style={sk.metricLabel}>{m.label}</Text>
              <Text style={[sk.metricScore, { color: cfg.color }]}>{m.score}<Text style={sk.metricUnit}>{m.unit}</Text></Text>
              <View style={sk.metricBarTrack}>
                <Animated.View style={[sk.metricBarFill, { width: `${m.score}%` as any, backgroundColor: cfg.color }]} />
              </View>
              <View style={[sk.metricStatusChip, { backgroundColor: cfg.bg }]}>
                <Text style={[sk.metricStatusText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
              <Text style={sk.metricNote} numberOfLines={2}>{m.note}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SkinConditionsCard({ conditions }: { conditions: SkinCondition[] }) {
  return (
    <View style={{ gap: 10 }}>
      {conditions.map((c, i) => {
        const sev = CONDITION_SEV[c.severity];
        return (
          <View key={i} style={[sk.conditionCard, { borderLeftColor: sev.bar }]}>
            <View style={sk.conditionHeader}>
              <Text style={sk.conditionIcon}>{c.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={sk.conditionName}>{c.name}</Text>
                <Text style={sk.conditionZones}>{c.affectedZones.join(' · ')}</Text>
              </View>
              <View style={[sk.conditionSevBadge, { backgroundColor: sev.bg, borderColor: sev.border }]}>
                <Text style={[sk.conditionSevText, { color: sev.text }]}>{sev.label}</Text>
              </View>
            </View>
            <View style={sk.conditionBarTrack}>
              <View style={[sk.conditionBarFill, { width: sev.barPct as any, backgroundColor: sev.bar }]} />
            </View>
            <Text style={sk.conditionNote}>{c.clinicalNote}</Text>
          </View>
        );
      })}
    </View>
  );
}

function MultiLightGalleryCard({ images }: { images: MultiLightImage[] }) {
  const [selected, setSelected] = useState<MultiLightImage | null>(null);

  const tap = (img: MultiLightImage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(selected?.light === img.light ? null : img);
  };

  return (
    <View style={{ gap: 12 }}>
      {/* 2×3 grid */}
      <View style={rp.card}>
        <View style={cl.cardHeader}>
          <Text style={cl.cardIcon}>🔬</Text>
          <Text style={cl.cardTitle}>Multi-Light Capture</Text>
          <View style={sk.tapHint}>
            <Text style={sk.tapHintText}>Tap to inspect</Text>
          </View>
        </View>
        <View style={sk.lightGrid}>
          {images.map((img, i) => {
            const isActive = selected?.light === img.light;
            return (
              <Pressable
                key={i}
                onPress={() => tap(img)}
                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                style={[sk.lightTile, isActive && sk.lightTileActive]}
              >
                <LinearGradient colors={img.gradientColors} style={sk.lightTileGradient}>
                  <Text style={sk.lightTileIcon}>{img.icon}</Text>
                  <Text style={sk.lightTileLabel}>{img.light}</Text>
                </LinearGradient>
                <View style={sk.lightTileBottom}>
                  <Text style={sk.lightTileReveal} numberOfLines={2}>{img.revealNote}</Text>
                </View>
                {isActive && <View style={[sk.lightTileActiveBorder, { borderColor: img.gradientColors[0] }]} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Detail view — appears below grid on tap */}
      {selected && (
        <FadeSlide delay={0}>
          <View style={sk.lightDetailCard}>
            {/* Header */}
            <LinearGradient colors={selected.gradientColors} style={sk.lightDetailHeader}>
              <Text style={sk.lightDetailIcon}>{selected.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={sk.lightDetailTitle}>{selected.light} Light Analysis</Text>
                <Text style={sk.lightDetailSubtitle}>What this wavelength reveals</Text>
              </View>
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(null); }} style={sk.lightDetailClose}>
                <Text style={sk.lightDetailCloseText}>✕</Text>
              </Pressable>
            </LinearGradient>

            {/* Reveal note */}
            <View style={sk.lightDetailSection}>
              <Text style={sk.lightDetailSectionLabel}>REVEALS</Text>
              <Text style={sk.lightDetailRevealText}>{selected.revealNote}</Text>
            </View>

            {/* AI Findings */}
            <View style={[sk.lightDetailSection, sk.lightDetailBorderTop]}>
              <Text style={sk.lightDetailSectionLabel}>AI FINDINGS</Text>
              {selected.findings.map((f, i) => (
                <View key={i} style={sk.lightFindingRow}>
                  <View style={[sk.lightFindingDot, { backgroundColor: selected.gradientColors[0] }]} />
                  <Text style={sk.lightFindingText}>{f}</Text>
                </View>
              ))}
            </View>

            {/* Limitation */}
            <View style={sk.lightLimitationBox}>
              <Text style={sk.lightLimitationIcon}>⚠️</Text>
              <Text style={sk.lightLimitationText}>{selected.limitation}</Text>
            </View>
          </View>
        </FadeSlide>
      )}
    </View>
  );
}

const SIG_CFG = {
  High:   { bg: '#FFF1F2', border: '#FECACA', text: '#991B1B', dot: '#EF4444' },
  Medium: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B' },
  Low:    { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', dot: '#22C55E' },
};

function CrossLightInsightsCard({ insights }: { insights: CrossLightInsight[] }) {
  return (
    <View style={{ gap: 12 }}>
      {insights.map((ins, i) => {
        const scfg = SIG_CFG[ins.significance];
        return (
          <FadeSlide key={i} delay={i * 70}>
            <View style={sk.crossCard}>
              {/* Finding header */}
              <View style={sk.crossHeader}>
                <View style={[sk.crossSigBadge, { backgroundColor: scfg.bg, borderColor: scfg.border }]}>
                  <View style={[sk.crossSigDot, { backgroundColor: scfg.dot }]} />
                  <Text style={[sk.crossSigText, { color: scfg.text }]}>{ins.significance} Significance</Text>
                </View>
              </View>
              <Text style={sk.crossFinding}>{ins.finding}</Text>

              {/* Detected in lights */}
              <View style={sk.crossLightsRow}>
                <Text style={sk.crossLightsLabel}>Detected in: </Text>
                <View style={sk.crossLightChips}>
                  {ins.detectedIn.map((lt) => (
                    <View key={lt} style={[sk.crossLightChip, { backgroundColor: LIGHT_COLORS[lt] + '22', borderColor: LIGHT_COLORS[lt] + '55' }]}>
                      <Text style={[sk.crossLightChipText, { color: LIGHT_COLORS[lt] }]}>{lt}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Recommendation */}
              <View style={sk.crossRecoBox}>
                <Text style={sk.crossRecoLabel}>💊 Recommendation</Text>
                <Text style={sk.crossRecoText}>{ins.recommendation}</Text>
              </View>
            </View>
          </FadeSlide>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// DENTAL-ONLY COMPONENTS
// ─────────────────────────────────────────────────────────────────

const URGENCY_TIER_CFG: Record<DentalUrgencyTier, { label: string; sublabel: string; bg: string; border: string; text: string; icon: string; barColor: string }> = {
  1: { label: 'Routine',       sublabel: 'No active concern',      bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', icon: '✅', barColor: '#22C55E' },
  2: { label: 'Early Concern', sublabel: 'Review within 4–6 weeks', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: '⚠️', barColor: '#F59E0B' },
  3: { label: 'Active Issue',  sublabel: 'Appointment recommended',  bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412', icon: '🔶', barColor: '#F97316' },
  4: { label: 'Urgent',        sublabel: 'See dentist within 48h',   bg: '#FFF1F2', border: '#FECACA', text: '#991B1B', icon: '🚨', barColor: '#EF4444' },
};

const PAIN_LEVEL_CFG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Mild',     color: '#16A34A', bg: '#F0FDF4' },
  2: { label: 'Moderate', color: '#D97706', bg: '#FFFBEB' },
  3: { label: 'Severe',   color: '#DC2626', bg: '#FFF1F2' },
};

const DENTAL_SEV_CFG: Record<DentalVisualFinding['severity'], { label: string; color: string; bg: string; barPct: string }> = {
  none:     { label: 'None',     color: '#16A34A', bg: '#F0FDF4', barPct: '5%'   },
  mild:     { label: 'Mild',     color: '#D97706', bg: '#FFFBEB', barPct: '33%'  },
  moderate: { label: 'Moderate', color: '#EA580C', bg: '#FFF7ED', barPct: '66%'  },
  severe:   { label: 'Severe',   color: '#DC2626', bg: '#FFF1F2', barPct: '100%' },
};

const TREAT_PRIORITY_CFG: Record<DentalTreatmentSuggestion['priority'], { label: string; bg: string; border: string; text: string; dot: string }> = {
  routine: { label: 'Routine',   bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', dot: '#22C55E' },
  soon:    { label: 'Soon',      bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B' },
  urgent:  { label: 'Urgent',    bg: '#FFF1F2', border: '#FECACA', text: '#991B1B', dot: '#EF4444' },
};

function DentalUrgencyBanner({ tier, reason }: { tier: DentalUrgencyTier; reason: string }) {
  const cfg = URGENCY_TIER_CFG[tier];
  return (
    <View style={[dn.urgencyBanner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={dn.urgencyTop}>
        <Text style={dn.urgencyIcon}>{cfg.icon}</Text>
        <View style={{ flex: 1 }}>
          <View style={dn.urgencyLabelRow}>
            <Text style={[dn.urgencyTierLabel, { color: cfg.text }]}>Tier {tier} — {cfg.label}</Text>
            <Text style={[dn.urgencySublabel, { color: cfg.text, opacity: 0.75 }]}>{cfg.sublabel}</Text>
          </View>
          {/* Tier bar */}
          <View style={dn.tierBarTrack}>
            {([1, 2, 3, 4] as DentalUrgencyTier[]).map((t) => (
              <View
                key={t}
                style={[dn.tierBarSegment, {
                  backgroundColor: t <= tier ? cfg.barColor : '#E2E8F0',
                  opacity: t <= tier ? (0.4 + (t / 4) * 0.6) : 1,
                }]}
              />
            ))}
          </View>
        </View>
      </View>
      <Text style={[dn.urgencyReason, { color: cfg.text }]}>{reason}</Text>
    </View>
  );
}

function PainContextCard({ zones }: { zones: PainZone[] }) {
  if (zones.length === 0) return null;
  const maxPain = Math.max(...zones.map((z) => z.painLevel));
  const painCfg = PAIN_LEVEL_CFG[maxPain];

  return (
    <View style={rp.card}>
      <View style={cl.cardHeader}>
        <Text style={cl.cardIcon}>📍</Text>
        <Text style={cl.cardTitle}>Pain Context</Text>
        <View style={[dn.painLevelBadge, { backgroundColor: painCfg.bg }]}>
          <Text style={[dn.painLevelBadgeText, { color: painCfg.color }]}>{painCfg.label} Pain</Text>
        </View>
      </View>
      <Text style={dn.painContextLabel}>Reported pain areas</Text>
      <View style={dn.zoneChipRow}>
        {zones.map((z) => {
          const pcfg = PAIN_LEVEL_CFG[z.painLevel];
          return (
            <View key={z.id} style={[dn.zoneChip, { backgroundColor: pcfg.bg, borderColor: pcfg.color + '55' }]}>
              <View style={[dn.zoneChipDot, { backgroundColor: pcfg.color }]} />
              <Text style={[dn.zoneChipText, { color: pcfg.color }]}>{z.label}</Text>
              <Text style={[dn.zoneChipLevel, { color: pcfg.color }]}>{pcfg.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SymptomSummaryCard({ symptoms }: { symptoms: DentalSymptomSummary }) {
  const items: { icon: string; label: string; value: string; flagged: boolean }[] = [
    { icon: '⏱', label: 'Pain Type',   value: symptoms.painType,                                    flagged: symptoms.painType.includes('throbbing') },
    { icon: '⚡', label: 'Triggers',   value: symptoms.triggers.join(', ') || 'None reported',      flagged: symptoms.triggers.length > 2 },
    { icon: '📅', label: 'Duration',   value: `${symptoms.durationDays} days`,                      flagged: symptoms.durationDays >= 3 },
    { icon: '🌙', label: 'Night Pain', value: symptoms.nightPain ? 'Present' : 'Not reported',      flagged: symptoms.nightPain },
    { icon: '🫧', label: 'Bad Taste',  value: symptoms.badTaste ? 'Present (possible infection)' : 'None', flagged: symptoms.badTaste },
    { icon: '😵', label: 'Radiating',  value: symptoms.radiatingPain ? 'To jaw / ear' : 'Localised', flagged: symptoms.radiatingPain },
    { icon: '🌡️', label: 'Fever',     value: symptoms.fever ? 'Yes — systemic involvement possible' : 'None', flagged: symptoms.fever },
  ];
  const flagCount = items.filter((i) => i.flagged).length;

  return (
    <View style={rp.card}>
      <View style={cl.cardHeader}>
        <Text style={cl.cardIcon}>📋</Text>
        <Text style={cl.cardTitle}>Symptom Summary</Text>
        {flagCount > 0 && (
          <View style={dn.flagBadge}>
            <Text style={dn.flagBadgeText}>{flagCount} flag{flagCount > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>
      {items.map((item, i) => (
        <View key={i} style={[dn.symptomRow, i > 0 && cl.rowBorder]}>
          <Text style={dn.symptomRowIcon}>{item.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={dn.symptomRowLabel}>{item.label}</Text>
            <Text style={[dn.symptomRowValue, item.flagged && dn.symptomRowFlagged]}>{item.value}</Text>
          </View>
          {item.flagged && <Text style={dn.flagIcon}>🔴</Text>}
        </View>
      ))}
    </View>
  );
}

function VisualFindingsCard({ findings }: { findings: DentalVisualFinding[] }) {
  return (
    <View style={{ gap: 10 }}>
      {findings.map((f, i) => {
        const scfg = DENTAL_SEV_CFG[f.severity];
        return (
          <View key={i} style={[dn.findingCard, { borderLeftColor: scfg.color }]}>
            <View style={dn.findingHeader}>
              <Text style={dn.findingIcon}>{f.icon}</Text>
              <Text style={dn.findingCategory}>{f.category}</Text>
              <View style={[dn.findingSevChip, { backgroundColor: scfg.bg }]}>
                <Text style={[dn.findingSevText, { color: scfg.color }]}>{scfg.label}</Text>
              </View>
            </View>
            <View style={dn.findingBarTrack}>
              <View style={[dn.findingBarFill, { width: scfg.barPct as any, backgroundColor: scfg.color }]} />
            </View>
            <Text style={dn.findingNote}>{f.note}</Text>
          </View>
        );
      })}
    </View>
  );
}

function TargetedAreaCard({ zones }: { zones: PainZone[] }) {
  const [active, setActive] = useState(zones[0]?.id ?? null);
  if (zones.length === 0) return null;
  const current = zones.find((z) => z.id === active) ?? zones[0];

  return (
    <View style={rp.card}>
      <View style={cl.cardHeader}>
        <Text style={cl.cardIcon}>🎯</Text>
        <Text style={cl.cardTitle}>Targeted Area Insight</Text>
        <View style={cl.sourcePill}><Text style={cl.sourceText}>AI-zone analysis</Text></View>
      </View>
      {/* Zone tabs */}
      <View style={dn.zoneTabs}>
        {zones.map((z) => {
          const pcfg = PAIN_LEVEL_CFG[z.painLevel];
          const isActive = z.id === active;
          return (
            <Pressable
              key={z.id}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActive(z.id); }}
              style={[dn.zoneTab, isActive && { backgroundColor: pcfg.color, borderColor: pcfg.color }]}
            >
              <Text style={[dn.zoneTabText, isActive && { color: '#fff' }]}>{z.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {/* Findings for active zone */}
      <View style={dn.zoneDetailBox}>
        <Text style={dn.zoneDetailLabel}>{current.label} — AI Findings</Text>
        {current.aiFindings.map((f, i) => (
          <View key={i} style={dn.zoneFindingRow}>
            <View style={[dn.zoneFindingDot, { backgroundColor: PAIN_LEVEL_CFG[current.painLevel].color }]} />
            <Text style={dn.zoneFindingText}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DentalTreatmentCard({ treatments }: { treatments: DentalTreatmentSuggestion[] }) {
  return (
    <View style={{ gap: 10 }}>
      {treatments.map((t, i) => {
        const pcfg = TREAT_PRIORITY_CFG[t.priority];
        return (
          <View key={i} style={dn.treatCard}>
            <View style={dn.treatHeader}>
              <View style={dn.treatNum}>
                <Text style={dn.treatNumText}>{i + 1}</Text>
              </View>
              <Text style={dn.treatName}>{t.name}</Text>
              <View style={[dn.treatPriority, { backgroundColor: pcfg.bg, borderColor: pcfg.border }]}>
                <View style={[dn.treatPriorityDot, { backgroundColor: pcfg.dot }]} />
                <Text style={[dn.treatPriorityText, { color: pcfg.text }]}>{pcfg.label}</Text>
              </View>
            </View>
            <View style={dn.treatReasonBox}>
              <Text style={dn.treatReasonLabel}>📋 Reason</Text>
              <Text style={dn.treatReasonText}>{t.reason}</Text>
            </View>
            <View style={dn.priceLock}>
              <Text style={dn.priceLockText}>🔒 Pricing available after dentist consultation</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function DentalLimitationsCard({ limitations }: { limitations: string[] }) {
  return (
    <View style={dn.limitCard}>
      <View style={dn.limitHeader}>
        <Text style={dn.limitIcon}>🔬</Text>
        <Text style={dn.limitTitle}>Screening Limitations</Text>
      </View>
      <Text style={dn.limitSubtitle}>Conditions that require X-ray or clinical examination to confirm:</Text>
      {limitations.map((l, i) => (
        <View key={i} style={dn.limitRow}>
          <Text style={dn.limitBullet}>·</Text>
          <Text style={dn.limitText}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────

const PRIORITY_CFG = {
  high:   { label: 'High Priority',   bg: '#FFF1F2', border: '#FECACA', text: '#991B1B', dot: '#EF4444' },
  medium: { label: 'Medium Priority', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B' },
  low:    { label: 'Low Priority',    bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', dot: '#22C55E' },
} as const;

function AiSuggestedTreatmentsCard({ treatments, analysisSource = 'AI Analysis' }: { treatments: RecommendedTreatment[]; analysisSource?: string }) {
  return (
    <View style={{ gap: 12 }}>
      {treatments.map((t, i) => {
        const priority = t.confidence >= 85 ? 'high' : t.confidence >= 65 ? 'medium' : 'low';
        const pcfg = PRIORITY_CFG[priority];
        return (
          <FadeSlide key={t.id ?? i} delay={i * 60}>
            <View style={cl.suggestCard}>
              {/* Card header row */}
              <View style={cl.suggestHeader}>
                <View style={cl.suggestIndexWrap}>
                  <Text style={cl.suggestIndexText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={cl.suggestName}>{t.name}</Text>
                </View>
                <View style={[cl.priorityBadge, { backgroundColor: pcfg.bg, borderColor: pcfg.border }]}>
                  <View style={[cl.priorityDot, { backgroundColor: pcfg.dot }]} />
                  <Text style={[cl.priorityText, { color: pcfg.text }]}>{pcfg.label}</Text>
                </View>
              </View>

              {/* Confidence indicator */}
              <View style={cl.matchRow}>
                <Text style={cl.matchLabel}>AI Confidence</Text>
                <View style={cl.matchBarTrack}>
                  <View style={[cl.matchBarFill, {
                    width: `${t.confidence}%` as any,
                    backgroundColor: t.confidence >= 85 ? '#22C55E' : t.confidence >= 65 ? '#F59E0B' : '#94A3B8',
                  }]} />
                </View>
                <Text style={[cl.matchPct, {
                  color: t.confidence >= 85 ? '#16A34A' : t.confidence >= 65 ? '#D97706' : '#64748B',
                }]}>{t.confidence}%</Text>
              </View>

              {/* Reason */}
              <View style={cl.justificationBox}>
                <View style={cl.justificationHeader}>
                  <Text style={{ fontSize: 13 }}>📐</Text>
                  <Text style={cl.justificationTitle}>{analysisSource}</Text>
                </View>
                <Text style={cl.justificationText}>{t.reason}</Text>
              </View>

              {/* Price lock */}
              <View style={cl.priceLock}>
                <Text style={cl.priceLockText}>🔒 Pricing available after doctor consultation</Text>
              </View>
            </View>
          </FadeSlide>
        );
      })}
    </View>
  );
}

function RecomTreatmentsList({ concerns }: { concerns: any[] }) {
  const [recTreatments, setRecTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTreatments() {
      if (!concerns || concerns.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const catsToFetch = concerns.map(c => {
          const area = (c.area || c.name || c.category || '').toLowerCase();
          if (area.includes('acne')) return 'acne';
          if (area.includes('pigment')) return 'pigmentation';
          if (area.includes('jaw')) return 'jawline';
          if (area.includes('lip')) return 'lips';
          if (area.includes('nose')) return 'nose';
          if (area.includes('eye')) return 'undereye';
          if (area.includes('wrinkle') || area.includes('line') || area.includes('frown')) return 'botox';
          if (area.includes('glow') || area.includes('dull')) return 'glow';
          if (area.includes('hair')) return 'hair';
          return c.category?.toLowerCase() || area;
        }).filter(Boolean);

        const uniqueCats = Array.from(new Set(catsToFetch)).slice(0, 10);
        if (uniqueCats.length === 0) {
          setLoading(false);
          return;
        }

        const q = query(collection(db, 'treatments'), where('category', 'in', uniqueCats));
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        setRecTreatments(results.slice(0, 5));
      } catch (err) {
        console.warn('Error fetching recommendations:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTreatments();
  }, [concerns]);

  if (loading) {
    return <Text style={{ fontSize: 13, color: '#64748B', marginTop: 10, alignSelf: 'center' }}>Loading recommendations...</Text>;
  }
  if (!recTreatments.length) return null;

  return (
    <View style={{ gap: 12, marginTop: 12 }}>
      {recTreatments.map((t, i) => (
        <FadeSlide key={t.id || i} delay={i * 60}>
          <View style={[cl.treatCard, { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={[cl.treatIndexBadge, { backgroundColor: '#F0F9FF', width: 36, height: 36, borderRadius: 18 }]}>
              <Text style={{ fontSize: 16 }}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={cl.treatName}>{t.name}</Text>
              <Text style={cl.treatTarget}>{t.category?.charAt(0).toUpperCase() + t.category?.slice(1)}</Text>
            </View>
          </View>
        </FadeSlide>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// DOCTOR INFO CARD
// ─────────────────────────────────────────────────────────────────

function DoctorInfoCard({ doctorName, doctorSpec }: { doctorName: string; doctorSpec?: string }) {
  const initials = doctorName
    .split(' ')
    .filter((w) => w.length > 0)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <FadeSlide delay={60}>
      <View style={dc.card}>
        {/* Avatar + name block */}
        <View style={dc.left}>
          <LinearGradient colors={['#4C1D95', '#7C3AED']} style={dc.avatar}>
            <Text style={dc.avatarText}>{initials}</Text>
          </LinearGradient>
          <View style={dc.nameBlock}>
            <View style={dc.nameRow}>
              <Text style={dc.doctorIcon}>👨‍⚕️</Text>
              <Text style={dc.doctorName}>{doctorName}</Text>
            </View>
            {!!doctorSpec && <Text style={dc.doctorSpec}>{doctorSpec}</Text>}
          </View>
        </View>

        {/* Verified badge */}
        <View style={dc.badge}>
          <Text style={dc.badgeIcon}>✓</Text>
          <Text style={dc.badgeText}>Verified</Text>
        </View>

        {/* Divider + subtext */}
        <View style={dc.divider} />
        <View style={dc.subtextRow}>
          <Text style={dc.subtextIcon}>🩺</Text>
          <Text style={dc.subtext}>Treatment plan prepared after clinical review</Text>
        </View>
      </View>
    </FadeSlide>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────
export default function AiReportScreen() {
  const router = useRouter();
  const { user } = useUser();
  const raw    = useLocalSearchParams<{ scanId?: string; type?: string; _result?: string; unlocked?: string }>();

  const scanId      = Array.isArray(raw.scanId)   ? raw.scanId[0]   : raw.scanId;
  const typeParam   = Array.isArray(raw.type)     ? raw.type[0]     : raw.type;
  const rawResult   = Array.isArray(raw._result)  ? raw._result[0]  : raw._result;
  // unlocked=true is passed by the "Report Unlocked" notification to skip the paywall
  const paramUnlocked = (Array.isArray(raw.unlocked) ? raw.unlocked[0] : raw.unlocked) === 'true';

  const apiData = (() => { try { return rawResult ? JSON.parse(rawResult) : null; } catch { return null; } })();

  const mockScan =
    MOCK_SCANS.find((s) => s.id === scanId) ??
    MOCK_SCANS.find((s) => s.type === typeParam) ??
    MOCK_SCANS[0];

  // ── Normalise backend response → internal scan shape ────────────
  // Backend may return either:
  //   { scores: { overall, symmetry, ... }, findings: [], urgency }   (v1)
  //   { analysis: { concerns: [], severity: { overall }, notes } }    (v2)
  // We handle both and fall back to safe defaults so the UI never crashes.
  const normalisedScores = apiData
    ? {
        overall:  apiData.scores?.overall  ?? apiData.analysis?.severity?.overall  ?? 75,
        symmetry: apiData.scores?.symmetry ?? apiData.analysis?.severity?.symmetry,
        skin:     apiData.scores?.skin     ?? apiData.analysis?.severity?.skin,
        dental:   apiData.scores?.dental   ?? apiData.analysis?.severity?.dental,
      }
    : null;

  const normalisedFindings: string[] = apiData
    ? (apiData.findings ?? apiData.analysis?.concerns ?? [])
    : [];

  const normalisedUrgency: 'low' | 'medium' | 'high' = apiData
    ? (apiData.urgency ?? (() => {
        const ov = normalisedScores?.overall ?? 75;
        return ov >= 70 ? 'low' : ov >= 50 ? 'medium' : 'high';
      })())
    : 'low';

  // Real API concerns come as { area, severity, note }[] — same shape as ScanConcern
  const normalisedConcerns: ScanConcern[] = apiData?.concerns?.length
    ? apiData.concerns.map((c: any) => ({
        area:     c.area     ?? c.name ?? 'Unknown',
        severity: c.severity ?? 'low',
        note:     c.note     ?? c.description ?? '',
      }))
    : mockScan.concerns ?? [];

  const scan = apiData
    ? {
        id:       apiData.scanId ?? scanId ?? `scan_${Date.now()}`,
        type:     (apiData.type ?? typeParam ?? 'face') as Domain,
        date:     new Date(apiData.createdAt ?? Date.now()),
        scores:   normalisedScores!,
        findings: normalisedFindings,
        concerns: normalisedConcerns,
        urgency:  normalisedUrgency,
      }
    : { ...mockScan, date: new Date(mockScan.date), type: mockScan.type as Domain };

  // ── Live doctor plan (for doctor info card) ───────────────────
  const { plan: livePlan } = useLivePlan(user?.uid ?? null);

  // ── Simulation state (fetched from CF after unlock) ───────────
  const [simulationData, setSimulationData]         = useState<SimulateResultResponse | null>(null);
  const [simulationLoading, setSimulationLoading]   = useState(false);

  // ── Unlock State ──────────────────────────────────────────
  // Always start locked. We check AsyncStorage only using the raw URL
  // scanId param — never scan.id which can fall back to mock IDs like
  // 'scan1' that may already be persisted from a previous mock payment.
  // Mock scan IDs (no real scanId param) always show the paywall.
  // Firestore is the source of truth for unlock state — onSnapshot keeps it
  // live across devices / webhooks. Local state mirrors it so we can still
  // honour the URL ?unlocked=true override and the AsyncStorage fallback for
  // mock scan IDs that never round-trip to Firestore.
  const liveUnlock = useScanUnlock(scanId);
  const [isUnlocked, setIsUnlocked]         = useState(paramUnlocked);
  const [paymentStatus, setPaymentStatus]   = useState<PaymentStatus>('idle');
  const [paymentError, setPaymentError]     = useState<string | undefined>();
  const [justUnlocked, setJustUnlocked]     = useState(false);

  // Promote Firestore-snapshot unlock to local state.
  useEffect(() => {
    if (liveUnlock.unlocked && !isUnlocked) {
      setIsUnlocked(true);
      Analytics.reportViewed({ userId: user?.uid, scanId, scanType: scan.type });
    }
  }, [liveUnlock.unlocked]);

  // Animated values for post-unlock reveal
  const blurFadeOut    = useRef(new Animated.Value(1)).current; // 1=visible, 0=gone
  const bannerSlide    = useRef(new Animated.Value(-80)).current;
  const bannerOpacity  = useRef(new Animated.Value(0)).current;

  // Check persisted unlock state on mount — only for real API scan IDs.
  // scanId (URL param) is undefined/null for mock-data paths, so
  // isReportUnlocked will return false and the paywall always shows.
  useEffect(() => {
    // If the notification passed unlocked=true, trust it and skip the async check
    if (paramUnlocked) {
      fetchSimulation();
      Analytics.reportViewed({ userId: user?.uid, scanId, scanType: scan.type });
      return;
    }
    async function checkUnlock() {
      // Guard: only check if we have a real, non-mock scanId from the URL
      if (!scanId || scanId.startsWith('scan')) return; // 'scan1','scan2'… are mocks
      const unlocked = await isReportUnlocked(scanId);
      if (unlocked) {
        setIsUnlocked(true);
        fetchSimulation();
        Analytics.reportViewed({ userId: user?.uid, scanId, scanType: scan.type });
      } else {
        Analytics.teaserViewed({ userId: user?.uid, scanId, scanType: scan.type });
      }
    }
    checkUnlock();
  }, [scanId]); // depend on URL param, not derived scan.id

  // Handle unlock payment
  const handleUnlock = useCallback(async () => {
    // Use the real scanId from the URL param for payment + persistence.
    // Falls back to scan.id only if the URL param is absent.
    const effectiveScanId = scanId ?? scan.id ?? `tmp_${Date.now()}`;

    // Event 4: user tapped the unlock CTA
    Analytics.unlockClicked({ userId: user?.uid, scanId: effectiveScanId, scanType: scan.type });

    setPaymentStatus('processing');
    setPaymentError(undefined);

    const result = await unlockReport(effectiveScanId, user?.uid, {
      email:   user?.email   ?? undefined,
      contact: (user as any)?.phoneNumber ?? undefined,
      name:    user?.fullName ?? undefined,
    });

    if (result.success) {
      // Event 5: payment succeeded
      Analytics.paymentSuccess({
        userId:   user?.uid,
        scanId:   effectiveScanId,
        scanType: scan.type,
        meta:     { transactionId: result.transactionId ?? '' },
      });

      setPaymentStatus('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Kick off simulation fetch in parallel with the reveal animation
      fetchSimulation();

      // 1. Fade blur overlay out (600ms)
      Animated.timing(blurFadeOut, {
        toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }).start(() => {
        setIsUnlocked(true);
        setPaymentStatus('idle');
        // Event 6: full report is now visible
        Analytics.reportViewed({ userId: user?.uid, scanId: effectiveScanId, scanType: scan.type });
      });

      // 2. Slide-in success banner simultaneously
      setJustUnlocked(true);
      Animated.parallel([
        Animated.timing(bannerSlide,   { toValue: 0,   duration: 480, easing: Easing.out(Easing.back(1.8)), useNativeDriver: true }),
        Animated.timing(bannerOpacity, { toValue: 1,   duration: 320, useNativeDriver: true }),
      ]).start();

      // 3. Auto-dismiss banner after 4s
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(bannerSlide,   { toValue: -80, duration: 340, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(bannerOpacity, { toValue: 0,   duration: 280, useNativeDriver: true }),
        ]).start(() => setJustUnlocked(false));
      }, 3500);
    } else {
      setPaymentStatus('failed');
      setPaymentError(result.error ?? 'Payment failed. Please try again.');
      setTimeout(() => setPaymentStatus('idle'), 3000);
    }
  }, [scanId, scan.id, scan.type, user?.uid, user?.email, user?.fullName]);

  const isFace   = scan.type === 'face';
  const isSkin   = scan.type === 'skin';
  const isDental = scan.type === 'dental';
  const domain   = DOMAIN[scan.type] ?? DOMAIN.face;

  const overallScore = scan.scores?.overall ?? 75;

  const subScore =
    scan.type === 'face'   ? scan.scores?.symmetry :
    scan.type === 'skin'   ? scan.scores?.skin :
    scan.type === 'dental' ? scan.scores?.dental : undefined;

  const scoreColor = overallScore >= 80 ? '#4ADE80' : overallScore >= 60 ? '#FCD34D' : '#F87171';

  // Build facial clinical data (from backend payload or mock)
  const baseClinicalData: FacialClinicalData | null = isFace
    ? (apiData?.clinical ?? buildFacialClinicalData(scan.scores?.symmetry ?? 85))
    : null;

  // Phase 2B: when LiDAR-fused contour data is present, override the matching
  // Clinical Measurements rows with real measurements instead of the mock seed.
  const clinicalData: FacialClinicalData | null = baseClinicalData && isFace && apiData?.contourAnalysis
    ? {
        ...baseClinicalData,
        measurements: baseClinicalData.measurements.map((m) => {
          if (m.label === 'Gonial Angle') {
            const deg = apiData.contourAnalysis!.jawlineAngleDegrees;
            const score = Math.round(Math.max(0, Math.min(100, 100 - Math.abs(deg - 125) * 4)));
            return { ...m, value: `${deg.toFixed(0)}°`, numericScore: score, status: score >= 80 ? 'good' : score >= 60 ? 'fair' : 'concern' };
          }
          if (m.label === 'Chin Projection') {
            const mm = apiData.contourAnalysis!.chinProjection.projectionMM;
            const score = Math.round(Math.max(0, Math.min(100, 50 + mm * 6.25)));
            return { ...m, value: `${mm.toFixed(1)}mm`, numericScore: score, status: score >= 80 ? 'good' : score >= 60 ? 'fair' : 'concern' };
          }
          return m;
        }),
      }
    : baseClinicalData;

  // Build skin clinical data (from backend payload or mock).
  // When the upgraded prompt populates poreAnalysis / wrinkleMapping at the
  // top level, override the matching metric cards so the breakdown reflects
  // real scores instead of the mock seed values.
  const baseSkinData: SkinClinicalData | null = isSkin
    ? (apiData?.skinClinical ?? buildSkinClinicalData(overallScore))
    : null;

  const skinData: SkinClinicalData | null = baseSkinData && isSkin
    ? {
        ...baseSkinData,
        metrics: baseSkinData.metrics.map((m) => {
          if (m.label === 'Pore Score' && apiData?.poreAnalysis?.overallScore != null) {
            return { ...m, score: apiData.poreAnalysis.overallScore };
          }
          if (m.label === 'Wrinkle Score' && apiData?.wrinkleMapping?.overallScore != null) {
            return { ...m, score: apiData.wrinkleMapping.overallScore };
          }
          return m;
        }),
      }
    : baseSkinData;

  // Build dental clinical data (from backend payload or mock)
  const dentalData: DentalClinicalData | null = isDental
    ? (apiData?.dentalClinical ?? buildDentalClinicalData(overallScore))
    : null;

  // AI suggested treatments — from API or domain-specific mock fallback
  const suggestedTreatments: RecommendedTreatment[] =
    apiData?.recommendedTreatments ?? MOCK_RECOMMENDED[scan.type] ?? [];

  // fetchSimulation is declared here so it can close over suggestedTreatments
  const fetchSimulation = useCallback(async () => {
    setSimulationLoading(true);
    try {
      const concerns   = (scan.concerns ?? []).map((c) => c.area);
      const treatments = suggestedTreatments.slice(0, 3).map((t) => t.name);
      // Pull the cached scan image (data URI) from scanImageStore.
      // Falls back to the latest image if the scanId-keyed lookup misses
      // (e.g. mock paths where scanId differs from what processing cached).
      const imageUrl = scanImageStore.get(scanId) ?? scanImageStore.latest();
      if (!imageUrl) {
        console.warn('[simulateResult] no cached scan image available — skipping');
        return;
      }
      const result = await simulateResult({
        imageUrl,
        concerns,
        treatments,
        intensity: scan.urgency === 'high' ? 'enhanced' : scan.urgency === 'medium' ? 'moderate' : 'subtle',
      });
      setSimulationData(result);
    } catch {
      // simulateResult() already has internal fallback — this path is defensive only
    } finally {
      setSimulationLoading(false);
    }
  }, [scan.concerns, scan.urgency, suggestedTreatments]);

  // ── Consult / doctor assignment ───────────────────────────────
  const [consulting, setConsulting] = useState(false);

  const handleConsult = useCallback(async () => {
    if (!user?.uid) {
      Alert.alert('Sign in required', 'Please sign in to book a consultation.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConsulting(true);

    try {
      // scan.type is already 'face' | 'skin' | 'dental' — maps 1-to-1 to DoctorDomain
      const domain = scan.type as DoctorDomain;
      const effectiveScanId = scanId ?? scan.id ?? '';

      const result = await assignDoctorToPatient(user.uid, effectiveScanId, domain);

      if (!result) {
        Alert.alert(
          'No Doctors Available',
          'No doctors available right now. Please try again shortly.',
          [{ text: 'OK' }],
        );
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Doctor Assigned! 🎉',
        `Dr. ${result.doctor.name} appointed for your case.\n\nYou'll receive your personalised treatment plan shortly.`,
        [{ text: 'Got it' }],
      );
    } finally {
      setConsulting(false);
    }
  }, [user?.uid, scan.type, scan.id, scanId]);

  // Real API summary — preferred over generated fallback
  const realSummary: string | null = apiData?.summary ?? null;

  // Generate AI summary snippet for the paywall teaser
  const summarySnippet = realSummary
    ?? (isSkin && skinData ? skinData.aiSummary : domain.aiSummary(overallScore, scan.findings ?? []));

  // Truncate to first 2 sentences when locked (free tier teaser).
  // Looks for "., ?, !" terminators and joins the first two matches.
  const truncatedSummary = (() => {
    if (!summarySnippet) return '';
    const parts = summarySnippet.match(/[^.!?]+[.!?]+/g) ?? [summarySnippet];
    if (parts.length <= 2) return summarySnippet;
    return parts.slice(0, 2).join(' ').trim() + '…';
  })();
  const displaySummary = isUnlocked ? summarySnippet : truncatedSummary;

  // ─── Unified unlock handler ─────────────────────────────────────
  // Replaces the old per-button handlers. Mock-pays in dev, opens Razorpay
  // in production. Firestore onSnapshot promotes the unlock once unlockReport
  // CF writes `unlocked: true`.
  const [unlockCardY, setUnlockCardY] = useState(0);
  const [scrollY, setScrollY]         = useState(0);
  const showFloatingBar = !isUnlocked && unlockCardY > 0 && scrollY > unlockCardY + 60;

  const handleUnlockTap = useCallback(async () => {
    if (paymentStatus === 'processing' || isUnlocked) return;
    const effectiveScanId = scanId ?? scan.id ?? `tmp_${Date.now()}`;
    setPaymentStatus('processing');
    setPaymentError(undefined);
    Analytics.unlockClicked({ userId: user?.uid, scanId: effectiveScanId, scanType: scan.type });

    try {
      const result = isMockPaymentMode()
        ? await mockUnlockReport(effectiveScanId)
        : await unlockReport(effectiveScanId, user?.uid, {
            email:   user?.email ?? '',
            contact: '',
            name:    user?.fullName ?? '',
          });

      if (result.success) {
        setPaymentStatus('success');
        // Firestore onSnapshot will set isUnlocked → true; no manual flip needed.
        // For mock-id scans (no Firestore doc) the local state still flips here
        // because mockUnlockReport persists to AsyncStorage too.
        if (effectiveScanId.startsWith('scan') || effectiveScanId.startsWith('mock_')) {
          setIsUnlocked(true);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Analytics.paymentSuccess({ userId: user?.uid, scanId: effectiveScanId, scanType: scan.type });
      } else {
        setPaymentStatus('failed');
        setPaymentError(result.error ?? 'Payment failed. Try again.');
        Alert.alert('Payment failed', result.error ?? 'Please try again.');
      }
    } catch (err: any) {
      setPaymentStatus('failed');
      setPaymentError(err?.message ?? 'Unknown error');
      Alert.alert('Payment failed', err?.message ?? 'Please try again.');
    }
  }, [paymentStatus, isUnlocked, scanId, scan.id, scan.type, user]);

  return (
    <View style={rp.root}>

      {/* ── Post-unlock success banner (floats above everything) ── */}
      {justUnlocked && (
        <Animated.View
          style={[rp.unlockBanner, { opacity: bannerOpacity, transform: [{ translateY: bannerSlide }] }]}
          pointerEvents="none"
        >
          <LinearGradient colors={['#2E1065', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={rp.unlockBannerGradient}>
            <Text style={rp.unlockBannerIcon}>✨</Text>
            <View style={rp.unlockBannerTextWrap}>
              <Text style={rp.unlockBannerTitle}>Your Full Report is Ready</Text>
              <Text style={rp.unlockBannerSub}>Explore your detailed insights now</Text>
            </View>
            <Text style={rp.unlockBannerCheck}>✓</Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* ── Per-Scan Paywall Overlay (shown when locked) ──── */}
      {/* Urgency warnings render INSIDE the ScrollView (always visible) */}
      {/* The paywall only covers the detailed report content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 }}
        scrollEventThrottle={32}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
      >

        {/* ══ HERO ══════════════════════════════════════════════ */}
        <LinearGradient colors={domain.gradient} style={rp.hero}>
          <SafeAreaView edges={['top']}>
            <View style={rp.navRow}>
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={rp.backBtn} android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}>
                <Text style={rp.backArrow}>‹</Text>
              </Pressable>
              <View style={rp.navCenter}>
                <Text style={rp.navTitle}>Your AI Report</Text>
                <Text style={rp.navSub}>{domain.shortLabel} · {scan.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              </View>
              <Pressable style={rp.shareBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <Text style={{ fontSize: 18 }}>⎙</Text>
              </Pressable>
            </View>

            <View style={rp.chipRow}>
              <View style={rp.domainChip}>
                <Text style={rp.domainChipIcon}>{domain.icon}</Text>
                <Text style={rp.domainChipText}>{domain.label}</Text>
              </View>
            </View>

            <View style={rp.ringWrap}>
              <ScoreRing score={overallScore} color={domain.accentColor} label={domain.scoreLabel(overallScore)} />
            </View>

            <View style={rp.pillRow}>
              {subScore !== undefined && (
                <View style={rp.pill}>
                  <Text style={rp.pillLabel}>{domain.subScoreLabel}</Text>
                  <Text style={[rp.pillVal, { color: domain.accentColor }]}>{subScore}</Text>
                </View>
              )}
              <View style={rp.pill}>
                <Text style={rp.pillLabel}>Priority</Text>
                <Text style={[rp.pillVal, { color: scan.urgency === 'high' ? '#F87171' : scan.urgency === 'medium' ? '#FCD34D' : '#4ADE80' }]}>
                  {(scan.urgency ?? 'low').charAt(0).toUpperCase() + (scan.urgency ?? 'low').slice(1)}
                </Text>
              </View>
              <View style={rp.pill}>
                <Text style={rp.pillLabel}>Concerns</Text>
                <Text style={[rp.pillVal, { color: '#fff' }]}>{(scan.concerns ?? []).length}</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* ══ URGENCY BANNER (non-dental) ═══════════════════════ */}
        {/* 🚨 CRITICAL: Urgency warnings are ALWAYS visible, even when locked */}
        {!isDental && scan.urgency !== 'low' && (
          <FadeSlide delay={80}>
            <View style={[rp.urgencyBanner, { backgroundColor: scan.urgency === 'high' ? '#FFF1F2' : '#FFFBEB', borderColor: scan.urgency === 'high' ? '#FECACA' : '#FDE68A' }]}>
              <Text style={[rp.urgencyText, { color: scan.urgency === 'high' ? '#991B1B' : '#92400E' }]}>
                {scan.urgency === 'high' ? '🚨 Doctor consultation strongly recommended.' : '⚠️ Some findings warrant professional assessment.'}
              </Text>
            </View>
          </FadeSlide>
        )}

        {/* ══ DENTAL ONLY: URGENCY BANNER (replaces generic) ══ */}
        {/* 🚨 CRITICAL: Dental urgency is ALWAYS visible, even when locked */}
        {isDental && dentalData && (
          <FadeSlide delay={80}>
            <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
              <DentalUrgencyBanner tier={dentalData.urgencyTier} reason={dentalData.urgencyReason} />
            </View>
          </FadeSlide>
        )}

        {/* ══ DOCTOR INFO CARD (always visible when plan exists) ══ */}
        {livePlan && (
          <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
            <DoctorInfoCard
              doctorName={livePlan.doctorName}
              doctorSpec={livePlan.doctorSpec}
            />
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════
            LOCKABLE REPORT BODY — everything below this point
            is behind the paywall when isUnlocked = false.
            Urgency banners above are ALWAYS visible.
        ═══════════════════════════════════════════════════════ */}
        <View style={{ position: 'relative' }}>

          {/* ── Paywall Overlay — fades out on unlock ──────────── */}
          {!isUnlocked && (
            <Animated.View style={{ opacity: blurFadeOut }}>
              <ReportPaywall
                isUnlocked={isUnlocked}
                scanType={scan.type}
                overallScore={overallScore}
                findingsCount={(scan.findings ?? []).length}
                concernsCount={(scan.concerns ?? []).length}
                summarySnippet={displaySummary}
                onUnlock={handleUnlock}
                paymentStatus={paymentStatus}
                paymentError={paymentError}
                facialTeaser={isFace && clinicalData ? {
                  topStrength: clinicalData.topStrengths[0],
                  topConcern: clinicalData.topConcerns[0],
                  improvementsCount: clinicalData.topConcerns.length,
                  scoreLabel: `Facial balance: ${domain.scoreLabel(overallScore)}`,
                } : undefined}
                skinTeaser={isSkin && skinData && skinData.conditions.length > 0 ? {
                  overallScore: overallScore,
                  topIssue: `${skinData.conditions[0].severity === 'none' ? '' : skinData.conditions[0].severity.charAt(0).toUpperCase() + skinData.conditions[0].severity.slice(1) + ' '}${skinData.conditions[0].name} detected`.trim(),
                  issueIcon: skinData.conditions[0].icon,
                  concernsCount: skinData.conditions.filter((c) => c.severity !== 'none').length,
                } : undefined}
                dentalTeaser={isDental && dentalData ? {
                  overallScore: overallScore,
                  urgencyTier: dentalData.urgencyTier,
                  urgencyReason: dentalData.urgencyReason,
                } : undefined}
              />
            </Animated.View>
          )}

        {/* ══ DENTAL ONLY: PAIN CONTEXT ════════════════════════ */}
        {isDental && dentalData && dentalData.painZones.length > 0 && (
          <FadeSlide delay={130}>
            <View style={rp.section}>
              <SLabel text="📍 PAIN CONTEXT" />
              <PainContextCard zones={dentalData.painZones} />
            </View>
          </FadeSlide>
        )}

        {/* ══ DENTAL ONLY: SYMPTOM SUMMARY ════════════════════ */}
        {isDental && dentalData?.symptomSummary && (
          <FadeSlide delay={180}>
            <View style={rp.section}>
              <SLabel text="📋 SYMPTOM SUMMARY" />
              <SymptomSummaryCard symptoms={dentalData.symptomSummary} />
            </View>
          </FadeSlide>
        )}

        {/* ══ DENTAL ONLY: VISUAL FINDINGS ════════════════════ */}
        {isDental && dentalData && (
          <FadeSlide delay={230}>
            <View style={rp.section}>
              <SLabel text="🦷 VISUAL FINDINGS" />
              <VisualFindingsCard findings={dentalData.visualFindings} />
            </View>
          </FadeSlide>
        )}

        {/* ══ DENTAL ONLY: TARGETED AREA INSIGHT ═════════════ */}
        {isDental && dentalData && dentalData.painZones.length > 0 && (
          <FadeSlide delay={280}>
            <View style={rp.section}>
              <SLabel text="🎯 TARGETED AREA INSIGHT" />
              <TargetedAreaCard zones={dentalData.painZones} />
            </View>
          </FadeSlide>
        )}

        {/* ══ UNLOCK CTA — between free preview and locked content ══ */}
        {!isUnlocked && (
          <View
            onLayout={(e) => setUnlockCardY(e.nativeEvent.layout.y)}
          >
            <UnlockCard
              onPress={handleUnlockTap}
              loading={paymentStatus === 'processing'}
              scanType={scan.type as 'face' | 'skin' | 'dental'}
            />
          </View>
        )}

        {/* ══ SKIN ONLY: ZONE HEAT MAP (locked) ═══════════════ */}
        {isSkin && apiData?.zoneScores && (
          <FadeSlide delay={90}>
            <View style={rp.section}>
              <SLabel text="🗺️ ZONE ANALYSIS" />
              <LockedSection unlocked={isUnlocked} onTapLocked={handleUnlockTap}>
                <SkinFaceHeatMap
                  zoneScores={apiData.zoneScores}
                  faceMesh={apiData.hasFaceMesh ? apiData.faceMesh : null}
                />
              </LockedSection>
            </View>
          </FadeSlide>
        )}

        {/* ══ SKIN ONLY: PORE & WRINKLE & SKIN AGE (locked) ══ */}
        {isSkin && (apiData?.poreAnalysis || apiData?.wrinkleMapping || apiData?.overallSkinAge || apiData?.hydrationAppearance) && (
          <FadeSlide delay={100}>
            <View style={[rp.section, { gap: 12 }]}>
              <LockedSection unlocked={isUnlocked} onTapLocked={handleUnlockTap}>
                <View style={{ gap: 12 }}>
                  {apiData?.overallSkinAge && (
                    <View style={{ alignSelf: 'flex-start' }}>
                      <SkinAgeBadge data={apiData.overallSkinAge} />
                    </View>
                  )}
                  {apiData?.poreAnalysis        && <PoreScoreCard data={apiData.poreAnalysis} />}
                  {apiData?.wrinkleMapping      && <WrinkleMapCard data={apiData.wrinkleMapping} />}
                  {apiData?.hydrationAppearance && <HydrationGauge data={apiData.hydrationAppearance} />}
                </View>
              </LockedSection>
            </View>
          </FadeSlide>
        )}

        {/* ══ SKIN ONLY: METRICS ═══════════════════════════════ */}
        {isSkin && skinData && (
          <FadeSlide delay={120}>
            <View style={rp.section}>
              <SLabel text="📊 SKIN METRICS" />
              <SkinMetricsCard metrics={skinData.metrics} />
            </View>
          </FadeSlide>
        )}

        {/* ══ SKIN ONLY: CONDITIONS ════════════════════════════ */}
        {isSkin && skinData && (
          <FadeSlide delay={180}>
            <View style={rp.section}>
              <SLabel text="🩺 DETECTED CONDITIONS" />
              <SkinConditionsCard conditions={skinData.conditions} />
            </View>
          </FadeSlide>
        )}

        {/* ══ SKIN ONLY: MULTI-LIGHT GALLERY ══════════════════ */}
        {isSkin && skinData && (
          <FadeSlide delay={240}>
            <View style={rp.section}>
              <View style={sk.galleryHeaderRow}>
                <SLabel text="🔬 MULTI-LIGHT ANALYSIS" />
                <View style={sk.galleryBadge}>
                  <Text style={sk.galleryBadgeText}>6 wavelengths</Text>
                </View>
              </View>
              <MultiLightGalleryCard images={skinData.multiLight} />
            </View>
          </FadeSlide>
        )}

        {/* ══ SKIN ONLY: CROSS-LIGHT INSIGHTS ══════════════════ */}
        {isSkin && skinData && (
          <FadeSlide delay={300}>
            <View style={rp.section}>
              <View style={sk.galleryHeaderRow}>
                <SLabel text="⚡ CROSS-LIGHT INSIGHTS" />
                <View style={[sk.galleryBadge, { backgroundColor: '#EDE9FE' }]}>
                  <Text style={[sk.galleryBadgeText, { color: Colors.primary }]}>Most Important</Text>
                </View>
              </View>
              <CrossLightInsightsCard insights={skinData.crossLightInsights} />
            </View>
          </FadeSlide>
        )}

        {/* ══ FACIAL ONLY: 3D CONTOUR (Phase 2B, LiDAR-fused) ══ */}
        {isFace && apiData?.contourAnalysis && (
          <FadeSlide delay={90}>
            <View style={[rp.section, { gap: 12 }]}>
              <SLabel text="🧊 3D FACIAL CONTOUR" />
              <LockedSection unlocked={isUnlocked} onTapLocked={handleUnlockTap}>
                <View style={{ gap: 12 }}>
                  <FacialDepthMapCard
                    data={apiData.contourAnalysis.facialDepthMap}
                    hasLiDAR={!!apiData.hasLiDAR}
                  />
                  <JawlineProfileCard
                    contour={apiData.contourAnalysis}
                    hasLiDAR={!!apiData.hasLiDAR}
                  />
                  <ChinProjectionCard
                    chin={apiData.contourAnalysis.chinProjection}
                    hasLiDAR={!!apiData.hasLiDAR}
                  />
                  <CheekboneCard
                    data={apiData.contourAnalysis.cheekboneProminence}
                    hasLiDAR={!!apiData.hasLiDAR}
                  />
                </View>
              </LockedSection>
            </View>
          </FadeSlide>
        )}

        {/* ══ FACIAL ONLY: CLINICAL MEASUREMENTS ══════════════ */}
        {isFace && clinicalData && (
          <FadeSlide delay={120}>
            <View style={rp.section}>
              <SLabel text="📐 CLINICAL MEASUREMENTS" />
              <ClinicalMeasurementsCard data={clinicalData.measurements} />
            </View>
          </FadeSlide>
        )}

        {/* ══ FACIAL ONLY: SYMMETRY BREAKDOWN ═════════════════ */}
        {isFace && clinicalData && (
          <FadeSlide delay={180}>
            <View style={rp.section}>
              <SLabel text="⚖️ SYMMETRY BREAKDOWN" />
              <SymmetryBreakdownCard data={clinicalData.symmetry} />
            </View>
          </FadeSlide>
        )}

        {/* ══ FACIAL ONLY: FACIAL PROPORTIONS ═════════════════ */}
        {isFace && clinicalData && (
          <FadeSlide delay={230}>
            <View style={rp.section}>
              <SLabel text="📏 FACIAL PROPORTIONS" />
              <FacialProportionsCard thirds={clinicalData.thirds} />
            </View>
          </FadeSlide>
        )}

        {/* ══ FACIAL ONLY: PROFILE ANALYSIS ═══════════════════ */}
        {isFace && clinicalData && (
          <FadeSlide delay={270}>
            <View style={rp.section}>
              <SLabel text="👤 PROFILE ANALYSIS" />
              <ProfileAnalysisCard data={clinicalData.profile} />
            </View>
          </FadeSlide>
        )}

        {/* ══ FACIAL ONLY: LANDMARK OVERLAY ════════════════════ */}
        {isFace && (
          <FadeSlide delay={310}>
            <View style={rp.section}>
              <SLabel text="🗺️ LANDMARK OVERLAY" />
              <LandmarkOverlayCard />
            </View>
          </FadeSlide>
        )}

        {/* ══ KEY CONCERNS (all domains) ════════════════════════ */}
        <FadeSlide delay={350}>
          <View style={rp.section}>
            <SLabel text="KEY CONCERNS" />
            <View style={rp.card}>
              {(scan.concerns ?? []).length === 0 ? (
                <View style={rp.emptyRow}><Text style={rp.emptyIcon}>✅</Text><Text style={rp.emptyText}>No concerns detected.</Text></View>
              ) : (
                (scan.concerns ?? []).map((c, i) => (
                  <View key={i} style={[rp.concernSummaryRow, i > 0 && rp.hairline]}>
                    <View style={[rp.concernDot, { backgroundColor: SEV_CFG[c.severity].dot }]} />
                    <Text style={rp.concernSummaryName} numberOfLines={1}>{c.area}</Text>
                    <SeverityBadge severity={c.severity} />
                  </View>
                ))
              )}
            </View>
            {(scan.concerns ?? []).length > 0 && (
              <View style={rp.legendRow}>
                {(['low', 'medium', 'high'] as const).map((sev) => (
                  <View key={sev} style={rp.legendItem}>
                    <View style={[rp.legendDot, { backgroundColor: SEV_CFG[sev].dot }]} />
                    <Text style={rp.legendText}>{SEV_CFG[sev].label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </FadeSlide>

        {/* ══ FACIAL ONLY: AI INTERPRETATION ══════════════════ */}
        {isFace && clinicalData && (
          <FadeSlide delay={390}>
            <View style={rp.section}>
              <SLabel text="🧠 AI INTERPRETATION" />
              <AiInterpretationCard strengths={clinicalData.topStrengths} concerns={clinicalData.topConcerns} />
            </View>
          </FadeSlide>
        )}

        {/* ══ AI ANALYSIS SUMMARY ═══════════════════════════════ */}
        <FadeSlide delay={420}>
          <View style={rp.section}>
            <SLabel text="AI ANALYSIS SUMMARY" />
            <View style={[rp.card, rp.aiCard]}>
              <View style={[rp.aiTag, { backgroundColor: domain.accentBg }]}>
                <Text style={[rp.aiTagText, { color: domain.gradient[1] }]}>🤖 AI-generated insight</Text>
              </View>
              {/* Prefer real API summary → skin multi-light summary → generated fallback */}
              <Text style={rp.aiParagraph}>
                {realSummary ?? (isSkin && skinData ? skinData.aiSummary : domain.aiSummary(overallScore, scan.findings ?? []))}
              </Text>
              {(scan.findings ?? []).length > 0 && (
                <View style={[rp.findingsList, rp.topBorder]}>
                  {(scan.findings ?? []).map((f, i) => (
                    <View key={i} style={rp.findingRow}>
                      <View style={[rp.findingBullet, { backgroundColor: scoreColor }]} />
                      <Text style={rp.findingText}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={rp.disclaimerBox}>
                <Text style={rp.disclaimerText}>ℹ️ This analysis is AI-generated and is not a medical diagnosis. Review with a qualified professional before any treatment decisions.</Text>
              </View>
            </View>
          </View>
        </FadeSlide>

        {/* ══ FULL CONCERN BREAKDOWN (all domains) ═════════════ */}
        {(scan.concerns ?? []).length > 0 && (
          <FadeSlide delay={460}>
            <View style={rp.section}>
              <SLabel text={`FULL CONCERN BREAKDOWN · ${(scan.concerns ?? []).length} AREA${(scan.concerns ?? []).length > 1 ? 'S' : ''}`} />
              {(scan.concerns ?? []).map((c, i) => {
                const cfg = SEV_CFG[c.severity];
                return (
                  <View key={i} style={[rp.concernCard, { borderLeftColor: cfg.dot }]}>
                    <View style={rp.concernCardHeader}>
                      <Text style={rp.concernCardTitle}>{c.area}</Text>
                      <SeverityBadge severity={c.severity} />
                    </View>
                    <Text style={rp.concernCardNote}>{c.note}</Text>
                    <View style={rp.sevBar}>
                      <View style={[rp.sevBarFill, { width: c.severity === 'low' ? '33%' : c.severity === 'medium' ? '66%' : '100%', backgroundColor: cfg.dot }]} />
                    </View>
                    <Text style={[rp.sevBarLabel, { color: cfg.text }]}>{cfg.label} severity</Text>
                  </View>
                );
              })}
            </View>
          </FadeSlide>
        )}

        {/* ══ RECOMMENDED FOR YOU (all domains) ════════════════════════════════ */}
        {(scan.concerns ?? []).length > 0 && (
          <FadeSlide delay={490}>
            <View style={rp.section}>
              <View style={cl.suggestSectionHeader}>
                <Text style={rp.sectionLabel}>RECOMMENDED FOR YOU</Text>
                <View style={[cl.aiSourcePill, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[cl.aiSourceText, { color: '#3B82F6' }]}>Personalised Match</Text>
                </View>
              </View>
              <RecomTreatmentsList concerns={scan.concerns} />
            </View>
          </FadeSlide>
        )}

        {/* ══ DENTAL ONLY: AI INTERPRETATION ══════════════════ */}
        {isDental && dentalData && (
          <FadeSlide delay={490}>
            <View style={rp.section}>
              <SLabel text="🧠 AI INTERPRETATION" />
              <View style={[rp.card, rp.aiCard]}>
                <View style={[rp.aiTag, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[rp.aiTagText, { color: '#1D4ED8' }]}>🤖 AI-generated — not a diagnosis</Text>
                </View>
                <Text style={rp.aiParagraph}>{dentalData.aiInterpretation}</Text>
                <View style={rp.disclaimerBox}>
                  <Text style={rp.disclaimerText}>ℹ️ This interpretation is based on image analysis and reported symptoms. It is not a clinical diagnosis. Confirm findings with a licensed dentist.</Text>
                </View>
              </View>
            </View>
          </FadeSlide>
        )}

        {/* ══ DENTAL ONLY: TREATMENT SUGGESTIONS ══════════════ */}
        {isDental && dentalData && (
          <FadeSlide delay={530}>
            <View style={rp.section}>
              <SLabel text="💊 TREATMENT SUGGESTIONS" />
              <DentalTreatmentCard treatments={dentalData.treatmentSuggestions} />
            </View>
          </FadeSlide>
        )}

        {/* ══ DENTAL ONLY: LIMITATIONS ═════════════════════════ */}
        {isDental && dentalData && (
          <FadeSlide delay={570}>
            <View style={rp.section}>
              <DentalLimitationsCard limitations={dentalData.limitations} />
            </View>
          </FadeSlide>
        )}

        {/* ══ FACIAL ONLY: TREATMENT RECOMMENDATIONS ═══════════ */}
        {isFace && clinicalData && (
          <FadeSlide delay={560}>
            <View style={rp.section}>
              <SLabel text="💊 TREATMENT DETAIL" />
              <TreatmentRecsCard treatments={clinicalData.treatments} />
            </View>
          </FadeSlide>
        )}

        {/* ══ SIMULATION SECTION ═══════════════════════════════ */}
        <FadeSlide delay={600}>
          <View style={rp.section}>
            <SLabel text="✨ TREATMENT SIMULATION" />

            {!isUnlocked ? (
              /* ── Teaser (locked) ─────────────────────────────────── */
              <View style={rp.simTeaserCard}>
                <LinearGradient colors={domain.gradient} style={rp.simTeaserGradient}>
                  <Text style={rp.simTeaserLock}>🔒</Text>
                  <Text style={rp.simTeaserTitle}>What Could Change?</Text>
                  <Text style={rp.simTeaserBody}>
                    Unlock your full report to see AI-projected improvements, treatment timeline,
                    and a personalised action plan based on your scan.
                  </Text>
                  <View style={rp.simTeaserItems}>
                    {['Projected improvements', 'Treatment timeline', 'Personalised action plan'].map((item) => (
                      <View key={item} style={rp.simTeaserRow}>
                        <View style={rp.simTeaserDot} />
                        <Text style={rp.simTeaserItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    onPress={handleUnlock}
                    disabled={paymentStatus === 'processing'}
                    style={rp.simTeaserBtn}
                  >
                    <Text style={rp.simTeaserBtnText}>
                      {paymentStatus === 'processing' ? 'Processing…' : 'Unlock for ₹99'}
                    </Text>
                  </Pressable>
                </LinearGradient>
              </View>
            ) : simulationLoading ? (
              /* ── Loading skeleton ────────────────────────────────── */
              <View style={[rp.card, { alignItems: 'center', paddingVertical: 28, gap: 10 }]}>
                <Text style={{ fontSize: 24 }}>⏳</Text>
                <Text style={{ fontSize: 14, color: '#64748B', fontWeight: '600' }}>Generating your simulation…</Text>
              </View>
            ) : simulationData ? (
              /* ── Full simulation results ─────────────────────────── */
              <View style={{ gap: 14 }}>

                {/* Summary */}
                <View style={[rp.card, rp.aiCard]}>
                  <View style={[rp.aiTag, { backgroundColor: domain.accentBg }]}>
                    <Text style={[rp.aiTagText, { color: domain.gradient[1] }]}>🤖 AI Simulation</Text>
                  </View>
                  <Text style={rp.aiParagraph}>{simulationData.summary}</Text>
                </View>

                {/* Improvements */}
                <View style={rp.card}>
                  <Text style={rp.simSectionHead}>Projected Improvements</Text>
                  {simulationData.improvements.map((item, i) => (
                    <View key={i} style={[rp.simImprovementRow, i > 0 && rp.hairline]}>
                      <View style={[rp.simImprovementDot, { backgroundColor: domain.gradient[1] }]} />
                      <Text style={rp.simImprovementText}>{item}</Text>
                    </View>
                  ))}
                </View>

                {/* Timeline */}
                <View style={[rp.card, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
                  <View style={[rp.simTimelineIcon, { backgroundColor: domain.accentBg }]}>
                    <Text style={{ fontSize: 22 }}>📅</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={rp.simTimelineLabel}>Expected Timeline</Text>
                    <Text style={[rp.simTimelineValue, { color: domain.gradient[1] }]}>{simulationData.timeline}</Text>
                  </View>
                </View>

              </View>
            ) : null}
          </View>
        </FadeSlide>

        </View>{/* end of lockable report body */}

        {/* ══ DOCTOR CTA ════════════════════════════════════════ */}
        <FadeSlide delay={540}>
          <View style={rp.section}>
            <DoctorCTA
              subtitle={
                simulationData?.cta
                  ? simulationData.cta
                  : isSkin   ? 'Consult a dermatologist for proper diagnosis & personalised skin protocol'
                  : isDental ? 'Consult a dentist for proper clinical diagnosis, X-ray, and treatment plan'
                  : undefined
              }
              onPress={handleConsult}
              loading={consulting}
            />
          </View>
        </FadeSlide>

        {/* ══ MEDICAL DISCLAIMER ════════════════════════════════ */}
        <FadeSlide delay={580}>
          <View style={rp.section}>
            <View style={rp.finalDisclaimer}>
              <Text style={rp.finalDisclaimerTitle}>Medical Disclaimer</Text>
              <Text style={rp.finalDisclaimerBody}>
                This report is generated by AI using image analysis and landmark detection algorithms. It is intended for informational purposes only and does not constitute a medical diagnosis, clinical assessment, or treatment recommendation. Always consult a licensed medical professional before taking any action based on this report. Actual clinical outcomes may differ from AI projections.
              </Text>
            </View>
          </View>
        </FadeSlide>

      </ScrollView>

      {/* ── Sticky unlock bar — appears once user scrolls past UnlockCard ── */}
      <UnlockFloatingBar
        visible={showFloatingBar}
        onPress={handleUnlockTap}
        loading={paymentStatus === 'processing'}
      />

      {/* ── Fixed bottom CTA ──────────────────────────────────── */}
      <View style={rp.ctaWrap}>
        {isUnlocked ? (
          <>
            {/* Download Report */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // TODO: generate PDF/share sheet
              }}
              style={rp.ctaSecondary}
              android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
            >
              <Text style={rp.ctaDownloadIcon}>⬇</Text>
              <Text style={rp.ctaSecondaryText}>Download</Text>
            </Pressable>

            {/* Consult Doctor */}
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/care/consult-doctor'); }}
              style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <LinearGradient colors={domain.gradient} style={rp.ctaBtn}>
                <Text style={rp.ctaBtnText}>Consult Doctor</Text>
              </LinearGradient>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={handleUnlock}
            disabled={paymentStatus === 'processing'}
            style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            <LinearGradient colors={paymentStatus === 'processing' ? ['#94A3B8', '#64748B'] : domain.gradient} style={rp.ctaBtn}>
              <Text style={rp.ctaBtnText}>
                {paymentStatus === 'processing' ? 'Processing...' : 'Unlock Full Report — ₹99'}
              </Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES — doctor info card
// ─────────────────────────────────────────────────────────────────
const dc = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  nameBlock: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  doctorIcon: {
    fontSize: 15,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
    letterSpacing: -0.2,
  },
  doctorSpec: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  badgeIcon: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '800',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 10,
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subtextIcon: {
    fontSize: 13,
  },
  subtext: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    fontStyle: 'italic',
    flex: 1,
  },
});

// ─────────────────────────────────────────────────────────────────
// STYLES — base (rp) + clinical extensions (cl)
// ─────────────────────────────────────────────────────────────────
const rp = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },
  hero: { paddingHorizontal: 20, paddingBottom: 32 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: '#fff', lineHeight: 32 },
  navCenter: { flex: 1, alignItems: 'center' },
  navTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  navSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  shareBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },
  chipRow: { alignItems: 'center', marginBottom: 24 },
  domainChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  domainChipIcon: { fontSize: 14 },
  domainChipText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  ringWrap: { alignItems: 'center', marginBottom: 28 },
  pillRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  pill: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  pillLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  pillVal: { fontSize: 16, fontWeight: '900' },
  urgencyBanner: { marginHorizontal: 16, marginTop: 14, borderRadius: 14, padding: 14, borderWidth: 1 },
  urgencyText: { fontSize: 13, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.1, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  hairline: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  topBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0', paddingTop: 14, marginTop: 14 },
  concernSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  concernDot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  concernSummaryName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1E293B' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  legendRow: { flexDirection: 'row', gap: 18, marginTop: 10, paddingLeft: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  emptyIcon: { fontSize: 22 },
  emptyText: { fontSize: 14, color: '#64748B' },
  aiCard: { gap: 14 },
  aiTag: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  aiTagText: { fontSize: 12, fontWeight: '700' },
  aiParagraph: { fontSize: 14, color: '#374151', lineHeight: 23 },
  findingsList: { gap: 0 },
  findingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F1F5F9' },
  findingBullet: { width: 7, height: 7, borderRadius: 4, marginTop: 7, flexShrink: 0 },
  findingText: { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 20 },
  disclaimerBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  disclaimerText: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  concernCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: '#E2E8F0', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }, android: { elevation: 2 } }) },
  concernCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  concernCardTitle: { fontSize: 16, fontWeight: '800', color: '#111827', flex: 1 },
  concernCardNote: { fontSize: 13, color: '#4B5563', lineHeight: 21, marginBottom: 14 },
  sevBar: { height: 5, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', marginBottom: 5 },
  sevBarFill: { height: 5, borderRadius: 3 },
  sevBarLabel: { fontSize: 11, fontWeight: '700' },
  finalDisclaimer: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0' },
  finalDisclaimerTitle: { fontSize: 13, fontWeight: '800', color: '#475569', marginBottom: 8 },
  finalDisclaimerBody: { fontSize: 12, color: '#64748B', lineHeight: 19 },
  ctaWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 16, backgroundColor: 'rgba(248,247,255,0.97)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0', flexDirection: 'row', gap: 10 },
  ctaBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  ctaBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  ctaSecondary: { height: 52, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1.5, borderColor: '#DDD6FE', flexDirection: 'row', gap: 4 },
  ctaSecondaryText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  ctaDownloadIcon: { fontSize: 14, color: Colors.primary },

  // Simulation section
  simTeaserCard: { borderRadius: 20, overflow: 'hidden' },
  simTeaserGradient: { padding: 22, gap: 10 },
  simTeaserLock: { fontSize: 28, textAlign: 'center' },
  simTeaserTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  simTeaserBody: { fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 20, textAlign: 'center' },
  simTeaserItems: { gap: 8, marginTop: 4 },
  simTeaserRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  simTeaserDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.7)' },
  simTeaserItemText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  simTeaserBtn: { marginTop: 6, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  simTeaserBtnText: { fontSize: 15, fontWeight: '800', color: '#2E1065' },
  simSectionHead: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  simImprovementRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9 },
  simImprovementDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  simImprovementText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },
  simTimelineIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  simTimelineLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  simTimelineValue: { fontSize: 15, fontWeight: '800' },

  // Post-unlock success banner
  unlockBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    ...Platform.select({
      ios:     { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 16 },
    }),
  },
  unlockBannerGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 54 : 14,
  },
  unlockBannerIcon:     { fontSize: 22 },
  unlockBannerTextWrap: { flex: 1 },
  unlockBannerTitle:    { fontSize: 15, fontWeight: '900', color: '#fff' },
  unlockBannerSub:      { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginTop: 1 },
  unlockBannerCheck:    { fontSize: 20, color: '#A7F3D0', fontWeight: '900' },
});

const cl = StyleSheet.create({
  // Shared card header
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardIcon:   { fontSize: 18 },
  cardTitle:  { fontSize: 16, fontWeight: '800', color: '#111827', flex: 1 },
  sourcePill: { backgroundColor: '#EDE9FE', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  sourceText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  idealNote:  { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  rowBorder:  { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F1F5F9' },

  // Measurement rows
  measureRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  measureLeft:  { flex: 1 },
  measureLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 3 },
  measureNote:  { fontSize: 11, color: '#64748B', lineHeight: 16 },
  measureRight: { width: 110, gap: 6 },
  statusChip:   { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-end' },
  statusChipText:{ fontSize: 12, fontWeight: '800' },
  barTrack:     { height: 5, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  barFill:      { height: 5, borderRadius: 3 },

  // Symmetry
  symRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  symLabel:       { flex: 1, fontSize: 14, fontWeight: '600', color: '#1E293B' },
  symDelta:       { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginRight: 10 },
  symBadge:       { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  symBadgeText:   { fontSize: 11, fontWeight: '800' },
  symLegend:      { flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F1F5F9' },
  symLegendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  symLegendDot:   { width: 8, height: 8, borderRadius: 4 },
  symLegendText:  { fontSize: 11, color: '#64748B', fontWeight: '600' },

  // Thirds
  thirdsBarWrap:    { flexDirection: 'row', height: 34, borderRadius: 10, overflow: 'hidden', marginBottom: 10 },
  thirdsSegment:    { alignItems: 'center', justifyContent: 'center' },
  thirdsSegmentText:{ fontSize: 11, fontWeight: '800', color: '#fff' },
  thirdsLabels:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  thirdsLabelCol:   { flex: 1, alignItems: 'center', gap: 2 },
  thirdsLabelName:  { fontSize: 11, color: '#64748B', fontWeight: '600' },
  thirdsLabelPct:   { fontSize: 15, fontWeight: '900' },
  thirdsLabelDiff:  { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  imbalanceNote:    { backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FDE68A', marginTop: 4 },
  imbalanceText:    { fontSize: 12, color: '#92400E', lineHeight: 18 },

  // Profile
  profileRow:     { paddingVertical: 12 },
  profileTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  profileLabel:   { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  profileInsight: { fontSize: 12, color: '#4B5563', lineHeight: 19 },

  // Landmark overlay
  toggleBtn:       { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5, borderColor: Colors.primary },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleBtnText:   { fontSize: 12, fontWeight: '700', color: Colors.primary },
  toggleBtnTextActive: { color: '#fff' },
  overlayHint:     { fontSize: 12, color: '#94A3B8', lineHeight: 18, marginBottom: 12 },
  svgWrap:         { borderRadius: 16, overflow: 'hidden', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10, position: 'relative' },
  tooltip:         { backgroundColor: '#1E1B4B', borderRadius: 14, padding: 14, marginBottom: 12 },
  tooltipTitle:    { fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 4 },
  tooltipText:     { fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  lmLegend:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  lmLegendItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lmLegendDot:     { width: 9, height: 9, borderRadius: 5 },
  lmLegendText:    { fontSize: 11, color: '#4B5563', fontWeight: '600' },

  // AI interpretation
  aiBadge:      { backgroundColor: '#EDE9FE', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  aiBadgeText:  { fontSize: 11, fontWeight: '700', color: Colors.primary },
  interpSubHead:{ fontSize: 13, fontWeight: '800', color: '#16A34A', marginBottom: 10 },
  interpRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  interpIcon:   { fontSize: 14, lineHeight: 20 },
  interpText:   { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },

  // Treatment recs
  treatCard:    { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }, android: { elevation: 2 } }) },
  treatHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  treatIndexBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  treatIndexText:  { fontSize: 13, fontWeight: '900', color: Colors.primary },
  treatName:    { fontSize: 15, fontWeight: '800', color: '#111827' },
  treatTarget:  { fontSize: 12, color: '#64748B', marginTop: 2 },
  treatBody:    { paddingHorizontal: 16, paddingBottom: 16, gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F1F5F9' },
  treatOutcomeRow: { paddingTop: 12 },
  treatOutcomeLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 5 },
  treatOutcomeText:  { fontSize: 13, color: '#374151', lineHeight: 20 },
  justificationBox:  { backgroundColor: '#F5F3FF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#DDD6FE' },
  justificationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  justificationTitle:  { fontSize: 12, fontWeight: '800', color: Colors.primary },
  justificationText:   { fontSize: 12, color: '#4C1D95', lineHeight: 19 },
  priceLock:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  priceLockText:{ fontSize: 12, color: '#64748B', fontStyle: 'italic' },

  // AI Suggested Treatments section header
  suggestSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  aiSourcePill: { backgroundColor: '#EDE9FE', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  aiSourceText: { fontSize: 10, fontWeight: '700', color: Colors.primary },

  // Suggested treatment card
  suggestCard:       { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', padding: 16, gap: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  suggestHeader:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  suggestIndexWrap:  { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  suggestIndexText:  { fontSize: 13, fontWeight: '900', color: Colors.primary },
  suggestName:       { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 3, lineHeight: 21 },
  suggestTarget:     { fontSize: 12, color: '#64748B', fontWeight: '500' },

  // Priority badge
  priorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, flexShrink: 0 },
  priorityDot:   { width: 6, height: 6, borderRadius: 3 },
  priorityText:  { fontSize: 10, fontWeight: '800' },

  // Match indicator
  matchRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  matchLabel:    { fontSize: 11, fontWeight: '700', color: '#94A3B8', width: 62 },
  matchBarTrack: { flex: 1, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  matchBarFill:  { height: 6, borderRadius: 3 },
  matchPct:      { fontSize: 12, fontWeight: '800', width: 36, textAlign: 'right' },

  // Doctor CTA
  doctorCta:      { backgroundColor: '#1E1B4B', borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  doctorCtaLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  doctorCtaIcon:  { fontSize: 28 },
  doctorCtaTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 3 },
  doctorCtaSub:   { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 17 },
  doctorCtaBtn:   { backgroundColor: '#A78BFA', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  doctorCtaBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});

// ─────────────────────────────────────────────────────────────────
// SKIN STYLES (sk)
// ─────────────────────────────────────────────────────────────────
const TILE_W = (width - 32 - 16 - 8) / 3; // 3 columns, 16px horizontal section padding × 2, 8px gap

const sk = StyleSheet.create({
  // Metrics grid — 2×2
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricTile:  { width: (width - 32 - 16 - 10) / 2, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 },
  metricIcon:  { fontSize: 22, marginBottom: 2 },
  metricLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  metricScore: { fontSize: 26, fontWeight: '900', lineHeight: 32 },
  metricUnit:  { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  metricBarTrack: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  metricBarFill:  { height: 4, borderRadius: 2 },
  metricStatusChip: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  metricStatusText: { fontSize: 10, fontWeight: '800' },
  metricNote:  { fontSize: 10, color: '#94A3B8', lineHeight: 14, marginTop: 2 },

  // Conditions
  conditionCard:    { backgroundColor: '#fff', borderRadius: 18, padding: 14, borderLeftWidth: 4, borderWidth: 1, borderColor: '#E2E8F0', gap: 8, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 1 } }) },
  conditionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  conditionIcon:    { fontSize: 20 },
  conditionName:    { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 1 },
  conditionZones:   { fontSize: 11, color: '#64748B', fontWeight: '500' },
  conditionSevBadge:{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  conditionSevText: { fontSize: 11, fontWeight: '800' },
  conditionBarTrack:{ height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, overflow: 'hidden' },
  conditionBarFill: { height: 4, borderRadius: 2 },
  conditionNote:    { fontSize: 12, color: '#4B5563', lineHeight: 18 },

  // Multi-light gallery
  galleryHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 },
  galleryBadge:     { backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 10 },
  galleryBadgeText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  tapHint:          { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: '#F1F5F9' },
  tapHintText:      { fontSize: 10, fontWeight: '600', color: '#64748B' },

  // 2×3 light grid
  lightGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lightTile:      { width: TILE_W, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: '#E2E8F0', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 }, android: { elevation: 2 } }) },
  lightTileActive:{ borderColor: 'transparent' },
  lightTileActiveBorder: { position: 'absolute', inset: 0, borderRadius: 14, borderWidth: 2 } as any,
  lightTileGradient: { height: 72, alignItems: 'center', justifyContent: 'center', gap: 4 },
  lightTileIcon:  { fontSize: 22 },
  lightTileLabel: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  lightTileBottom:{ backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 8 },
  lightTileReveal:{ fontSize: 10, color: '#4B5563', lineHeight: 14, fontWeight: '500' },

  // Light detail card
  lightDetailCard:    { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 }, android: { elevation: 3 } }) },
  lightDetailHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  lightDetailIcon:    { fontSize: 28 },
  lightDetailTitle:   { fontSize: 16, fontWeight: '800', color: '#fff' },
  lightDetailSubtitle:{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  lightDetailClose:   { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  lightDetailCloseText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  lightDetailSection: { paddingHorizontal: 16, paddingVertical: 14 },
  lightDetailBorderTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F1F5F9' },
  lightDetailSectionLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 8 },
  lightDetailRevealText:   { fontSize: 14, fontWeight: '700', color: '#111827' },
  lightFindingRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  lightFindingDot:  { width: 7, height: 7, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  lightFindingText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },
  lightLimitationBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFBEB', borderTopWidth: 1, borderTopColor: '#FDE68A', padding: 14 },
  lightLimitationIcon:{ fontSize: 14, marginTop: 1 },
  lightLimitationText:{ flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },

  // Cross-light insights
  crossCard:       { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  crossHeader:     { flexDirection: 'row', alignItems: 'center' },
  crossSigBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  crossSigDot:     { width: 7, height: 7, borderRadius: 4 },
  crossSigText:    { fontSize: 11, fontWeight: '800' },
  crossFinding:    { fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 21 },
  crossLightsRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  crossLightsLabel:{ fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  crossLightChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  crossLightChip:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  crossLightChipText: { fontSize: 11, fontWeight: '800' },
  crossRecoBox:    { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BBF7D0', gap: 5 },
  crossRecoLabel:  { fontSize: 11, fontWeight: '800', color: '#166534' },
  crossRecoText:   { fontSize: 12, color: '#166534', lineHeight: 18 },
});

// ─────────────────────────────────────────────────────────────────
// DENTAL STYLES (dn)
// ─────────────────────────────────────────────────────────────────
const dn = StyleSheet.create({
  // Urgency banner
  urgencyBanner:    { borderRadius: 18, padding: 16, borderWidth: 1.5, gap: 10 },
  urgencyTop:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  urgencyIcon:      { fontSize: 22, marginTop: 1 },
  urgencyLabelRow:  { gap: 2, flex: 1 },
  urgencyTierLabel: { fontSize: 15, fontWeight: '900' },
  urgencySublabel:  { fontSize: 11, fontWeight: '600' },
  urgencyReason:    { fontSize: 13, lineHeight: 20, fontWeight: '500' },
  tierBarTrack:     { flexDirection: 'row', gap: 4, marginTop: 8 },
  tierBarSegment:   { flex: 1, height: 5, borderRadius: 3 },

  // Pain context
  painLevelBadge:   { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  painLevelBadgeText:{ fontSize: 11, fontWeight: '800' },
  painContextLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 10, letterSpacing: 0.5 },
  zoneChipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  zoneChip:         { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5 },
  zoneChipDot:      { width: 7, height: 7, borderRadius: 4 },
  zoneChipText:     { fontSize: 13, fontWeight: '700' },
  zoneChipLevel:    { fontSize: 10, fontWeight: '600', opacity: 0.75 },

  // Symptom summary
  flagBadge:        { backgroundColor: '#FEF2F2', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FECACA' },
  flagBadgeText:    { fontSize: 10, fontWeight: '800', color: '#991B1B' },
  symptomRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 11 },
  symptomRowIcon:   { fontSize: 15, marginTop: 1, width: 20 },
  symptomRowLabel:  { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 2 },
  symptomRowValue:  { fontSize: 13, color: '#374151', fontWeight: '500', lineHeight: 19 },
  symptomRowFlagged:{ color: '#B91C1C', fontWeight: '700' },
  flagIcon:         { fontSize: 12, marginTop: 2 },

  // Visual findings
  findingCard:      { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderLeftWidth: 4, borderWidth: 1, borderColor: '#E2E8F0', gap: 8, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }, android: { elevation: 1 } }) },
  findingHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  findingIcon:      { fontSize: 18 },
  findingCategory:  { flex: 1, fontSize: 14, fontWeight: '800', color: '#111827' },
  findingSevChip:   { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  findingSevText:   { fontSize: 11, fontWeight: '800' },
  findingBarTrack:  { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, overflow: 'hidden' },
  findingBarFill:   { height: 4, borderRadius: 2 },
  findingNote:      { fontSize: 12, color: '#4B5563', lineHeight: 18 },

  // Targeted zone
  zoneTabs:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  zoneTab:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#CBD5E1' },
  zoneTabText:    { fontSize: 12, fontWeight: '700', color: '#475569' },
  zoneDetailBox:  { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  zoneDetailLabel:{ fontSize: 12, fontWeight: '800', color: '#0369A1', marginBottom: 4 },
  zoneFindingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  zoneFindingDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  zoneFindingText:{ flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },

  // Treatment cards
  treatCard:      { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }, android: { elevation: 2 } }) },
  treatHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  treatNum:       { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  treatNumText:   { fontSize: 13, fontWeight: '900', color: '#1D4ED8' },
  treatName:      { flex: 1, fontSize: 15, fontWeight: '800', color: '#111827' },
  treatPriority:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  treatPriorityDot:{ width: 6, height: 6, borderRadius: 3 },
  treatPriorityText:{ fontSize: 10, fontWeight: '800' },
  treatReasonBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 5 },
  treatReasonLabel:{ fontSize: 11, fontWeight: '800', color: '#475569' },
  treatReasonText:{ fontSize: 12, color: '#374151', lineHeight: 19 },
  priceLock:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceLockText:  { fontSize: 11, color: '#94A3B8', fontStyle: 'italic' },

  // Limitations
  limitCard:    { backgroundColor: '#F8FAFC', borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: '#CBD5E1' },
  limitHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  limitIcon:    { fontSize: 18 },
  limitTitle:   { fontSize: 15, fontWeight: '800', color: '#334155' },
  limitSubtitle:{ fontSize: 12, color: '#64748B', lineHeight: 18, marginBottom: 12 },
  limitRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  limitBullet:  { fontSize: 16, color: '#94A3B8', marginTop: -2 },
  limitText:    { flex: 1, fontSize: 12, color: '#475569', lineHeight: 19 },
});
