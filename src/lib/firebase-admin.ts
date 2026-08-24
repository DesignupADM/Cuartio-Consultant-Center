import { getApps, initializeApp, cert, type ServiceAccount } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

function getServiceAccount(): ServiceAccount | undefined {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) as ServiceAccount
    } catch {
      return undefined
    }
  }
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }
  }
  return undefined
}

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const serviceAccount = getServiceAccount()
  if (serviceAccount) {
    return initializeApp({ credential: cert(serviceAccount) })
  }

  return initializeApp()
}

export const adminApp = getAdminApp()
export const adminDb = getFirestore(adminApp)
export const adminAuth = getAuth(adminApp)

export async function isAdminUser(idToken: string): Promise<{ uid: string; email?: string } | null> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken)

    if (decoded.admin === true) {
      return { uid: decoded.uid, email: decoded.email }
    }

    const adminRoleDoc = await adminDb.collection("adminRoles").doc(decoded.uid).get()
    if (adminRoleDoc.exists) {
      return { uid: decoded.uid, email: decoded.email }
    }

    return null
  } catch {
    return null
  }
}
