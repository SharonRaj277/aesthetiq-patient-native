/**
 * doctorAssignment.ts
 *
 * Two exported functions:
 *
 *   autoAssignDoctor(domain)
 *     → Queries Firestore "doctors" collection for available doctors in the
 *       given domain, then applies a fair minimum-load distribution algorithm:
 *
 *         1. Filter: currentPatients < maxPatients  (not full)
 *         2. Find the minimum currentPatients value across available doctors
 *         3. Collect all doctors tied at that minimum (they carry the lightest load)
 *         4. Randomly select one from that tied group
 *
 *       This guarantees equal distribution — no doctor receives a second patient
 *       until every other doctor in the domain has at least one. When multiple
 *       doctors are equally free, the random pick prevents always favouring the
 *       same document order returned by Firestore.
 *
 *   assignDoctorToPatient(patientId, scanId, domain)
 *     → Calls autoAssignDoctor, then atomically:
 *         1. Creates a booking document in "bookings"
 *         2. Stamps the scan document with the assigned doctorId
 *         3. Increments the doctor's currentPatients by 1
 *
 *     All three writes are committed in a single writeBatch — they either all
 *     succeed or all fail, preventing partial state.
 *
 *     Returns AssignmentResult on success, null if no doctor is available or
 *     on any Firestore error. Never throws.
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ─── Types ────────────────────────────────────────────────────────

export type DoctorDomain = 'skin' | 'dental' | 'face' | 'hair';

export interface Doctor {
  /** Firestore document id */
  id:              string;
  name:            string;
  specialization:  string;
  domain:          DoctorDomain;
  status:          'active' | 'inactive';
  currentPatients: number;
  maxPatients:     number;
}

export interface Booking {
  patientId:  string;
  doctorId:   string;
  scanId:     string;
  domain:     DoctorDomain;
  status:     'confirmed';
  createdAt:  ReturnType<typeof serverTimestamp>;
}

export interface AssignmentResult {
  doctor:    Doctor;
  bookingId: string;
}

// ─── autoAssignDoctor ─────────────────────────────────────────────

/**
 * Fair minimum-load doctor selection.
 *
 * Algorithm:
 *   1. Fetch all active doctors for the domain from Firestore
 *   2. Exclude any doctor who has reached their maxPatients cap
 *   3. Find the lowest currentPatients value in the remaining pool
 *   4. Collect every doctor whose currentPatients equals that minimum
 *   5. Pick one at random from that tied group
 *
 * Why step 4–5 instead of just picking index 0?
 *   Firestore document ordering is not guaranteed. Picking randomly from the
 *   tied group ensures no single doctor is always first — even when they all
 *   have the same load, the assignment is spread evenly over time.
 *
 * Returns null when:
 *   - No active doctors exist for the domain
 *   - All active doctors are at capacity
 *   - Firestore query fails
 */
export async function autoAssignDoctor(domain: DoctorDomain): Promise<Doctor | null> {
  try {
    const q = query(
      collection(db, 'doctors'),
      where('domain', '==', domain),
      where('status', '==', 'active'),
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      console.log(`[autoAssignDoctor] No active doctors for domain: ${domain}`);
      return null;
    }

    // ── Step 1: Build pool of doctors who still have capacity ─────
    const available: Doctor[] = [];

    snap.docs.forEach((d) => {
      const data    = d.data();
      const current = data.currentPatients ?? 0;
      const max     = data.maxPatients     ?? 1;

      if (current >= max) return; // at or over capacity — skip

      available.push({
        id:              d.id,
        name:            data.name            ?? '',
        specialization:  data.specialization  ?? '',
        domain:          data.domain          ?? domain,
        status:          'active',
        currentPatients: current,
        maxPatients:     max,
      });
    });

    if (available.length === 0) {
      console.log(`[autoAssignDoctor] All doctors at capacity for domain: ${domain}`);
      return null;
    }

    // ── Step 2: Find the minimum currentPatients value ────────────
    const minLoad = available.reduce(
      (min, d) => Math.min(min, d.currentPatients),
      Infinity,
    );

    // ── Step 3: Collect all doctors tied at the minimum ───────────
    const leastLoaded = available.filter((d) => d.currentPatients === minLoad);

    // ── Step 4: Pick one at random from the tied group ───────────
    const selected = leastLoaded[Math.floor(Math.random() * leastLoaded.length)];

    console.log(
      `[autoAssignDoctor] Selected: ${selected.name} ` +
      `(patients: ${selected.currentPatients}/${selected.maxPatients}, ` +
      `tied pool size: ${leastLoaded.length})`,
    );

    return selected;

  } catch (err) {
    console.error('[autoAssignDoctor] Firestore error:', err);
    return null;
  }
}

// ─── assignDoctorToPatient ────────────────────────────────────────

/**
 * Orchestrates a full doctor assignment in three atomic Firestore writes:
 *
 *   1. bookings/{auto-id}   — confirmed booking document
 *   2. scans/{scanId}       — stamped with doctorId
 *   3. doctors/{doctorId}   — currentPatients incremented by 1
 *
 * All three writes are committed via a single writeBatch. If any write fails,
 * none are committed — preventing partial state (e.g. a booking with no
 * corresponding counter increment on the doctor side).
 *
 * Returns AssignmentResult (doctor + bookingId) on success, null otherwise.
 */
export async function assignDoctorToPatient(
  patientId: string,
  scanId:    string,
  domain:    DoctorDomain,
): Promise<AssignmentResult | null> {
  try {
    // Step 1: select the fairest available doctor
    const doctor = await autoAssignDoctor(domain);
    if (!doctor) {
      console.log('[assignDoctorToPatient] No doctor available — booking not created.');
      return null;
    }

    // Step 2: prepare atomic batch
    const batch = writeBatch(db);

    // 2a. Booking document (Firestore auto-id)
    const bookingRef = doc(collection(db, 'bookings'));
    batch.set(bookingRef, {
      patientId,
      doctorId:  doctor.id,
      scanId,
      domain,
      status:    'confirmed',
      createdAt: serverTimestamp(),
    } satisfies Omit<Booking, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> });

    // 2b. Stamp the scan with the assigned doctorId (skip if no scanId)
    if (scanId) {
      batch.update(doc(db, 'scans', scanId), {
        doctorId:  doctor.id,
        updatedAt: serverTimestamp(),
      });
    }

    // 2c. Increment doctor's currentPatients atomically
    //     Using increment() ensures concurrent assignments don't collide —
    //     Firestore applies it as a field transform, not a read-modify-write.
    batch.update(doc(db, 'doctors', doctor.id), {
      currentPatients: increment(1),
    });

    // Step 3: commit — all writes land together or none do
    await batch.commit();

    console.log(
      `[assignDoctorToPatient] Success — doctor: ${doctor.name}, ` +
      `bookingId: ${bookingRef.id}, patient: ${patientId}`,
    );

    return { doctor, bookingId: bookingRef.id };

  } catch (err) {
    console.error('[assignDoctorToPatient] Assignment failed:', err);
    return null;
  }
}
