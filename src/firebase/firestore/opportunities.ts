import { 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  serverTimestamp, 
  getDoc,
  runTransaction,
  updateDoc
} from "firebase/firestore";

export interface ApplicantData {
  uid: string;
  name: string;
  email: string;
  location: string;
  status: 'applied' | 'accepted' | 'declined';
  appliedDate: any;
  cvUrl?: string;
  answers?: Record<string, any>;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'file';
  required: boolean;
  options?: string[]; // comma separated options for select
  isSystem?: boolean; // if true, admin cannot delete it
}

export interface Opportunity {
  id: string;
  title: string;
  excerpt?: string;
  description?: string; // Legacy plain text
  content?: string;      // TinyMCE HTML (making optional for backward compatibility temporarily)
  featuredImage?: string;
  seoTitle?: string;
  seoDescription?: string;
  location: string;
  region: string;
  duration: string;
  deadline: string;
  tags: string[];
  status: 'open' | 'closed' | 'draft';
  requirements?: string[];
  publishedAt?: any;
  createdBy?: string;
  createdAt: any;
  updatedAt?: any;
  formSchema?: FormField[];
}

/**
 * Submits a consultant application for a specific opportunity.
 */
export async function applyToOpportunity(
  db: Firestore, 
  opportunityId: string, 
  userData: { uid: string; firstName: string; lastName: string; email: string; country: string },
  applicationDetails?: { cvUrl?: string; answers?: Record<string, any> }
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
      appliedDate: serverTimestamp(),
      ...(applicationDetails?.cvUrl ? { cvUrl: applicationDetails.cvUrl } : {}),
      ...(applicationDetails?.answers ? { answers: applicationDetails.answers } : {})
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

/**
 * Updates an existing opportunity in Firestore.
 */
export async function updateOpportunity(
  db: Firestore,
  id: string,
  data: Partial<Omit<Opportunity, 'id' | 'createdAt'>>
): Promise<void> {
  const oppRef = doc(db, "opportunities", id);
  await updateDoc(oppRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}
