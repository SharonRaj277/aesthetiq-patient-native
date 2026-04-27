/**
 * analytics.ts — funnel event tracker
 *
 * Writes events to Firestore `analytics_events` collection (append-only).
 * Falls back to console.log when Firestore is unavailable (dev / offline).
 *
 * All events share a common payload:
 *   { userId, scanId, scanType, timestamp }
 *
 * Tracked funnel:
 *   scan_started → scan_completed → teaser_viewed →
 *   unlock_clicked → payment_success → report_viewed
 */

// ─── Types ────────────────────────────────────────────────────────

export type FunnelEvent =
  | 'scan_started'
  | 'scan_completed'
  | 'teaser_viewed'
  | 'unlock_clicked'
  | 'payment_success'
  | 'report_viewed';

export interface EventPayload {
  userId?:   string;
  scanId?:   string;
  scanType?: 'face' | 'skin' | 'dental' | string;
  /** Extra free-form metadata (e.g. urgencyTier, transactionId) */
  meta?:     Record<string, string | number | boolean>;
}

interface AnalyticsEvent extends EventPayload {
  event:     FunnelEvent;
  timestamp: string; // ISO-8601
}

// ─── Core ─────────────────────────────────────────────────────────

/**
 * Track a funnel event.
 * Fire-and-forget — never throws, never blocks UI.
 */
export function track(event: FunnelEvent, payload: EventPayload = {}): void {
  const record: AnalyticsEvent = {
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  // Always log locally — useful in dev and as an offline audit trail
  console.info(`[analytics] ${event}`, record);

  // Persist to Firestore asynchronously — failure is silently swallowed
  _writeToFirestore(record).catch(() => {
    // Silently ignore — analytics must never crash the app
  });
}

// ─── Firestore writer (lazy import — avoids loading Firebase on every screen) ─

async function _writeToFirestore(record: AnalyticsEvent): Promise<void> {
  const { addDoc, collection } = await import('firebase/firestore');
  const { db } = await import('../config/firebase');
  await addDoc(collection(db, 'analytics_events'), record);
}

// ─── Convenience wrappers ─────────────────────────────────────────

export const Analytics = {
  scanStarted:    (p: EventPayload) => track('scan_started',    p),
  scanCompleted:  (p: EventPayload) => track('scan_completed',  p),
  teaserViewed:   (p: EventPayload) => track('teaser_viewed',   p),
  unlockClicked:  (p: EventPayload) => track('unlock_clicked',  p),
  paymentSuccess: (p: EventPayload) => track('payment_success', p),
  reportViewed:   (p: EventPayload) => track('report_viewed',   p),
} as const;
