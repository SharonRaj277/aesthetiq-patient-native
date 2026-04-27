/**
 * useLiveScans — real-time Firestore listener for a patient's scan history.
 *
 * Listens to:
 *   scans  where patientId == uid  orderBy createdAt desc  limit 20
 *
 * Used by both:
 *   - Patient: to see their own scan history update instantly after processing
 *   - Doctor view: to see new patient scans appear without refresh
 *
 * Returns sorted scans (newest first) plus loading/error state.
 */

import { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, limit,
  onSnapshot, Timestamp, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ─── Firestore document shape ─────────────────────────────────────

export interface LiveScan {
  /** Firestore document id */
  id:          string;
  patientId:   string;
  type:        'face' | 'skin' | 'dental';
  scanId:      string;
  status:      'processing' | 'complete' | 'error';
  summary:     string;
  urgency:     string;
  concerns:    Array<{ area: string; severity: string; note?: string }>;
  recommendedTreatments: Array<{ name: string; category: string }>;
  createdAt:   Timestamp | null;
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useLiveScans(patientId: string | null, maxResults = 20) {
  const [scans, setScans]     = useState<LiveScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'scans'),
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc'),
      limit(maxResults),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setScans(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LiveScan)));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useLiveScans] onSnapshot error:', err);
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  }, [patientId, maxResults]);

  return { scans, loading, error };
}

// ─── Helper: save scan result to Firestore after processing ───────

/**
 * Called from processing.tsx after analyzeScan() resolves.
 * Writes the scan result to Firestore so the doctor sees it instantly
 * via the useLiveScans listener on their end.
 */
export async function saveScanToFirestore(
  patientId: string,
  result: {
    scanId:   string;
    type:     string;
    summary:  string;
    urgency:  string;
    concerns: Array<{ area: string; severity: string; note?: string }>;
    recommendedTreatments: Array<{ name: string; category: string }>;
  },
): Promise<void> {
  try {
    await addDoc(collection(db, 'scans'), {
      patientId,
      scanId:               result.scanId,
      type:                 result.type,
      status:               'complete',
      summary:              result.summary   ?? '',
      urgency:              result.urgency   ?? '',
      concerns:             result.concerns  ?? [],
      recommendedTreatments: result.recommendedTreatments ?? [],
      createdAt:            serverTimestamp(),
    });
    console.log('[saveScanToFirestore] saved scan:', result.scanId);
  } catch (err) {
    // Non-fatal — the app still works without Firestore persistence
    console.warn('[saveScanToFirestore] failed (non-fatal):', err);
  }
}
