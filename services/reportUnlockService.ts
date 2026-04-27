/**
 * reportUnlockService — manages per-scan report unlock state.
 *
 * Payment flow:
 *   1. Open Razorpay checkout (₹99)
 *   2. On payment success → POST /api/scan/unlock to backend
 *   3. On backend success → persist unlock locally (AsyncStorage + cache)
 *
 * Razorpay key: EXPO_PUBLIC_RAZORPAY_KEY_ID in .env.local
 * If the key is absent (Expo Go / CI), falls back to a mock flow so dev
 * remains unblocked.
 *
 * Critical safety:
 *   Urgency warnings and critical health alerts are NEVER hidden,
 *   regardless of unlock state. Enforced at the UI layer.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { unlockReport as callUnlockReport } from './api';

// ─── Constants ────────────────────────────────────────────────────
const STORAGE_KEY_PREFIX       = '@aesthetiq_report_unlock_';
export const REPORT_UNLOCK_PRICE    = 99;      // ₹99 per report
export const REPORT_UNLOCK_CURRENCY = '₹';

const RAZORPAY_KEY = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '';

// ─── Types ────────────────────────────────────────────────────────
export interface UnlockState {
  scanId: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  transactionId?: string;
}

export type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface RazorpayPrefill {
  email?: string;
  contact?: string;
  name?: string;
}

// ─── In-memory cache ──────────────────────────────────────────────
const _cache = new Map<string, boolean>();

// ─── Core persistence ─────────────────────────────────────────────

export async function isReportUnlocked(scanId: string): Promise<boolean> {
  if (_cache.has(scanId)) return _cache.get(scanId)!;
  try {
    const stored = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${scanId}`);
    if (stored) {
      const state: UnlockState = JSON.parse(stored);
      _cache.set(scanId, state.isUnlocked);
      return state.isUnlocked;
    }
  } catch (e) {
    console.warn('[reportUnlockService] Failed to read unlock state:', e);
  }
  return false;
}

export async function markReportUnlocked(
  scanId: string,
  transactionId?: string,
): Promise<void> {
  const state: UnlockState = {
    scanId,
    isUnlocked: true,
    unlockedAt: new Date().toISOString(),
    transactionId,
  };
  _cache.set(scanId, true);
  try {
    await AsyncStorage.setItem(
      `${STORAGE_KEY_PREFIX}${scanId}`,
      JSON.stringify(state),
    );
  } catch (e) {
    console.warn('[reportUnlockService] Failed to persist unlock state:', e);
  }
}

export async function getUnlockedScanIds(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const unlockKeys = keys.filter((k) => k.startsWith(STORAGE_KEY_PREFIX));
    if (unlockKeys.length === 0) return [];
    const pairs = await AsyncStorage.multiGet(unlockKeys);
    const unlocked: string[] = [];
    for (const [, value] of pairs) {
      if (value) {
        try {
          const state: UnlockState = JSON.parse(value);
          if (state.isUnlocked) unlocked.push(state.scanId);
        } catch {}
      }
    }
    return unlocked;
  } catch {
    return [];
  }
}

// ─── Payment flow ─────────────────────────────────────────────────

/**
 * Opens Razorpay checkout for ₹99.
 *
 * Returns the transaction ID on success.
 * Falls back to a mock (95% success) when EXPO_PUBLIC_RAZORPAY_KEY_ID
 * is not set — keeps dev / Expo Go unblocked.
 */
async function initiateRazorpayPayment(
  scanId: string,
  prefill?: RazorpayPrefill,
): Promise<PaymentResult> {
  // ── Mock fallback (no Razorpay key or non-native env) ──────────
  if (!RAZORPAY_KEY) {
    console.info('[reportUnlockService] No Razorpay key — using mock payment');
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.05;
        if (success) {
          const txnId = `MOCK_TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          resolve({ success: true, transactionId: txnId });
        } else {
          resolve({ success: false, error: 'Payment was declined. Please try again.' });
        }
      }, 1500);
    });
  }

  // ── Real Razorpay checkout ─────────────────────────────────────
  try {
    // Dynamic require so the app doesn't crash in Expo Go (no native module)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RazorpayCheckout = require('react-native-razorpay').default;

    const options = {
      description:  'AI Report Unlock',
      currency:     'INR',
      key:          RAZORPAY_KEY,
      amount:       REPORT_UNLOCK_PRICE * 100, // paise
      name:         'AesthetiQ',
      order_id:     '',   // fill when you create server-side Razorpay order
      prefill: {
        email:   prefill?.email   ?? '',
        contact: prefill?.contact ?? '',
        name:    prefill?.name    ?? '',
      },
      theme: { color: '#7C3AED' },
      notes: { scanId },
    };

    const data = await RazorpayCheckout.open(options);
    // data.razorpay_payment_id is the transaction reference
    return { success: true, transactionId: data.razorpay_payment_id as string };
  } catch (err: any) {
    // Razorpay throws an object { code, description } on cancel/failure
    const description: string =
      err?.description ?? err?.message ?? 'Payment cancelled or failed.';
    return { success: false, error: description };
  }
}

/**
 * Full unlock flow:
 *   Razorpay checkout → backend record → local persistence → result
 *
 * @param scanId   Scan to unlock
 * @param userId   Firebase UID of the paying user
 * @param prefill  Optional Razorpay prefill (email, phone, name)
 */
export async function unlockReport(
  scanId: string,
  userId?: string,
  prefill?: RazorpayPrefill,
): Promise<PaymentResult> {
  // 1. Open payment sheet
  const paymentResult = await initiateRazorpayPayment(scanId, prefill);
  if (!paymentResult.success) return paymentResult;

  const txnId = paymentResult.transactionId!;

  // 2. Record on backend via the unlockReport callable. The CF is authoritative
  // — it sets `unlocked: true` on the scan doc + records a transactions log.
  // If the call fails we still persist locally so the user isn't blocked;
  // the backend can reconcile from a Razorpay webhook later.
  try {
    await callUnlockReport(scanId, txnId, REPORT_UNLOCK_PRICE * 100);
  } catch (err) {
    console.warn('[reportUnlockService] unlockReport callable failed:', err);
  }

  // 3. Persist locally for offline / hot-reload resilience
  await markReportUnlocked(scanId, txnId);

  return { success: true, transactionId: txnId };
}

// ─── Mock unlock (dev mode) ──────────────────────────────────────

/**
 * Bypasses Razorpay and writes `unlocked: true` directly via the backend
 * callable + AsyncStorage. Triggered when EXPO_PUBLIC_RAZORPAY_KEY_ID is
 * empty so dev / Expo Go flows aren't blocked.
 */
export async function mockUnlockReport(scanId: string): Promise<PaymentResult> {
  const txnId = `mock_${scanId}_${Date.now()}`;
  console.log('[dev] Mock unlock for scanId:', scanId);

  try {
    await callUnlockReport(scanId, txnId, REPORT_UNLOCK_PRICE * 100);
  } catch (err) {
    console.warn('[reportUnlockService] mock unlockReport callable failed:', err);
  }

  await markReportUnlocked(scanId, txnId);
  return { success: true, transactionId: txnId };
}

/** True when running in dev mode without a configured Razorpay key */
export function isMockPaymentMode(): boolean {
  return !RAZORPAY_KEY;
}
