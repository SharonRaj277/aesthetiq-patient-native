/**
 * useScanUnlock — live unlock state for a scan document.
 *
 * Subscribes to scans/{scanId} via onSnapshot so that:
 *   1. The UI flips locked → unlocked the moment the unlockReport CF writes
 *      `unlocked: true`, even when the payment was processed asynchronously
 *      via a Razorpay webhook on a different device.
 *   2. AsyncStorage isn't queried at all — Firestore is the source of truth.
 *
 * Returns:
 *   unlocked       — boolean, defaults to `false` until the snap arrives
 *   loading        — true until the first snap (or a real scanId arrives)
 *   data           — the raw scan document data (or null)
 */

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ScanUnlockState {
  unlocked: boolean;
  loading:  boolean;
  data:     any | null;
}

export function useScanUnlock(scanId?: string | null): ScanUnlockState {
  const [state, setState] = useState<ScanUnlockState>({
    unlocked: false,
    loading:  true,
    data:     null,
  });

  useEffect(() => {
    // Mock / undefined / pre-CF scan ids never round-trip to Firestore
    if (!scanId || scanId.startsWith('scan') || scanId.startsWith('mock_')) {
      setState({ unlocked: false, loading: false, data: null });
      return;
    }

    const ref = doc(db, 'scans', scanId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        setState({
          unlocked: data?.unlocked === true,
          loading:  false,
          data,
        });
      },
      (err) => {
        console.warn('[useScanUnlock] snapshot error:', err);
        setState({ unlocked: false, loading: false, data: null });
      },
    );
    return unsub;
  }, [scanId]);

  return state;
}
