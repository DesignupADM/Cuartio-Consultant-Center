import { 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  serverTimestamp, 
  getDoc,
  runTransaction,
} from "firebase/firestore";

export interface ApplicantData {
  uid: string;
  name: string;
  email: string;
  location: string;
  status: 'applied' | 'accepted' | 'declined';
  appliedDate: any;
}

export interface Opportunity {
  id: string;
  title: string;
  location: string;
  region: string;
  duration: string;
  deadline: string;
  description: string;
  tags: string[];
  status: 'open' | 'closed' | 'draft';
  requirements?: string[];
  createdAt: any;
  updatedAt?: any;
}

/**
 * Submits a consultant application for a specific opportunity.
 */
export async function applyToOpportunity(
  db: Firestore, 
  opportunityId: string, 
  userData: { uid: string; firstName: string; lastName: string; email: string; country: string }
): Promise<void> {
  const applicantRef = doc(db, "opportunities", opportunityId, "applicants", userData.uid);

  await runTransaction(db, async (transaction) => {
    const existingDoc = await transaction.get(applicantRef);
    if (existingDoc.exists()) {
      throw new Error("You have already applied for this opportunity.");
    }

    const applicantData: ApplicantData = {
      uid: userData.uid,
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      location: userData.country || "Not specified",
      status: 'applied',
      appliedDate: serverTimestamp()
    };

    transaction.set(applicantRef, applicantData);
  });
}

/**
 * Creates a new opportunity in Firestore.
 */
export async function createOpportunity(
  db: Firestore,
  data: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
  const oppsRef = collection(db, "opportunities");
  const docRef = await addDoc(oppsRef, {
    ...data,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}
