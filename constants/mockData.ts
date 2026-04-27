// ─── Types ──────────────────────────────────────────────────────
export interface MockDoctor {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  ratingCount: number;
  photoURL?: string;
  isOnline: boolean;
  fee: number;
  experience: number;
  qualification: string;
  treatments: string[];
  languages: string[];
  about: string;
  availableSlots: { date: string; times: string[] }[];
  treatmentStats: { label: string; value: string }[];
}

export interface MockAppointment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  treatmentId: string;
  treatmentName: string;
  slotTime: Date;
  status: 'upcoming' | 'completed' | 'cancelled';
  fee: number;
  channelName: string;
  doctorDecision?: 'approved' | 'modified' | 'alternative';
  refundStatus?: 'pending' | 'processed' | 'none';
  notes?: string;
  consentSigned: boolean;
  duration: number;
}

export interface TreatmentData {
  id: string;
  name: string;
  category: 'skin' | 'dental' | 'aesthetic';
  tier: 1 | 2 | 3;
  tierLabel: string;
  tagline: string;
  about: string;
  duration: string;
  sessions: number;
  results: string;
  price: number;
  priceUnit: string;
  aiMatchScore?: number;
  suitableFor: string[];
  notSuitableIf: string[];
  aftercare: string[];
  sideEffects: string[];
  gradient: [string, string];
  icon: string;
  specialists: string[];
}

export interface MockTreatmentProgress {
  id: string;
  treatmentId: string;
  treatmentName: string;
  doctorId: string;
  doctorName: string;
  startDate: string;
  sessionsTotal: number;
  sessionsCompleted: number;
  nextSessionDate: string;
  status: 'active' | 'completed' | 'paused';
  notes: string;
}

export interface MockPlan {
  id: string;
  planName: string;
  doctorId: string;
  doctorName: string;
  startDate: string;
  nextFollowUp: string;
  status: 'active' | 'completed';
  phases: {
    id: string;
    label: string;
    description: string;
    status: 'completed' | 'current' | 'upcoming';
    date: string;
  }[];
}

export interface ScanConcern {
  area: string;
  severity: 'low' | 'medium' | 'high';
  note: string;
}

export interface ScanRecord {
  id: string;
  type: 'face' | 'skin' | 'dental';
  date: Date;
  scores: {
    overall: number;
    symmetry?: number;
    skin?: number;
    dental?: number;
  };
  findings: string[];
  concerns: ScanConcern[];
  recommendations: string[];
  urgency: 'low' | 'medium' | 'high';
  /** Whether the full AI report is unlocked (₹99 per-scan purchase) */
  isUnlocked: boolean;
  /** Simulated "after" image key — used for before/after UI (same placeholder for now) */
  beforeAfterKey?: string;
}

// ─── Mock Doctors ────────────────────────────────────────────────
export const MOCK_DOCTORS: MockDoctor[] = [
  {
    id: 'doc1',
    name: 'Dr. Priya Sharma',
    specialization: 'Dermatologist',
    rating: 4.9,
    ratingCount: 312,
    isOnline: true,
    fee: 1500,
    experience: 12,
    qualification: 'MBBS, MD (Dermatology)',
    languages: ['English', 'Hindi', 'Tamil'],
    about:
      'Dr. Priya Sharma is a renowned dermatologist with over 12 years of experience. She specialises in advanced skin treatments, pigmentation disorders, and aesthetic dermatology.',
    treatments: ['RF Microneedling', 'Peptide Infusion', 'Aura Facial', 'Chemical Peel'],
    availableSlots: [
      { date: 'Today', times: ['10:00 AM', '11:30 AM', '3:00 PM'] },
      { date: 'Tomorrow', times: ['9:00 AM', '2:00 PM', '4:30 PM'] },
      { date: 'Wed, 26 Mar', times: ['10:30 AM', '1:00 PM'] },
      { date: 'Thu, 27 Mar', times: ['11:00 AM', '3:30 PM', '5:00 PM'] },
    ],
    treatmentStats: [
      { label: 'Rating', value: '4.9 ★' },
      { label: 'Experience', value: '12 yrs' },
      { label: 'Sessions', value: '2,400+' },
      { label: 'Languages', value: '3' },
    ],
  },
  {
    id: 'doc2',
    name: 'Dr. Liam Chen',
    specialization: 'Aesthetic Dentist',
    rating: 4.8,
    ratingCount: 198,
    isOnline: true,
    fee: 2000,
    experience: 9,
    qualification: 'BDS, MDS (Aesthetic Dentistry)',
    languages: ['English', 'Mandarin'],
    about:
      'Dr. Liam Chen is a specialist in cosmetic and aesthetic dentistry. He has transformed thousands of smiles with cutting-edge dental techniques and a patient-first approach.',
    treatments: ['Teeth Whitening', 'Dental Veneers', 'Invisalign', 'Smile Makeover'],
    availableSlots: [
      { date: 'Today', times: ['2:00 PM', '5:30 PM'] },
      { date: 'Tomorrow', times: ['10:00 AM', '12:00 PM', '3:00 PM'] },
      { date: 'Wed, 26 Mar', times: ['9:30 AM', '2:30 PM', '4:00 PM'] },
      { date: 'Thu, 27 Mar', times: ['10:00 AM', '1:30 PM'] },
    ],
    treatmentStats: [
      { label: 'Rating', value: '4.8 ★' },
      { label: 'Experience', value: '9 yrs' },
      { label: 'Sessions', value: '1,800+' },
      { label: 'Languages', value: '2' },
    ],
  },
  {
    id: 'doc3',
    name: 'Dr. Raj Patel',
    specialization: 'Aesthetic Physician',
    rating: 4.7,
    ratingCount: 256,
    isOnline: false,
    fee: 2500,
    experience: 15,
    qualification: 'MBBS, Diploma in Aesthetic Medicine',
    languages: ['English', 'Hindi', 'Gujarati'],
    about:
      'Dr. Raj Patel is one of the most experienced aesthetic physicians with 15 years of hands-on experience. He specialises in Botox, fillers, and non-surgical face lifts.',
    treatments: ['Botox', 'Dermal Fillers', 'Thread Lift', 'PRP Therapy'],
    availableSlots: [
      { date: 'Tomorrow', times: ['11:00 AM', '1:30 PM', '4:00 PM'] },
      { date: 'Wed, 26 Mar', times: ['10:00 AM', '3:00 PM'] },
      { date: 'Thu, 27 Mar', times: ['9:30 AM', '12:30 PM', '5:00 PM'] },
    ],
    treatmentStats: [
      { label: 'Rating', value: '4.7 ★' },
      { label: 'Experience', value: '15 yrs' },
      { label: 'Sessions', value: '3,200+' },
      { label: 'Languages', value: '3' },
    ],
  },
  {
    id: 'doc4',
    name: 'Dr. Aisha Khan',
    specialization: 'Orthodontist',
    rating: 4.9,
    ratingCount: 421,
    isOnline: true,
    fee: 1800,
    experience: 11,
    qualification: 'BDS, MDS (Orthodontics)',
    languages: ['English', 'Hindi', 'Urdu'],
    about:
      'Dr. Aisha Khan is a leading orthodontist known for her precision and gentle approach. She specialises in clear aligners and complex bite corrections.',
    treatments: ['Braces', 'Clear Aligners', 'Retainers', 'Bite Correction'],
    availableSlots: [
      { date: 'Today', times: ['9:00 AM', '11:00 AM', '4:00 PM'] },
      { date: 'Tomorrow', times: ['10:30 AM', '2:00 PM', '5:30 PM'] },
    ],
    treatmentStats: [
      { label: 'Rating', value: '4.9 ★' },
      { label: 'Experience', value: '11 yrs' },
      { label: 'Sessions', value: '1,600+' },
      { label: 'Languages', value: '3' },
    ],
  },
  {
    id: 'doc5',
    name: 'Dr. Sofia Mendez',
    specialization: 'Periodontist',
    rating: 4.6,
    ratingCount: 143,
    isOnline: false,
    fee: 1200,
    experience: 7,
    qualification: 'BDS, MDS (Periodontics)',
    languages: ['English', 'Spanish'],
    about:
      'Dr. Sofia Mendez specialises in gum health and periodontal treatments. She uses the latest laser techniques for minimally invasive gum therapy.',
    treatments: ['Gum Treatment', 'Laser Therapy', 'Implants', 'Bone Grafting'],
    availableSlots: [
      { date: 'Wed, 26 Mar', times: ['9:00 AM', '12:00 PM', '3:30 PM'] },
      { date: 'Thu, 27 Mar', times: ['10:00 AM', '2:30 PM'] },
    ],
    treatmentStats: [
      { label: 'Rating', value: '4.6 ★' },
      { label: 'Experience', value: '7 yrs' },
      { label: 'Sessions', value: '900+' },
      { label: 'Languages', value: '2' },
    ],
  },
];

// ─── Mock Appointments ───────────────────────────────────────────
const now = new Date();
export const MOCK_APPOINTMENTS: MockAppointment[] = [
  {
    id: 'appt1',
    doctorId: 'doc1',
    doctorName: 'Dr. Priya Sharma',
    doctorSpecialization: 'Dermatologist',
    treatmentId: 'treat2',
    treatmentName: 'Peptide Infusion',
    slotTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
    status: 'upcoming',
    fee: 1500,
    channelName: 'ch_aesthetiq_001',
    consentSigned: true,
    duration: 30,
  },
  {
    id: 'appt2',
    doctorId: 'doc2',
    doctorName: 'Dr. Liam Chen',
    doctorSpecialization: 'Aesthetic Dentist',
    treatmentId: 'treat4',
    treatmentName: 'Teeth Whitening',
    slotTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
    status: 'completed',
    fee: 2000,
    channelName: 'ch_aesthetiq_002',
    doctorDecision: 'approved',
    consentSigned: true,
    duration: 45,
    notes: 'Treatment approved. Schedule follow-up in 4 weeks.',
  },
  {
    id: 'appt3',
    doctorId: 'doc3',
    doctorName: 'Dr. Raj Patel',
    doctorSpecialization: 'Aesthetic Physician',
    treatmentId: 'treat3',
    treatmentName: 'Botox',
    slotTime: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
    status: 'cancelled',
    fee: 2500,
    channelName: 'ch_aesthetiq_003',
    refundStatus: 'processed',
    consentSigned: false,
    duration: 30,
  },
  {
    id: 'appt4',
    doctorId: 'doc4',
    doctorName: 'Dr. Aisha Khan',
    doctorSpecialization: 'Orthodontist',
    treatmentId: 'treat5',
    treatmentName: 'Clear Aligners Consultation',
    slotTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
    status: 'upcoming',
    fee: 1800,
    channelName: 'ch_aesthetiq_004',
    consentSigned: true,
    duration: 45,
  },
];

// ─── Mock Treatments ─────────────────────────────────────────────
export const MOCK_TREATMENTS: TreatmentData[] = [
  {
    id: 'treat1',
    name: 'RF Microneedling',
    category: 'aesthetic',
    tier: 2,
    tierLabel: 'Assessment Required',
    tagline: 'Resurface. Rejuvenate. Radiate.',
    about:
      'RF Microneedling combines radiofrequency energy with micro-needling to stimulate collagen production deep within the skin. This dual-action treatment effectively addresses wrinkles, acne scars, and skin laxity.',
    duration: '60–90 min',
    sessions: 3,
    results: 'Visible improvement after 1st session. Full results in 3–6 months.',
    price: 8000,
    priceUnit: 'per session',
    aiMatchScore: 94,
    suitableFor: ['Active acne scars', 'Fine lines & wrinkles', 'Skin laxity', 'Large pores', 'Uneven texture'],
    notSuitableIf: ['Active acne breakout', 'Pregnant or breastfeeding', 'Blood thinners', 'Metal implants near face'],
    aftercare: ['Avoid sun exposure for 72 hrs', 'Use SPF 50+ daily', 'No makeup for 24 hrs', 'Gentle cleanser only'],
    sideEffects: ['Mild redness (1–3 days)', 'Micro-bruising possible', 'Temporary skin sensitivity'],
    gradient: ['#7C3AED', '#A855F7'],
    icon: '✨',
    specialists: ['doc1', 'doc3'],
  },
  {
    id: 'treat2',
    name: 'Peptide Infusion',
    category: 'skin',
    tier: 1,
    tierLabel: 'Generally Safe',
    tagline: 'Feed your skin from within.',
    about:
      'A luxurious skin-boosting treatment that delivers a potent cocktail of peptides, hyaluronic acid, and antioxidants deep into the skin. Ideal for dehydration, dullness, and early signs of ageing.',
    duration: '45–60 min',
    sessions: 4,
    results: 'Glowing skin after 1st session. Sustained hydration with course.',
    price: 4500,
    priceUnit: 'per session',
    aiMatchScore: 88,
    suitableFor: ['Dry & dehydrated skin', 'Dull complexion', 'Early ageing signs', 'Sensitive skin'],
    notSuitableIf: ['Active skin infections', 'Open wounds', 'Known peptide allergy'],
    aftercare: ['Stay hydrated', 'Avoid exfoliants for 48 hrs', 'Apply moisturiser generously'],
    sideEffects: ['Mild tingling', 'Temporary redness (30 min)'],
    gradient: ['#0EA5E9', '#06B6D4'],
    icon: '💧',
    specialists: ['doc1', 'doc5'],
  },
  {
    id: 'treat3',
    name: 'Botox',
    category: 'aesthetic',
    tier: 3,
    tierLabel: 'Doctor Only',
    tagline: 'Smooth. Natural. Refreshed.',
    about:
      'Botulinum toxin injections temporarily relax facial muscles to reduce dynamic wrinkles. When administered by an expert, results appear natural and last 3–6 months.',
    duration: '20–30 min',
    sessions: 1,
    results: 'Results visible in 3–7 days. Full effect at 2 weeks.',
    price: 12000,
    priceUnit: 'per area',
    aiMatchScore: 72,
    suitableFor: ['Forehead lines', 'Frown lines (11s)', "Crow's feet", 'Brow lift', 'Lip lines'],
    notSuitableIf: ['Pregnant or breastfeeding', 'Neuromuscular disorders', 'Allergy to botulinum toxin', 'Active infection at injection site'],
    aftercare: ['No lying down for 4 hrs', 'Avoid heat & exercise for 24 hrs', 'No facial massage for 2 weeks'],
    sideEffects: ['Mild bruising at injection site', 'Temporary headache', 'Very rare: drooping eyelid'],
    gradient: ['#EC4899', '#F43F5E'],
    icon: '💉',
    specialists: ['doc3'],
  },
  {
    id: 'treat4',
    name: 'Teeth Whitening',
    category: 'dental',
    tier: 1,
    tierLabel: 'Generally Safe',
    tagline: 'Your brightest smile awaits.',
    about:
      'Professional-grade LED-activated teeth whitening delivers dramatically brighter teeth in just one session. Safe, fast, and long-lasting when combined with good dental hygiene.',
    duration: '60 min',
    sessions: 1,
    results: 'Up to 8 shades brighter in one session.',
    price: 5000,
    priceUnit: 'per session',
    aiMatchScore: 91,
    suitableFor: ['Stained teeth (coffee, tea, smoking)', 'Yellow discolouration', 'Pre-event brightening'],
    notSuitableIf: ['Tooth sensitivity', 'Gum disease', 'Pregnant or breastfeeding', 'Crowns & veneers (won\'t whiten)'],
    aftercare: ['Avoid staining foods for 48 hrs', 'Use sensitive toothpaste', 'No smoking for 48 hrs'],
    sideEffects: ['Temporary sensitivity (24–48 hrs)', 'Mild gum irritation'],
    gradient: ['#F59E0B', '#EF4444'],
    icon: '🦷',
    specialists: ['doc2'],
  },
  {
    id: 'treat5',
    name: 'Aura Facial',
    category: 'skin',
    tier: 1,
    tierLabel: 'Generally Safe',
    tagline: 'Glow from the inside out.',
    about:
      'The Aura Facial is a signature multi-step treatment combining deep cleansing, exfoliation, extractions, and a customised mask. Leaves skin luminous, balanced, and radiant.',
    duration: '75 min',
    sessions: 6,
    results: 'Immediate glow. Optimal results after a course of 6.',
    price: 3500,
    priceUnit: 'per session',
    aiMatchScore: 85,
    suitableFor: ['All skin types', 'Congested skin', 'Dull complexion', 'Uneven tone'],
    notSuitableIf: ['Severe cystic acne', 'Recent chemical peel (< 2 weeks)', 'Sunburn'],
    aftercare: ['SPF 30+ daily', 'Avoid harsh scrubs for 5 days', 'Gentle moisturiser recommended'],
    sideEffects: ['Mild redness (2–4 hrs)', 'Possible extraction marks (fade in 24 hrs)'],
    gradient: ['#22C55E', '#16A34A'],
    icon: '🌿',
    specialists: ['doc1', 'doc3', 'doc5'],
  },
];

// ─── Mock Treatment Progress ─────────────────────────────────────
export const MOCK_TREATMENT_PROGRESS: MockTreatmentProgress[] = [
  {
    id: 'tp1',
    treatmentId: 'treat2',
    treatmentName: 'Peptide Infusion',
    doctorId: 'doc1',
    doctorName: 'Dr. Priya Sharma',
    startDate: '15 Jan 2025',
    sessionsTotal: 4,
    sessionsCompleted: 2,
    nextSessionDate: '28 Mar 2025',
    status: 'active',
    notes: 'Responding well. Visible improvement in hydration.',
  },
  {
    id: 'tp2',
    treatmentId: 'treat4',
    treatmentName: 'Teeth Whitening',
    doctorId: 'doc2',
    doctorName: 'Dr. Liam Chen',
    startDate: '18 Feb 2025',
    sessionsTotal: 1,
    sessionsCompleted: 1,
    nextSessionDate: '',
    status: 'completed',
    notes: '8 shades brighter achieved. Maintenance recommended in 6 months.',
  },
];

// ─── Mock Plans ──────────────────────────────────────────────────
export const MOCK_PLANS: MockPlan[] = [
  {
    id: 'plan1',
    planName: 'Skin Rejuvenation Programme',
    doctorId: 'doc1',
    doctorName: 'Dr. Priya Sharma',
    startDate: '15 Jan 2025',
    nextFollowUp: '28 Mar 2025',
    status: 'active',
    phases: [
      {
        id: 'ph1',
        label: 'Phase 1 — Baseline & Prep',
        description: 'Initial consultation, skin analysis, and prep protocol.',
        status: 'completed',
        date: '15 Jan 2025',
      },
      {
        id: 'ph2',
        label: 'Phase 2 — Peptide Infusion (×2)',
        description: 'Two sessions of peptide infusion spaced 3 weeks apart.',
        status: 'completed',
        date: '6 Feb 2025',
      },
      {
        id: 'ph3',
        label: 'Phase 3 — RF Microneedling',
        description: 'RF microneedling session to stimulate collagen production.',
        status: 'current',
        date: '28 Mar 2025',
      },
      {
        id: 'ph4',
        label: 'Phase 4 — Review & Maintenance',
        description: 'Final assessment and maintenance plan creation.',
        status: 'upcoming',
        date: 'Apr 2025',
      },
    ],
  },
];

// ─── Mock Scan Records ───────────────────────────────────────────
export const MOCK_SCANS: ScanRecord[] = [
  {
    id: 'scan1',
    type: 'face',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    scores: { overall: 82, symmetry: 85, skin: 79, dental: 80 },
    findings: ['Good overall facial symmetry', 'Mild asymmetry in lower jawline', 'Healthy skin tone and texture'],
    concerns: [
      { area: 'Jawline Asymmetry', severity: 'low',    note: 'Slight deviation of ~2mm. Common and usually non-clinical. A doctor can advise on correction options.' },
      { area: 'Facial Thirds',     severity: 'low',    note: 'Lower third is marginally proportioned. May benefit from minor adjustments.' },
      { area: 'Nasolabial Folds',  severity: 'medium', note: 'Early-stage folds detected. Volume loss may be contributing. Consultation recommended.' },
    ],
    recommendations: ['RF Microneedling', 'Peptide Infusion'],
    urgency: 'low',
    isUnlocked: true,
    beforeAfterKey: 'face_scan1',
  },
  {
    id: 'scan2',
    type: 'skin',
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    scores: { overall: 74, skin: 74 },
    findings: ['Mild dehydration across T-zone', 'Uneven pigmentation on cheeks', 'Small comedones detected at nose bridge'],
    concerns: [
      { area: 'Pigmentation',  severity: 'medium', note: 'Uneven melanin distribution detected, particularly on cheekbones. Sun exposure may be a factor.' },
      { area: 'Hydration',     severity: 'medium', note: 'Skin moisture barrier appears compromised. Dehydration lines visible in blue-light analysis.' },
      { area: 'Comedones',     severity: 'low',    note: 'Closed comedones present at nose bridge. Topical tretinoin or exfoliation may help.' },
      { area: 'Redness Index', severity: 'low',    note: 'Minor vascular redness on left cheek. Could indicate early rosacea. Doctor review advised.' },
    ],
    recommendations: ['Peptide Infusion', 'Aura Facial'],
    urgency: 'medium',
    isUnlocked: false,
    beforeAfterKey: 'skin_scan2',
  },
  {
    id: 'scan3',
    type: 'dental',
    date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    scores: { overall: 88, dental: 88 },
    findings: ['Slight surface staining on upper incisors', 'Healthy gum line with no recession', 'No cavities or structural damage detected'],
    concerns: [
      { area: 'Surface Staining', severity: 'low',    note: 'Mild extrinsic staining, likely from diet or beverages. Responds well to professional whitening.' },
      { area: 'Calculus Build-up', severity: 'low',   note: 'Minor tartar visible at gum margins. Regular cleaning will resolve.' },
    ],
    recommendations: ['Teeth Whitening'],
    urgency: 'low',
    isUnlocked: false,
    beforeAfterKey: 'dental_scan3',
  },
];

// ─── Questionnaire ───────────────────────────────────────────────
export const MOCK_QUESTIONNAIRE = [
  {
    id: 'q1',
    question: 'Do you have any known allergies to skincare ingredients?',
    options: ['No allergies', 'Mild sensitivity', 'Known allergy to specific ingredient'],
    riskWeights: [0, 1, 3],
  },
  {
    id: 'q2',
    question: 'Are you currently pregnant or breastfeeding?',
    options: ['No', 'Pregnant', 'Breastfeeding'],
    riskWeights: [0, 5, 3],
  },
  {
    id: 'q3',
    question: 'Are you currently on any medications?',
    options: ['No', 'Vitamins/supplements only', 'Prescription medications'],
    riskWeights: [0, 0, 2],
  },
  {
    id: 'q4',
    question: 'Have you had any aesthetic procedures in the past 3 months?',
    options: ['No', 'Yes – minor (facials, peels)', 'Yes – major (injectables, surgery)'],
    riskWeights: [0, 1, 3],
  },
  {
    id: 'q5',
    question: 'Do you have any active skin conditions?',
    options: ['No', 'Mild eczema/psoriasis (managed)', 'Active rosacea or acne'],
    riskWeights: [0, 1, 4],
  },
];

// ─── Mock Health Profile ─────────────────────────────────────────
export const MOCK_HEALTH_PROFILE = {
  version: 1,
  completedAt: new Date(),
  updatedAt: new Date(),
  declarationAccepted: true,
  declarationAcceptedAt: new Date(),
  conditions: ['hypertension'],
  pregnant: false,
  breastfeeding: false,
  hasImplantedDevice: false,
  onBloodThinners: false,
  onRetinoids: false,
  onSteroids: false,
  medications: ['Amlodipine 5mg'],
  smoker: 'never',
  tobaccoChewer: false,
  alcohol: 'occasionally',
  skinConditions: [],
  allergies: [],
  recentTreatments: [],
  hadAdverseReaction: false,
  adverseReactionDetail: null,
  profileCompletionScore: 0,
};

// ─── Skin Capture Steps ──────────────────────────────────────────
export const CAPTURE_STEPS = [
  {
    id: 'white',
    label: 'White Light',
    subtitle: 'Baseline capture',
    screenColor: '#F8F4FF',
    accentColor: '#7C3AED',
    instruction: 'Face the camera directly. Keep expression neutral.',
    detail: 'Standard illumination for baseline skin assessment and texture analysis.',
    analyzes: ['Texture', 'Tone', 'Pores'],
    needsTorch: false,
  },
  {
    id: 'blue',
    label: 'Blue Light',
    subtitle: 'Bacteria & pore analysis',
    screenColor: '#EFF6FF',
    accentColor: '#3B82F6',
    instruction: 'Hold still. The blue light reveals bacteria and pore structure.',
    detail: 'UV-adjacent blue light excites porphyrins produced by bacteria.',
    analyzes: ['Bacteria', 'Pore depth', 'Sebum'],
    needsTorch: false,
  },
  {
    id: 'green',
    label: 'Green Light',
    subtitle: 'Pigmentation & vessels',
    screenColor: '#F0FDF4',
    accentColor: '#22C55E',
    instruction: 'Relax your face. Capturing pigment distribution.',
    detail: 'Green wavelengths are absorbed by melanin and haemoglobin.',
    analyzes: ['Pigmentation', 'Vessels', 'Redness'],
    needsTorch: false,
  },
  {
    id: 'red',
    label: 'Red / Infrared',
    subtitle: 'Subsurface depth scan',
    screenColor: '#FFF1F2',
    accentColor: '#EF4444',
    instruction: 'Stay still for the infrared subsurface scan.',
    detail: 'Near-infrared penetrates dermis to reveal subsurface features.',
    analyzes: ['Collagen density', 'Sub-surface marks', 'Scarring'],
    needsTorch: false,
  },
  {
    id: 'raking',
    label: 'Raking Flash',
    subtitle: 'Surface relief mapping',
    screenColor: '#FFFBEB',
    accentColor: '#F59E0B',
    instruction: 'Hold torch to the side of your face for raking light.',
    detail: 'Side-lighting creates shadows that reveal fine surface texture.',
    analyzes: ['Fine lines', 'Surface texture', 'Pore depth'],
    needsTorch: true,
  },
];
