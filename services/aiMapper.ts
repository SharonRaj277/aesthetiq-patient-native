/**
 * Maps AI scan concern keywords → Firestore treatment category values.
 *
 * Keys: normalised concern strings (lowercase, no spaces) from scan results.
 * Values: exact category strings stored in the Firestore "treatments" collection.
 *
 * Used by getRecommendedTreatments() in recommendation.ts — never surfaced
 * directly to the UI; only treatment name + category are shown, never price.
 */

export const concernToCategoryMap: Record<string, string> = {
  // ── Skin ───────────────────────────────────────────────────────
  acne:          'acne',
  pimples:       'acne',
  oiliness:      'acne',
  scars:         'repair',
  pores:         'repair',
  pigmentation:  'pigmentation',
  darkspots:     'pigmentation',
  melasma:       'pigmentation',
  dullness:      'glow',
  glow:          'glow',
  aging:         'antiaging',
  wrinkles:      'antiaging',
  finelines:     'antiaging',
  sagging:       'tightening',
  texture:       'repair',
  dehydration:   'glow',
  redness:       'repair',
  hair:          'hair',
  hairloss:      'hair',

  // ── Facial ─────────────────────────────────────────────────────
  jawline:       'jawline',
  facefat:       'jawline',
  chin:          'chin',
  lips:          'lips',
  thinlips:      'lips',
  nose:          'nose',
  symmetry:      'harmony',
  asymmetry:     'harmony',
  facialbalance: 'harmony',
  undereye:      'undereye',
  darkcircles:   'undereye',
  cheeks:        'cheeks',
  hollowcheeks:  'cheeks',
  forehead:      'botox',
  eyebrows:      'botox',

  // ── Dental ─────────────────────────────────────────────────────
  yellowteeth:   'cosmetic',
  staining:      'cosmetic',
  whitening:     'cosmetic',
  cavities:      'restorative',
  decay:         'restorative',
  alignment:     'alignment',
  crowding:      'alignment',
  gumissues:     'gum',
  gumrecession:  'gum',
  sensitivity:   'restorative',
} as const;

/**
 * Normalises a raw concern string to a lookup key:
 * strips whitespace, lowercases, removes non-alpha characters.
 *
 * "Dark Spots" → "darkspots"
 * "fine lines"  → "finelines"
 */
export function normaliseConcern(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z]/g, '');
}
