import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, orderBy,
  doc, getDoc, addDoc, updateDoc, deleteDoc,
  DocumentData, QueryConstraint,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export function useCollection<T = DocumentData>(
  collectionPath: string,
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = collection(db, collectionPath);
    const q = constraints.length > 0 ? query(ref, ...constraints) : query(ref);

    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T & { id: string })));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [collectionPath]);

  return { data, loading, error };
}

export function useDocument<T = DocumentData>(collectionPath: string, docId: string) {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docId) return;
    const ref = doc(db, collectionPath, docId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setData({ id: snap.id, ...snap.data() } as T & { id: string });
      } else {
        setData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [collectionPath, docId]);

  return { data, loading };
}
