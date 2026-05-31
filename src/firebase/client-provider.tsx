
'use client';

import React, { useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

import { UserProvider } from './auth/use-user';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const { app, db, auth, storage } = useMemo(() => {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app);
    return { app, db, auth, storage };
  }, []);

  return (
    <FirebaseProvider app={app} db={db} auth={auth} storage={storage}>
      <FirebaseErrorListener />
      <UserProvider>
        {children}
      </UserProvider>
    </FirebaseProvider>
  );
}
