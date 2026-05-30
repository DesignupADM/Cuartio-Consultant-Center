
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '../provider';
import { UserProfile } from '../firestore/users';

const profileCache = new Map<string, UserProfile | null>();
const profileRequestCache = new Map<string, Promise<UserProfile | null>>();

function buildConsultantProfile(firebaseUser: User, data?: Record<string, unknown>): UserProfile {
  return {
    uid: firebaseUser.uid,
    role: "consultant",
    email: firebaseUser.email,
    ...(data || {}),
  } as UserProfile;
}

function buildAdminProfile(firebaseUser: User): UserProfile {
  return {
    uid: firebaseUser.uid,
    role: "admin",
    email: firebaseUser.email,
  };
}

async function resolveInitialProfile(db: ReturnType<typeof useFirestore>, firebaseUser: User): Promise<UserProfile | null> {
  const cached = profileCache.get(firebaseUser.uid);
  if (cached !== undefined) {
    return cached
      ? {
          ...cached,
          email: firebaseUser.email ?? cached.email,
        }
      : null;
  }

  const inFlightRequest = profileRequestCache.get(firebaseUser.uid);
  if (inFlightRequest) {
    return inFlightRequest;
  }

  const request = (async () => {
    // 1. Check Custom Claims first for admin role (fast-path)
    const idTokenResult = await firebaseUser.getIdTokenResult();
    if (idTokenResult.claims.admin === true) {
      const resolvedProfile = buildAdminProfile(firebaseUser);
      profileCache.set(firebaseUser.uid, resolvedProfile);
      return resolvedProfile;
    }

    // 2. Fallback to parallel Firestore collection lookups
    const adminRoleRef = doc(db, "adminRoles", firebaseUser.uid);
    const profileRef = doc(db, "consultantProfiles", firebaseUser.uid);
    const consultantRoleRef = doc(db, "consultantRoles", firebaseUser.uid);

    const [adminSnap, profileSnap, consultantRoleSnap] = await Promise.all([
      getDoc(adminRoleRef),
      getDoc(profileRef),
      getDoc(consultantRoleRef),
    ]);

    if (adminSnap.exists()) {
      const resolvedProfile = buildAdminProfile(firebaseUser);
      profileCache.set(firebaseUser.uid, resolvedProfile);
      return resolvedProfile;
    }

    if (profileSnap.exists()) {
      const resolvedProfile = buildConsultantProfile(firebaseUser, profileSnap.data());
      profileCache.set(firebaseUser.uid, resolvedProfile);
      return resolvedProfile;
    }

    if (consultantRoleSnap.exists()) {
      const resolvedProfile = buildConsultantProfile(firebaseUser);
      profileCache.set(firebaseUser.uid, resolvedProfile);
      return resolvedProfile;
    }

    const fallbackProfile = buildConsultantProfile(firebaseUser);
    profileCache.set(firebaseUser.uid, fallbackProfile);
    return fallbackProfile;
  })().finally(() => {
    profileRequestCache.delete(firebaseUser.uid);
  });

  profileRequestCache.set(firebaseUser.uid, request);
  return request;
}

export function useUser() {
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let isCancelled = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clear any existing profile listener
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const cachedProfile = profileCache.get(firebaseUser.uid);
        if (cachedProfile !== undefined) {
          setProfile(cachedProfile);
          setLoading(false);
        } else {
          setLoading(true);
        }

        try {
          const resolvedProfile = await resolveInitialProfile(db, firebaseUser);
          if (isCancelled) return;

          setProfile(resolvedProfile);
          setLoading(false);

          if (resolvedProfile?.role === "consultant") {
            const profileRef = doc(db, "consultantProfiles", firebaseUser.uid);
            unsubscribeProfile = onSnapshot(
              profileRef,
              (docSnap) => {
                const nextProfile = docSnap.exists()
                  ? buildConsultantProfile(firebaseUser, docSnap.data())
                  : buildConsultantProfile(firebaseUser);

                profileCache.set(firebaseUser.uid, nextProfile);
                setProfile(nextProfile);
              },
              (err) => {
                console.error("Profile listener error:", err);
              }
            );
          }
        } catch (err) {
          console.error("Error resolving user profile:", err);
          if (isCancelled) return;

          const fallbackProfile = buildConsultantProfile(firebaseUser);
          profileCache.set(firebaseUser.uid, fallbackProfile);
          setProfile(fallbackProfile);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [auth, db]);

  return { user, profile, loading };
}
