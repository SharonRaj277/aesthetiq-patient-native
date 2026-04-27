/**
 * services/treatmentEligibility.ts
 *
 * Centralised eligibility engine for self-bookable Quick Treatments only.
 *
 * SCOPE:
 *   ✓ Quick Treatments section
 *   ✗ AI Recommended Treatments  (informational only)
 *   ✗ Doctor Treatment Plans     (clinician-controlled)
 *
 * Contraindications are read directly from the Firestore treatment document
 * (treatments/{id}.contraindications[]). No treatment names are hardcoded —
 * adding/editing rules is a Firestore-only operation.
 */

// ─── Types ────────────────────────────────────────────────────────

export type Operator =
  | 'equals'
  | 'notEquals'
  | 'in'           // healthProfile[field] is included in value (array)
  | 'notIn'
  | 'contains'     // healthProfile[field] (array) contains value
  | 'gt'
  | 'lt'
  | 'truthy'       // field is truthy (any non-empty / non-zero / non-false)
  | 'falsy';

export type Severity = 'critical' | 'high' | 'moderate' | 'low';

export type Action = 'doctor_review_required' | 'caution' | 'available';

export interface Contraindication {
  field: string;
  operator: Operator;
  value?: any;
  severity: Severity;
  action: Action;
  message: string;
}

export interface EligibleTreatment {
  id: string;
  name: string;
  contraindications?: Contraindication[];
}

export type EligibilityStatus = 'available' | 'caution' | 'doctor_review_required';

export interface EligibilityResult {
  status: EligibilityStatus;
  reasons: string[];
  riskScore: number;
  triggered: Contraindication[];
}

// ─── Severity weights for the riskScore ──────────────────────────
// Score is the sum of weights from every triggered contraindication.
// Useful for sorting / surfacing the riskiest treatments first.

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 40,
  high:     25,
  moderate: 10,
  low:      3,
};

// ─── Operator evaluation ─────────────────────────────────────────

function evaluate(operator: Operator, profileValue: any, ruleValue: any): boolean {
  switch (operator) {
    case 'equals':    return profileValue === ruleValue;
    case 'notEquals': return profileValue !== ruleValue;
    case 'truthy':    return Boolean(profileValue);
    case 'falsy':     return !profileValue;
    case 'gt':        return typeof profileValue === 'number' && profileValue > ruleValue;
    case 'lt':        return typeof profileValue === 'number' && profileValue < ruleValue;
    case 'in':        return Array.isArray(ruleValue) && ruleValue.includes(profileValue);
    case 'notIn':     return Array.isArray(ruleValue) && !ruleValue.includes(profileValue);
    case 'contains':
      return Array.isArray(profileValue) && profileValue.includes(ruleValue);
    default:
      return false;
  }
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Evaluate every contraindication on the treatment against the patient's
 * health profile. The result reflects the WORST action triggered:
 *   any doctor_review_required → 'doctor_review_required'
 *   else any caution           → 'caution'
 *   else                       → 'available'
 *
 * If no profile is loaded yet (null), we default to 'available' so the UI
 * never blocks a user we don't have data for. The caller is expected to
 * prompt the user to complete their health profile separately.
 */
export function getTreatmentEligibility(
  treatment: EligibleTreatment,
  healthProfile: Record<string, any> | null | undefined,
): EligibilityResult {
  const rules = treatment.contraindications ?? [];

  if (!healthProfile || rules.length === 0) {
    return { status: 'available', reasons: [], riskScore: 0, triggered: [] };
  }

  const triggered: Contraindication[] = [];
  for (const rule of rules) {
    const profileValue = healthProfile[rule.field];
    if (evaluate(rule.operator, profileValue, rule.value)) {
      triggered.push(rule);
    }
  }

  if (triggered.length === 0) {
    return { status: 'available', reasons: [], riskScore: 0, triggered: [] };
  }

  const hasReview  = triggered.some((t) => t.action === 'doctor_review_required');
  const hasCaution = triggered.some((t) => t.action === 'caution');

  const status: EligibilityStatus = hasReview
    ? 'doctor_review_required'
    : hasCaution
      ? 'caution'
      : 'available';

  const riskScore = triggered.reduce((sum, t) => sum + SEVERITY_WEIGHT[t.severity], 0);
  const reasons   = triggered.map((t) => t.message);

  return { status, reasons, riskScore, triggered };
}

// ─── Display helpers ─────────────────────────────────────────────

export const ELIGIBILITY_BADGE: Record<EligibilityStatus, { emoji: string; label: string; color: string }> = {
  available:               { emoji: '🟢', label: 'Suitable',                   color: '#16A34A' },
  caution:                 { emoji: '⚠️', label: 'Proceed with caution',        color: '#D97706' },
  doctor_review_required:  { emoji: '🩺', label: 'Doctor review recommended',  color: '#DC2626' },
};
