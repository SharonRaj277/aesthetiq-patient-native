/**
 * config/firebase.ts
 *
 * Re-exports Firebase services from the canonical initialisation in
 * firebase/config.ts so that every module in the app — regardless of
 * which path it imports from — uses the exact same app singleton,
 * auth instance, and Firestore database reference.
 *
 * Previously this file contained its own initializeApp() call with a
 * different apiKey (iOS appId vs web appId), which caused:
 *   • "auth/admin-restricted-operation" — the two apiKeys resolved to
 *     different OAuth client configurations in the Google backend
 *   • Duplicate-app warnings on hot-reload when both modules evaluated
 *
 * Now there is exactly ONE initializeApp() call in the entire codebase
 * (firebase/config.ts). This file is a thin re-export shim kept so that
 * existing import paths (services/, hooks/) continue to work without changes.
 */

export {
  app,
  auth,
  db,
  storage,
  functions,
  ensureUser,
  callFunction,
  IS_FIREBASE_READY,
} from '../firebase/config';
