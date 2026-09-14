
import { doc, getDoc, setDoc, writeBatch, Firestore } from "firebase/firestore";

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
  professions?: string[];
  country?: string;
  state?: string;
  city?: string;
  sector?: string;
  sectors?: string[];
  services?: string[];
  regions?: string[];
  years?: number;
  bio?: string;
  phone?: string;
  cvUrl?: string;
  avatarUrl?: string;
  gender?: string;
  genderSelfDescribe?: string;
  dateOfBirth?: string;
  alternativeEmail?: string;
  highestDegree?: string;
  completionYear?: string;
  nativeLanguage?: string;
  otherLanguages?: string[];
  website?: string;
  skype?: string;
  status?: string;
  step?: string;
  registrationDate?: string;
  language?: string;
  id?: string;
  updatedAt?: string;
  aiInsight?: any;
  customAnswers?: Record<string, any>;
}

export async function getUserProfile(db: Firestore, uid: string): Promise<UserProfile | null> {
  const adminDocRef = doc(db, "adminRoles", uid);
  const consultantRoleDocRef = doc(db, "consultantRoles", uid);

  const [adminDocSnap, consultantRoleDocSnap] = await Promise.all([
    getDoc(adminDocRef),
    getDoc(consultantRoleDocRef),
  ]);

  if (adminDocSnap.exists()) {
    return {
      uid,
      role: "admin",
      ...adminDocSnap.data()
    };
  }

  if (consultantRoleDocSnap.exists()) {
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
    const batch = writeBatch(db);
    const roleDocRef = doc(db, "consultantRoles", profile.uid);
    const profileDocRef = doc(db, "consultantProfiles", profile.uid);

    batch.set(roleDocRef, { enabled: true });
    batch.set(profileDocRef, {
      ...profile,
      id: profile.uid // Ensure ID matches UID as required by rules
    });

    await batch.commit();
  }
}
