/**
 * useLivePlan — real-time Firestore listener for a patient's treatment plan.
 *
 * Listens to:
 *   treatment_plans  where patientId == uid  orderBy createdAt desc  limit 1
 *
 * Returns the most-recent plan (or null if none exists yet) plus loading state.
 * The listener is torn down automatically when the component unmounts.
 */

import { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, limit,
  onSnapshot, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ─── Firestore document shape ─────────────────────────────────────

export interface LiveProtocolItem {
  id:       string;
  name:     string;
  sessions: number;
}

export interface LiveMedication {
  name:         string;
  dosage:       string;
  instructions: string;
}

export type LiveDoctorAction = 'approved_ai' | 'modified' | 'custom';

export interface LiveTreatmentPlan {
  /** Firestore document id */
  id:           string;
  planId:       string;
  patientId:    string;
  doctorName:   string;
  doctorSpec:   string;
  doctorAction: LiveDoctorAction;
  status:       'pending' | 'accepted' | 'rejected';
  protocol:     LiveProtocolItem[];
  medications:  LiveMedication[];
  labTests:     string[];
  notes:        string;
  createdAt:    Timestamp | null;
  updatedAt:    Timestamp | null;
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useLivePlan(patientId: string | null) {
  const [plan, setPlan]       = useState<LiveTreatmentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'treatment_plans'),
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc'),
      limit(1),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setPlan(null);
        } else {
          const d = snap.docs[0];
          setPlan({ id: d.id, ...d.data() } as LiveTreatmentPlan);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useLivePlan] onSnapshot error:', err);
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  }, [patientId]);

  return { plan, loading, error };
}
