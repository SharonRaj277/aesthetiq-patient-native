import React, {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';
import { DEV_MODE, DEV_USER } from '../config/devMode';

// ─── Types ────────────────────────────────────────────────────────
export interface UserProfile {
  uid:           string;
  fullName:      string;
  email:         string;
  profileImage?: string;
}

interface UserContextType {
  user:          UserProfile | null;
  loading:       boolean;
  updateProfile: (data: Partial<Pick<UserProfile, 'fullName' | 'profileImage'>>) => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user:          null,
  loading:       true,
  updateProfile: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEV_MODE) {
      // Skip Firebase entirely — use static dev user
      setUser(DEV_USER);
      setLoading(false);
      return;
    }

    // ── Real Firebase auth (active when DEV_MODE = false) ──────────
    let unsubDoc: (() => void) | null = null;

    async function startFirebaseAuth() {
      try {
        const { onAuthStateChanged } = await import('firebase/auth');
        const { doc, onSnapshot }    = await import('firebase/firestore');
        const { auth, db }           = await import('../config/firebase');

        if (!auth || !db) {
          setUser(null);
          setLoading(false);
          return;
        }

        const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
          if (unsubDoc) { unsubDoc(); unsubDoc = null; }

          if (firebaseUser) {
            const ref = doc(db, 'users', firebaseUser.uid);
            unsubDoc = onSnapshot(
              ref,
              (snap) => {
                const d = snap.exists() ? snap.data() : {};
                setUser({
                  uid:          firebaseUser.uid,
                  fullName:     d.fullName     ?? firebaseUser.displayName ?? '',
                  email:        d.email        ?? firebaseUser.email       ?? '',
                  profileImage: d.profileImage ?? firebaseUser.photoURL    ?? undefined,
                });
                setLoading(false);
              },
              () => {
                setUser({
                  uid:      firebaseUser.uid,
                  fullName: firebaseUser.displayName ?? '',
                  email:    firebaseUser.email       ?? '',
                });
                setLoading(false);
              },
            );
          } else {
            setUser(null);
            setLoading(false);
          }
        });

        return () => {
          unsubAuth();
          if (unsubDoc) unsubDoc();
        };
      } catch (e) {
        console.warn('[UserContext] Firebase unavailable:', e);
        setUser(null);
        setLoading(false);
      }
    }

    const cleanup = startFirebaseAuth();
    return () => { cleanup.then((fn) => fn?.()).catch(() => {}); };
  }, []);

  const updateProfile = useCallback(async (
    data: Partial<Pick<UserProfile, 'fullName' | 'profileImage'>>,
  ) => {
    // Always update local state
    setUser((prev) => prev ? { ...prev, ...data } : prev);

    if (DEV_MODE) return;

    try {
      const { setDoc, doc } = await import('firebase/firestore');
      const { db }          = await import('../config/firebase');
      if (!user || !db) return;
      await setDoc(doc(db, 'users', user.uid), data, { merge: true });
    } catch (e) {
      console.warn('[UserContext] updateProfile failed:', e);
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ user, loading, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  return useContext(UserContext);
}
