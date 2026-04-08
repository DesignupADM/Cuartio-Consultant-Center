
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '../provider';
import { UserProfile } from '../firestore/users';

export function useUser() {
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clear any existing profile listener
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        // Set up real-time listener for profile
        const profileRef = doc(db, "consultantProfiles", firebaseUser.uid);
        unsubscribeProfile = onSnapshot(profileRef, async (docSnap) => {
          if (docSnap.exists()) {
            setProfile({
              uid: firebaseUser.uid,
              role: "consultant",
              ...docSnap.data()
            } as UserProfile);
            setLoading(false);
          } else {
            // If not in consultantProfiles, check if they are an admin
            try {
              const adminRef = doc(db, "adminRoles", firebaseUser.uid);
              const adminSnap = await getDoc(adminRef);
              
              if (adminSnap.exists()) {
                setProfile({
                  uid: firebaseUser.uid,
                  role: "admin",
                  email: firebaseUser.email
                } as UserProfile);
              } else {
                // Default fallback
                setProfile({
                  uid: firebaseUser.uid,
                  role: "consultant",
                  email: firebaseUser.email
                } as UserProfile);
              }
            } catch (err) {
              console.error("Error checking admin role:", err);
              // Fallback to consultant on error
              setProfile({
                uid: firebaseUser.uid,
                role: "consultant",
                email: firebaseUser.email
              } as UserProfile);
            }
            setLoading(false);
          }
        }, (err) => {
          console.error("Profile listener error:", err);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [auth, db]);

  return { user, profile, loading };
}
