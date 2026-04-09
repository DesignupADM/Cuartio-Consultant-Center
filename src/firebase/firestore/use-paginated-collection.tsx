'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Query, 
  getDocs, 
  DocumentData,
  QueryDocumentSnapshot,
  limit as firestoreLimit,
  startAfter,
  query as firestoreQuery
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function usePaginatedCollection<T = DocumentData>(baseQuery: Query<T> | null, pageSize: number = 20) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(Boolean(baseQuery));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<T> | null>(null);

  useEffect(() => {
    if (!baseQuery) {
      setData([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setHasMore(true);

    const q = firestoreQuery(baseQuery, firestoreLimit(pageSize));

    getDocs(q).then((snapshot) => {
      if (!isMounted) return;
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
      setData(docs);
      if (snapshot.docs.length < pageSize) {
        setHasMore(false);
      } else {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setLoading(false);
    }).catch(err => {
      if (!isMounted) return;
      const permissionError = new FirestorePermissionError({
        path: 'collection',
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
      setError(err);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [baseQuery, pageSize]);

  const loadMore = useCallback(async () => {
    if (!baseQuery || !hasMore || loadingMore || !lastDoc) return;
    
    setLoadingMore(true);
    
    try {
      const nextQuery = firestoreQuery(baseQuery, startAfter(lastDoc), firestoreLimit(pageSize));
      const snapshot = await getDocs(nextQuery);
      
      const newDocs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
      setData(prev => [...prev, ...newDocs]);
      
      if (snapshot.docs.length < pageSize) {
        setHasMore(false);
      } else {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (err: any) {
      const permissionError = new FirestorePermissionError({
        path: 'collection',
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
      setError(err);
    } finally {
      setLoadingMore(false);
    }
  }, [baseQuery, hasMore, loadingMore, lastDoc, pageSize]);

  if (!baseQuery) {
    return { data: [], loading: false, loadingMore: false, error: null, hasMore: false, loadMore: async () => {} };
  }

  return { data, loading, loadingMore, error, hasMore, loadMore };
}
