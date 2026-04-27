// ─── Treatment Blocker Types ──────────────────────────────────────
interface Blocker {
  type: 'block' | 'caution';
  reason: string;
  icon: string;
  check: (hp: any) => boolean;
}

// ─── Blocker Definitions Per Treatment ───────────────────────────
export const TREATMENT_BLOCKERS: Record<string, Blocker[]> = {
  treat1: [
    // RF Microneedling
    {
      type: 'block',
      reason: 'Not safe during pregnancy or breastfeeding.',
      icon: '🚫',
      check: (hp) => hp.pregnant === true || hp.breastfeeding === true,
    },
    {
      type: 'block',
      reason: 'Metal implants near the face are incompatible with RF energy.',
      icon: '🚫',
      check: (hp) => hp.hasImplantedDevice === true,
    },
    {
      type: 'block',
      reason: 'Blood thinners increase bruising and bleeding risk.',
      icon: '🚫',
      check: (hp) => hp.onBloodThinners === true,
    },
    {
      type: 'caution',
      reason: 'Retinoids sensitise skin — pause 5 days before treatment.',
      icon: '⚠️',
      check: (hp) => hp.onRetinoids === true,
    },
    {
      type: 'caution',
      reason: 'Hypertension requires doctor clearance before treatment.',
      icon: '⚠️',
      check: (hp) => hp.conditions?.includes('hypertension'),
    },
  ],

  treat2: [
    // Peptide Infusion
    {
      type: 'block',
      reason: 'Known peptide allergy — treatment cannot proceed.',
      icon: '🚫',
      check: (hp) =>
        hp.allergies?.some((a: string) =>
          a.toLowerCase().includes('peptide')
        ),
    },
    {
      type: 'caution',
      reason: 'Active skin conditions may affect treatment response.',
      icon: '⚠️',
      check: (hp) => hp.skinConditions?.length > 0,
    },
  ],

  treat3: [
    // Botox
    {
      type: 'block',
      reason: 'Not safe during pregnancy or breastfeeding.',
      icon: '🚫',
      check: (hp) => hp.pregnant === true || hp.breastfeeding === true,
    },
    {
      type: 'block',
      reason: 'Neuromuscular conditions contraindicate botulinum toxin.',
      icon: '🚫',
      check: (hp) =>
        hp.conditions?.some((c: string) =>
          ['myasthenia', 'als', 'neuromuscular'].some((k) =>
            c.toLowerCase().includes(k)
          )
        ),
    },
    {
      type: 'caution',
      reason: 'Blood thinners increase bruising risk at injection sites.',
      icon: '⚠️',
      check: (hp) => hp.onBloodThinners === true,
    },
    {
      type: 'caution',
      reason: 'Steroids may reduce treatment efficacy.',
      icon: '⚠️',
      check: (hp) => hp.onSteroids === true,
    },
  ],

  treat4: [
    // Teeth Whitening
    {
      type: 'block',
      reason: 'Not safe during pregnancy or breastfeeding.',
      icon: '🚫',
      check: (hp) => hp.pregnant === true || hp.breastfeeding === true,
    },
    {
      type: 'caution',
      reason: 'Gum conditions should be treated before whitening.',
      icon: '⚠️',
      check: (hp) =>
        hp.conditions?.some((c: string) =>
          c.toLowerCase().includes('gum')
        ),
    },
  ],

  treat5: [
    // Aura Facial
    {
      type: 'caution',
      reason: 'Active skin conditions may require modified protocol.',
      icon: '⚠️',
      check: (hp) => hp.skinConditions?.length > 0,
    },
    {
      type: 'caution',
      reason: 'Retinoids sensitise skin — pause before treatment.',
      icon: '⚠️',
      check: (hp) => hp.onRetinoids === true,
    },
  ],
};

// ─── getTreatmentStatus ───────────────────────────────────────────
// Bug fix: scan ALL blockers first. block always wins over caution.
export const getTreatmentStatus = (
  treatmentId: string,
  healthProfile: any
): {
  status: 'available' | 'caution' | 'blocked';
  reason?: string;
  icon?: string;
} => {
  if (!healthProfile) {
    return { status: 'available' };
  }

  const blockers = TREATMENT_BLOCKERS[treatmentId] || [];

  let cautionResult: {
    status: 'caution';
    reason: string;
    icon: string;
  } | null = null;

  for (const blocker of blockers) {
    if (blocker.check(healthProfile)) {

      // Block has highest priority — return immediately
      if (blocker.type === 'block') {
        return {
          status: 'blocked',
          reason: blocker.reason,
          icon: blocker.icon,
        };
      }

      // Store caution but keep checking — a block below may override it
      if (blocker.type === 'caution' && !cautionResult) {
        cautionResult = {
          status: 'caution',
          reason: blocker.reason,
          icon: blocker.icon,
        };
      }
    }
  }

  // Return caution only if no block found
  if (cautionResult) return cautionResult;

  return { status: 'available' };
};
