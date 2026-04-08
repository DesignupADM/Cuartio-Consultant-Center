
import { doc, getDoc, setDoc, Firestore } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email?: string | null;
  role: "admin" | "consultant";
  displayName?: string;
  createdAt?: string;
  // Consultant specific fields
  firstName?: string;
  lastName?: string;
  profession?: string;
  country?: string;
  sector?: string;
  years?: number;
  bio?: string;
  phone?: string;
  cvUrl?: string;
  avatarUrl?: string;
  id?: string;
  updatedAt?: string;
  aiInsight?: any;
  customAnswers?: Record<string, any>;
}

export async function getUserProfile(db: Firestore, uid: string): Promise<UserProfile | null> {
  // Check Admin Roles
  const adminDocRef = doc(db, "adminRoles", uid);
  const adminDocSnap = await getDoc(adminDocRef);

  if (adminDocSnap.exists()) {
    return {
      uid,
      role: "admin",
    };
  }

  // Check Consultant Roles
  const consultantRoleDocRef = doc(db, "consultantRoles", uid);
  const consultantRoleDocSnap = await getDoc(consultantRoleDocRef);

  if (consultantRoleDocSnap.exists()) {
    // If they have the role, fetch their profile data
    const profileDocRef = doc(db, "consultantProfiles", uid);
    const profileDocSnap = await getDoc(profileDocRef);

    if (profileDocSnap.exists()) {
      return {
        uid,
        role: "consultant",
        ...profileDocSnap.data()
      } as UserProfile;
    }

    return {
      uid,
      role: "consultant",
    };
  }

  return null;
}

export async function createUserProfile(db: Firestore, profile: UserProfile): Promise<void> {
  if (profile.role === "admin") {
    const adminDocRef = doc(db, "adminRoles", profile.uid);
    await setDoc(adminDocRef, { enabled: true });
  } else {
    const roleDocRef = doc(db, "consultantRoles", profile.uid);
    await setDoc(roleDocRef, { enabled: true });

    const profileDocRef = doc(db, "consultantProfiles", profile.uid);
    await setDoc(profileDocRef, {
      ...profile,
      id: profile.uid // Ensure ID matches UID as required by rules
    });
  }
}
