/**
 * firebase/config.ts — single source of truth for Firebase initialisation.
 *
 * config/firebase.ts re-exports everything from here so both import paths
 * in the codebase resolve to the exact same app singleton and service objects.
 *
 * ⚠️  auth/admin-restricted-operation is almost always a Firebase console
 *     issue, not a code issue. Before debugging code, verify in the console:
 *       Authentication → Sign-in method → Anonymous → ENABLED
 *     The error fires when the project has Anonymous auth disabled.
 *
 * Network note — Android emulators:
 *   Never call connectFunctionsEmulator(). localhost is unreachable from
 *   physical devices and Android emulators. Use deployed HTTPS endpoints only.
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ─── Config — verified against Firebase console (project: aesthetiq-8b5e3) ──
//
// Uses the WEB appId. The iOS appId (plist) is for native SDK builds only;
// the JS/Expo bundle always uses the web registration.

const firebaseConfig = {
  apiKey:            'AIzaSyCFd64hBYQfry5Nr9UYNN95RRmtbP484HE',
  authDomain:        'aesthetiq-8b5e3.firebaseapp.com',
  projectId:         'aesthetiq-8b5e3',
  storageBucket:     'aesthetiq-8b5e3.firebasestorage.app',
  messagingSenderId: '252876100252',
  appId:             '1:252876100252:web:14e3fa333efef08e461359',
  measurementId:     'G-F1V7TZRM1W',
};

// ─── App singleton ────────────────────────────────────────────────
// getApps() guard prevents "App already exists" crash on hot-reload.

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

console.log('🔥 Firebase Project:', app.options.projectId);

// ─── Services — all bound to the same app instance ────────────────

export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const storage   = getStorage(app);
export const functions = getFunctions(app, 'asia-south1');

export { app };
export const IS_FIREBASE_READY = true;

// ─── ensureUser ───────────────────────────────────────────────────
//
// Cloud Functions with `if (!context.auth) throw HttpsError('unauthenticated')`
// need a valid Firebase ID token on every call. This helper guarantees one:
//
//   1. auth.currentUser exists  →  return immediately (zero network cost)
//   2. SDK still restoring session from memory  →  wait for onAuthStateChanged
//   3. Truly no session  →  signInAnonymously() and return the new user
//
// The deduplication lock (_authReadyPromise) ensures that if two Cloud
// Function calls fire simultaneously before auth is ready, only ONE
// signInAnonymously() executes — not two racing each other.
//
// IMPORTANT: the promise is kept alive (not nulled in .finally()) so that
// all concurrent callers share the same resolution. It is only cleared
// after the promise settles AND all callers have received the value.
//
// If you still see auth/admin-restricted-operation after this fix:
//   → Go to Firebase Console → Authentication → Sign-in method
//   → Enable "Anonymous" provider (it is disabled by default on new projects)

let _authReadyPromise: Promise<User> | null = null;

export const ensureUser = async (): Promise<User> => {
  // Fast path — user is already known synchronously
  if (auth.currentUser) return auth.currentUser;

  // Return the in-flight promise so concurrent callers share it
  if (_authReadyPromise) return _authReadyPromise;

  _authReadyPromise = new Promise<User>((resolve, reject) => {
    // onAuthStateChanged fires once with the restored session (or null).
    // We unsubscribe immediately — we only need the first emission.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();

      try {
        if (user) {
          // Session was restored from memory — use it as-is
          console.log('✅ Firebase Auth restored, UID:', user.uid);
          resolve(user);
        } else {
          // No session — sign in anonymously so Cloud Functions accept the call
          console.log('🔐 Attempting anonymous sign-in...');
          const credential = await signInAnonymously(auth);
          console.log('✅ Signed in anonymously, UID:', credential.user.uid);
          resolve(credential.user);
        }
      } catch (error: any) {
        // Common causes:
        //   auth/admin-restricted-operation → Anonymous auth not enabled in console
        //   auth/network-request-failed     → No network / wrong endpoint
        console.error('❌ Anonymous sign-in failed:', error.code, error.message);
        reject(error);
      }
    });
  });

  // Clear the lock only after the promise has settled so any caller that
  // arrives while sign-in is in-flight still gets the same promise.
  _authReadyPromise.then(
    () => { _authReadyPromise = null; },
    () => { _authReadyPromise = null; },
  );

  return _authReadyPromise;
};

// ─── callFunction ─────────────────────────────────────────────────
//
// Wraps httpsCallable with two guarantees:
//   1. ensureUser() runs first → auth.currentUser is set before the call
//   2. The Firebase SDK reads auth.currentUser and attaches the ID token
//      in the Authorization header automatically → context.auth is always
//      populated on the backend

export async function callFunction<TData = unknown, TResult = unknown>(
  name: string,
  data?: TData,
): Promise<TResult> {
  // Step 1: guarantee a valid user session exists
  const user = await ensureUser();

  // Step 2: force-refresh the ID token so the SDK sends a non-expired token.
  //
  // Why force: auth.currentUser can exist while the cached token is stale
  // (expired or not yet issued for a brand-new anonymous sign-in). The
  // Firebase Functions SDK reads the token from the in-memory cache —
  // if that cache is empty or expired, context.auth arrives as null on the
  // backend even though the client believes it is signed in.
  //
  // getIdToken(true) fetches a fresh token from the Firebase Auth servers
  // and updates the SDK's internal cache. The subsequent httpsCallable call
  // then picks up that fresh token automatically from the cache.
  try {
    await user.getIdToken(/* forceRefresh */ true);
    console.log('🔑 ID token refreshed for UID:', user.uid);
  } catch (tokenErr: any) {
    // Non-fatal for anonymous users on first sign-in — the SDK may already
    // have a valid token. Log and continue; httpsCallable will use whatever
    // token is available.
    console.warn('[callFunction] Token refresh warning:', tokenErr?.code ?? tokenErr);
  }

  // Step 3: call the Cloud Function — SDK attaches the token automatically
  try {
    const fn     = httpsCallable<TData, TResult>(functions, name);
    const result = await fn(data as TData);
    return result.data;
  } catch (error: any) {
    console.error(
      `[callFunction] "${name}" failed —`,
      'code:',    error?.code,
      'message:', error?.message,
      'details:', error?.details,
    );
    throw error;
  }
}
