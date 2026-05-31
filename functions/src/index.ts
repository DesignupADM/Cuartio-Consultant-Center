import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// 1. Dashboard Summaries Trigger
// Updates the precomputed _system/dashboard_stats document when core collections change.
export const onConsultantWritten = functions.firestore.document('consultantProfiles/{uid}').onWrite(async (change, context) => {
  await updateSummaries();
});

export const onOpportunityWritten = functions.firestore.document('opportunities/{oppId}').onWrite(async (change, context) => {
  await updateSummaries();
});

export const onApplicantWritten = functions.firestore.document('opportunities/{oppId}/applicants/{uid}').onWrite(async (change, context) => {
  await updateSummaries();
});

async function updateSummaries() {
  const now = new Date()
  const currentWindowStart = new Date(now)
  currentWindowStart.setDate(now.getDate() - 30)

  const previousWindowStart = new Date(currentWindowStart)
  previousWindowStart.setDate(currentWindowStart.getDate() - 30)

  const safeCount = async (q: any) => q.count().get().catch(() => ({ data: () => ({ count: 0 }) }))

  const [
    totalConsultantsSnap,
    pendingConsultantsSnap,
    openRolesSnap,
    totalApplicationsSnap,
    appliedSnap,
    shortlistedSnap,
    declinedSnap,
    recentConsultantsSnap,
    previousConsultantsSnap
  ] = await Promise.all([
    safeCount(db.collection("consultantProfiles")),
    safeCount(db.collection("consultantProfiles").where("status", "==", "pending")),
    safeCount(db.collection("opportunities").where("status", "==", "open")),
    safeCount(db.collectionGroup("applicants")),
    safeCount(db.collectionGroup("applicants").where("status", "==", "applied")),
    safeCount(db.collectionGroup("applicants").where("status", "==", "accepted")),
    safeCount(db.collectionGroup("applicants").where("status", "==", "declined")),
    safeCount(db.collection("consultantProfiles").where("createdAt", ">=", currentWindowStart)),
    safeCount(db.collection("consultantProfiles").where("createdAt", ">=", previousWindowStart).where("createdAt", "<", currentWindowStart))
  ])
  
  await db.doc('_system/dashboard_stats').set({
    totalConsultants: totalConsultantsSnap.data().count,
    pendingConsultants: pendingConsultantsSnap.data().count,
    openOpportunities: openRolesSnap.data().count,
    totalApplications: totalApplicationsSnap.data().count,
    applied: appliedSnap.data().count,
    shortlisted: shortlistedSnap.data().count,
    declined: declinedSnap.data().count,
    recentConsultants: recentConsultantsSnap.data().count,
    previousConsultants: previousConsultantsSnap.data().count,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

// 2. Export Worker
// Generates a complete CSV on the backend instead of the browser
export const exportConsultants = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User is not logged in.');
  }

  const querySnapshot = await db.collection('consultantProfiles').get();
  const profiles = querySnapshot.docs.map(doc => doc.data());
  
  const csvContent = ["Name,Last Name,Email,Country,Profession,Years Experience,Sector,Status"].join(",") + "\n"
    + profiles.map(c => `${c.firstName || ''},${c.lastName || ''},${c.email || ''},${c.country || ''},${c.profession || ''},${c.years || ''},${c.sector || ''},${c.status || ''}`).join("\n");
  
  return { csv: csvContent };
});
