
'use client';

import { useState, useEffect } from 'react';
import { 
  Query, 
  onSnapshot, 
  QuerySnapshot, 
  DocumentData,
  getDocs
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T = DocumentData>(query: Query<T> | null, options?: { listen?: boolean }) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(Boolean(query));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      return;
    }

    const listen = options?.listen ?? true;

    if (!listen) {
      getDocs(query).then((snapshot) => {
        setData(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T)));
        setLoading(false);
      }).catch(err => {
        const permissionError = new FirestorePermissionError({
          path: 'collection',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setLoading(false);
      });
      return;
    }

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        setData(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        setLoading(false);
      },
      async (err) => {
        const permissionError = new FirestorePermissionError({
          path: 'collection',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  if (!query) {
    return { data: [], loading: false, error: null };
  }

  return { data, loading, error };
}
