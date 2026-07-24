# ConnectFlow Pro (Curatio Consultant Center)
## Web App Data Model & Backend Maturity Report

This document details the analysis of the current backend architecture, data model maturity, and security robustness of the ConnectFlow Pro platform. It highlights key security vulnerabilities identified in the system, lists adjustments needed to harden the data models, and outlines concrete steps taken to secure the application for production readiness.

---

## 1. Executive Summary

ConnectFlow Pro utilizes a serverless, reactive architecture powered by **Next.js 15 (React 19)**, **Cloud Firestore**, **Firebase Storage**, and **Firebase Genkit**.
While the architectural design is highly modern and optimizes frontend experience well, our analysis has revealed several severe backend maturity gaps and security risks:
1. **Administrative Self-Elevation Vulnerability**: Legacy rules allowed non-authenticated users or self-registering consultants to declare themselves as administrators simply by creating matching documents in Firestore under `adminRoles`.
2. **Lack of Attribute-Level Access Controls**: Consultants had complete write access to their own `consultantProfiles/{userId}` documents, which allowed them to bypass the admin approval process and mark themselves as `status: 'verified'` or write arbitrary `aiInsight` summaries directly.
3. **Application Lifecycle Exploits**: Applicants could directly submit status updates (e.g. set their status to `'accepted'`) when writing to the subcollection `opportunities/{opportunityId}/applicants/{userId}` during submission.
4. **Unsecured Storage Uploads**: Firebase Storage allowed any authenticated user to write files of arbitrary type (executable scripts, large zip files) and size to `/opportunities/{allPaths=**}`, and lacked mime-type/size limits on `/consultants/{userId}` path files (like CV PDFs).
5. **Insecure transactional writes**: Using `set` with `{ merge: true }` in transactions on dotted paths could overwrite whole maps instead of individual keys.

This report outlines the technical adjustments applied to mitigate these risks and secure ConnectFlow Pro.

---

## 2. Security Gaps & Concrete Fixes

### A. Admin Role Creation & Self-Elevation
*   **Vulnerability**: The firestore rule for `/adminRoles/{userId}` allowed a user to self-create an admin role doc:
    ```javascript
    allow create: if isAdmin() || (
      isOwner(userId) &&
      exists(/databases/$(database)/documents/adminRoles/$( 'email:' + request.resource.data.email ))
    );
    ```
    This email-based lookup is extremely insecure. If an admin record mapping does not exist, or if email fields can be manipulated, it leaves administrative authorization logic vulnerable.
*   **Fix**: Lock down `/adminRoles/{userId}` so that ONLY existing administrators can create, update, or list admin roles. Individual owners can only read (`get`) their own admin roles if they already exist, preventing arbitrary admin account creation.
    ```javascript
    match /adminRoles/{userId} {
      allow get: if isOwner(userId) || isAdmin();
      allow list: if isAdmin();
      allow create: if isAdmin();
      allow update, delete: if isAdmin();
    }
    ```

### B. Consultant Profile & Attribute-Level Write Locks
*   **Vulnerability**: The old rules allowed a consultant to write to their profile:
    ```javascript
    allow update: if (isOwner(consultantId) || isAdmin()) && request.resource.data.id == resource.data.id;
    ```
    Since `isOwner` had no restrictions on the properties being sent, a malicious consultant could easily issue a direct SDK update payload setting `"status": "verified"` or modifying `"aiInsight"`.
*   **Fix**: Separate consultant-controlled updates from administrative-only updates. When a consultant updates their profile, we enforce that:
    1. The fields `status` and `aiInsight` are not altered (i.e. they must either remain unchanged, or not be present in the new write if they didn't exist before, or they must match the previous state).
    2. Crucial administrative metadata like `role` or custom access flags remain immutable to the owner.
    ```javascript
    match /consultantProfiles/{consultantId} {
      allow get: if isOwner(consultantId) || isAdmin();
      allow list: if isAdmin();
      allow create: if (isOwner(consultantId) || isAdmin()) && request.resource.data.id == consultantId;
      allow update: if isAdmin() || (
        isOwner(consultantId) &&
        request.resource.data.id == resource.data.id &&
        (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['status', 'aiInsight', 'role']))
      );
      allow delete: if isAdmin();
    }
    ```

### C. Application Submission & Status Safeguards
*   **Vulnerability**: The applicant rules allowed consultants to write any status inside their subcollection `/opportunities/{opportunityId}/applicants/{userId}`:
    ```javascript
    allow create: if isOwner(userId);
    ```
    An applicant could set `"status": "accepted"` during submission, automatically bypassing the review funnel.
*   **Fix**: Enforce that a newly submitted applicant must always default to `"applied"` or remain untouched if updating.
    ```javascript
    match /opportunities/{opportunityId}/applicants/{userId} {
      allow get: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId) && request.resource.data.status == 'applied';
      allow update: if isAdmin();
      allow delete: if isAdmin();
      allow list: if isAdmin();
    }
    ```

### D. Firebase Storage Hardening
*   **Vulnerability 1**: The path `/opportunities/{allPaths=**}` had public-read and authenticated-write rules.
    ```javascript
    match /opportunities/{allPaths=**} {
      allow read: if true;
      allow write: if isSignedIn();
    }
    ```
    Any logged-in user (including basic consultants) could overwrite, delete, or upload spam files into administrative opportunity folders.
*   **Vulnerability 2**: The path `/consultants/{userId}/{allPaths=**}` lacked mime-type check or size limits. Consultants could upload 1GB files or malicious scripts disguised as PDFs.
*   **Fixes**:
    1. Restrict `/opportunities/{allPaths=**}` write access strictly to administrative roles.
    2. Limit uploads under `/consultants/{userId}/{allPaths=**}` to `5MB` in size and validate that only valid image content-types (`image/*`) or PDF documents (`application/pdf`) can be uploaded.
    ```javascript
    match /opportunities/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && firestore.exists(/databases/(default)/documents/adminRoles/$(request.auth.uid));
    }

    match /consultants/{userId}/{allPaths=**} {
      allow read: if isOwner(userId) || (request.auth != null && firestore.exists(/databases/(default)/documents/adminRoles/$(request.auth.uid)));
      allow write: if isOwner(userId) &&
                    request.resource.size < 5 * 1024 * 1024 &&
                    (request.resource.contentType.matches('application/pdf') || request.resource.contentType.startsWith('image/'));
    }
    ```

---

## 3. Data Consistency & Transaction Security

In `src/firebase/firestore/opportunities.ts`, the `applyToOpportunity` method was merging custom fields back into the user profile document:
```typescript
const profileUpdates: any = {};
if (applicationDetails?.cvUrl) {
  profileUpdates.cvUrl = applicationDetails.cvUrl;
}
if (applicationDetails?.answers && Object.keys(applicationDetails.answers).length > 0) {
  for (const [key, val] of Object.entries(applicationDetails.answers)) {
    profileUpdates[`customAnswers.${key}`] = val;
  }
}

if (Object.keys(profileUpdates).length > 0) {
  transaction.set(profileRef, profileUpdates, { merge: true });
}
```
*   **Maturity Risk**: In Firestore, running `transaction.set` with `{ merge: true }` using dot-notation keys (like `"customAnswers.fieldId"`) does **not** update nested maps safely! It can create flat fields named `"customAnswers.fieldId"` on the root of the document instead of nesting them inside the map object.
*   **Fix**: Update the logic to perform a targeted `transaction.update` using proper flat dot-notation keys or safely retrieve, merge, and write the nested data, maintaining schema alignment with `docs/backend.json`.

---

## 4. Production-Readiness Recommendations

To elevate this platform's backend maturity even further, the following secondary improvements should be scheduled:
1. **Move Admin Creation to Cloud Functions**: Fully deprecate direct write access to `adminRoles`. Implement a secure HTTPS Callable function (e.g., `inviteAdmin`) that validates credentials and mints custom claims (`admin: true`) securely on the Firebase Auth user object, avoiding race-conditions.
2. **Audit Logging & SIEM**: Stream activity logs into `systemLogs/{logId}` securely. Prevent any user or administrator from updating or deleting these log files (`allow create: if isAdmin(); allow update, delete: if false`).
3. **Database Index Optimizations**: Add composite Firestore indexes for advanced filter combinations in the consultant directory (`country` ASC + `years` DESC, etc.) to guarantee high scalability.
