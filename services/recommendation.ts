/**
 * Fetches Firestore treatments recommended for a patient based on AI scan concerns.
 *
 * Flow:
 *   concerns[] (ScanConcern[] | string[])
 *     → assign severity weight  (high=3, medium=2, low=1)
 *     → map area → Firestore category via concernToCategoryMap
 *     → query "treatments" collection per unique category
 *     → attach weight + severity to every result
 *     → sort: highest weight first, then alphabetically by name as tiebreaker
 *     → return top MAX_RESULTS items  (name + category only, never price)
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { concernToCategoryMap, normaliseConcern } from './aiMapper';
import type { ScanConcern } from '../constants/mockData';

// ─── Constants ────────────────────────────────────────────────────

const MAX_RESULTS = 5;

export const SEVERITY_WEIGHT: Record<string, number> = {
  high:   3,
  medium: 2,
  low:    1,
};

// ─── Types ────────────────────────────────────────────────────────

export type Severity = 'high' | 'medium' | 'low';

export interface RecommendedTreatmentItem {
  /** Firestore document id */
  id:             string;
  name:           string;
  category:       string;
  domain:         string;
  /** The raw concern string (e.g. "acne", "Dark Spots") that triggered this */
  matchedConcern: string;
  severity:       Severity;
  /** Numeric weight used for sorting: high=3, medium=2, low=1 */
  weight:         number;
}

// ─── Internal shape used while building results before sort ───────

interface ScoredCategoryEntry {
  category:       string;
  matchedConcern: string;
  severity:       Severity;
  weight:         number;
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Builds an ordered list of { category, severity, weight } entries from
 * the incoming concerns, deduplicating by category and keeping the
 * highest-weight entry when the same category is produced by multiple concerns.
 */
function buildScoredCategories(
  concerns: ScanConcern[] | string[],
): ScoredCategoryEntry[] {
  const categoryBest = new Map<string, ScoredCategoryEntry>();

  for (const concern of concerns) {
    const raw      = typeof concern === 'string' ? concern : concern.area;
    const sev      = typeof concern === 'string' ? 'low' : concern.severity;
    const weight   = SEVERITY_WEIGHT[sev] ?? 1;
    const key      = normaliseConcern(raw);
    const category = concernToCategoryMap[key];

    if (!category) continue;

    const existing = categoryBest.get(category);
    if (!existing || weight > existing.weight) {
      categoryBest.set(category, {
        category,
        matchedConcern: raw,
        severity:       sev as Severity,
        weight,
      });
    }
  }

  // Sort entries so we query highest-priority categories first
  return Array.from(categoryBest.values()).sort((a, b) => b.weight - a.weight);
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Returns up to MAX_RESULTS Firestore treatments sorted by severity weight
 * (high → medium → low) then alphabetically by name as a tiebreaker.
 *
 * Accepts either:
 *   - ScanConcern[]  from backend / mockData  (uses `.area` + `.severity`)
 *   - string[]       raw concern strings       (severity defaults to 'low')
 *
 * Price is never fetched or returned — display-only data.
 */
export async function getRecommendedTreatments(
  concerns: ScanConcern[] | string[],
): Promise<RecommendedTreatmentItem[]> {
  try {
    const scoredCategories = buildScoredCategories(concerns);
    if (scoredCategories.length === 0) return [];

    const unsorted: RecommendedTreatmentItem[] = [];

    for (const entry of scoredCategories) {
      if (unsorted.length >= MAX_RESULTS) break;

      const q    = query(collection(db, 'treatments'), where('category', '==', entry.category));
      const snap = await getDocs(q);

      snap.docs
        .slice(0, MAX_RESULTS - unsorted.length)
        .forEach((doc) => {
          const d = doc.data();
          unsorted.push({
            id:             doc.id,
            name:           d.name     ?? '',
            category:       d.category ?? entry.category,
            domain:         d.domain   ?? '',
            matchedConcern: entry.matchedConcern,
            severity:       entry.severity,
            weight:         entry.weight,
          });
        });
    }

    // Final sort: weight DESC, then name ASC as stable tiebreaker
    return unsorted
      .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name))
      .slice(0, MAX_RESULTS);
  } catch (err) {
    console.error('[recommendation] Firestore fetch failed:', err);
    return [];
  }
}
