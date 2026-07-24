const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const CONSULTANTS_JSON = path.join(__dirname, "consultants.json");
const CREDENTIALS_OUTPUT = path.join(__dirname, "imported-credentials.csv");
const VERIFICATION_OUTPUT = path.join(__dirname, "import-verification.json");
const SERVICE_ACCOUNT_PATH = process.argv[2];
const UPDATE_EXISTING = process.argv.includes("--update-existing");

if (!SERVICE_ACCOUNT_PATH) {
  console.error("Usage: node import-consultants.js <path-to-service-account.json> [--update-existing]");
  console.error("  --update-existing  Also update Firestore profiles for users that already exist in Auth");
  process.exit(1);
}

if (UPDATE_EXISTING) {
  console.log("Mode: UPDATE EXISTING — existing Auth users will have their Firestore profiles updated\n");
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const auth = getAuth();
const db = getFirestore();

const consultants = JSON.parse(fs.readFileSync(CONSULTANTS_JSON, "utf8"));
console.log(`Loaded ${consultants.length} consultants with emails\n`);

function extractId(profileUrl) {
  const match = profileUrl.match(/\/consultant\/(\d+)$/);
  return match ? match[1] : null;
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

function mapProfile(consultant, uid) {
  return {
    id: uid,
    firstName: consultant.first_name || "",
    lastName: consultant.last_name || "",
    displayName: consultant.name || `${consultant.first_name || ""} ${consultant.last_name || ""}`.trim(),
    email: consultant.alter_email.trim().toLowerCase(),
    country: consultant.base_country || consultant.base_country_user || "",
    state: consultant.state || "",
    city: consultant.city || "",
    phone: consultant.phone || "",
    profession: Array.isArray(consultant.professions) ? consultant.professions.join(", ") : "",
    professions: consultant.professions || [],
    sector: Array.isArray(consultant.sectors) ? consultant.sectors.join(", ") : "",
    sectors: consultant.sectors || [],
    services: consultant.services || [],
    regions: consultant.regions || [],
    gender: consultant.gender || "",
    highestDegree: consultant.highest_degree || "",
    completionYear: consultant.completion_year || "",
    nativeLanguage: consultant.native_language || "",
    otherLanguages: consultant.other_languages || [],
    website: consultant.website || "",
    skype: consultant.skype || "",
    status: consultant.status || "Registered",
    step: consultant.step || "0",
    registrationDate: consultant.date || "",
    role: "consultant",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function importConsultants() {
  const results = [];
  const errors = [];
  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < consultants.length; i++) {
    const c = consultants[i];
    const email = c.alter_email.trim().toLowerCase();
    const password = generatePassword();

    process.stdout.write(`[${i + 1}/${consultants.length}] ${c.name} <${email}>... `);

    try {
      let uid;
      try {
        const existingUser = await auth.getUserByEmail(email);
        uid = existingUser.uid;

        if (UPDATE_EXISTING) {
          const profileData = mapProfile(c, uid);
          const profileRef = db.collection("consultantProfiles").doc(uid);
          const existingSnap = await profileRef.get();

          if (existingSnap.exists) {
            const existingData = existingSnap.data();
            if (existingData.createdAt) profileData.createdAt = existingData.createdAt;
            if (existingData.cvUrl) profileData.cvUrl = existingData.cvUrl;
            if (existingData.avatarUrl) profileData.avatarUrl = existingData.avatarUrl;
            if (existingData.bio) profileData.bio = existingData.bio;
            if (existingData.years !== undefined && existingData.years !== null) profileData.years = existingData.years;
            if (existingData.aiInsight) profileData.aiInsight = existingData.aiInsight;
            if (existingData.customAnswers) profileData.customAnswers = existingData.customAnswers;
            if (existingData.language) profileData.language = existingData.language;
          }

          await profileRef.set(profileData, { merge: true });

          process.stdout.write(`UPDATED (${uid})\n`);
          results.push({ name: c.name, email, password, uid, status: "updated" });
          skipCount++;
        } else {
          process.stdout.write(`SKIP (exists)\n`);
          results.push({ name: c.name, email, password, uid, status: "skipped" });
          skipCount++;
        }
        continue;
      } catch (e) {
        if (e.code !== "auth/user-not-found") throw e;
      }

      const userRecord = await auth.createUser({
        email,
        password,
        displayName: c.name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || undefined,
        disabled: false,
      });
      uid = userRecord.uid;

      await auth.setCustomUserClaims(uid, { role: "consultant", admin: false });

      const batch = db.batch();
      const roleRef = db.collection("consultantRoles").doc(uid);
      batch.set(roleRef, { enabled: true, importDate: new Date().toISOString() });

      const profileData = mapProfile(c, uid);
      const profileRef = db.collection("consultantProfiles").doc(uid);
      batch.set(profileRef, profileData);

      await batch.commit();

      process.stdout.write(`OK (${uid})\n`);
      results.push({ name: c.name, email, password, uid, status: "created" });
      successCount++;

      if (i % 10 === 9) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      process.stdout.write(`ERROR: ${err.message}\n`);
      errors.push({ name: c.name, email, error: err.message });
    }
  }

  const csvHeader = "name,email,password,uid,status\n";
  const csvRows = results.map(r =>
    `"${r.name || ""}","${r.email}","${r.password}","${r.uid}","${r.status}"`
  ).join("\n");
  fs.writeFileSync(CREDENTIALS_OUTPUT, csvHeader + csvRows, "utf8");

  const updatedCount = results.filter(r => r.status === "updated").length;

  console.log("\n========== IMPORT SUMMARY ==========");
  console.log(`Total: ${consultants.length}`);
  console.log(`Created: ${successCount}`);
  console.log(`Updated (--update-existing): ${updatedCount}`);
  console.log(`Skipped (already exist): ${skipCount - updatedCount}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Credentials saved to: ${CREDENTIALS_OUTPUT}`);

  if (errors.length > 0) {
    console.log("\n--- Errors ---");
    errors.forEach(e => console.log(`  ${e.name || "?"}: ${e.error}`));
  }

  console.log("\n========== VERIFICATION ==========");
  await verifyImport(results);
}

async function verifyImport(results) {
  const toVerify = results.filter(r => r.status === "created" || r.status === "updated");
  if (toVerify.length === 0) {
    console.log("No records to verify.");
    return;
  }

  const verifications = [];

  for (const r of toVerify) {
    const v = { name: r.name, uid: r.uid, email: r.email, status: r.status, auth: false, roleDoc: false, profileDoc: false, profileData: null };

    try {
      const user = await auth.getUser(r.uid);
      v.auth = user.email === r.email;
    } catch { v.auth = false; }

    try {
      const roleSnap = await db.collection("consultantRoles").doc(r.uid).get();
      v.roleDoc = roleSnap.exists && roleSnap.data().enabled === true;
    } catch { v.roleDoc = false; }

    try {
      const profileSnap = await db.collection("consultantProfiles").doc(r.uid).get();
      v.profileDoc = profileSnap.exists;
      if (profileSnap.exists) {
        const data = profileSnap.data();
        v.profileData = {
          idMatch: data.id === r.uid,
          emailMatch: data.email === r.email,
          firstName: data.firstName,
          lastName: data.lastName,
          country: data.country,
          state: data.state,
          city: data.city,
          phone: data.phone,
          gender: data.gender,
          highestDegree: data.highestDegree,
          completionYear: data.completionYear,
          nativeLanguage: data.nativeLanguage,
          website: data.website,
          skype: data.skype,
          status: data.status,
          step: data.step,
          registrationDate: data.registrationDate,
          role: data.role,
        };
      }
    } catch { v.profileDoc = false; }

    verifications.push(v);
  }

  fs.writeFileSync(VERIFICATION_OUTPUT, JSON.stringify(verifications, null, 2), "utf8");

  const allFieldsOk = verifications.filter(v =>
    v.auth && v.roleDoc && v.profileDoc && v.profileData?.idMatch && v.profileData?.country
  );
  const failed = verifications.filter(v =>
    !(v.auth && v.roleDoc && v.profileDoc && v.profileData?.idMatch)
  );
  const partial = verifications.filter(v =>
    v.auth && v.roleDoc && v.profileDoc && v.profileData?.idMatch && !v.profileData?.country
  );

  console.log(`Verified: ${verifications.length} records`);
  console.log(`Full data (all fields present): ${allFieldsOk.length}`);
  console.log(`Partial data (missing some fields): ${partial.length}`);
  console.log(`Issues (missing documents): ${failed.length}`);
  console.log(`Detailed report saved to: ${VERIFICATION_OUTPUT}`);

  if (partial.length > 0) {
    console.log(`\n--- ${partial.length} records have partial data (country/gender/etc. missing) ---`);
    partial.slice(0, 5).forEach(v => {
      console.log(`  ${v.name} (${v.uid}): missing fields`);
    });
    if (partial.length > 5) {
      console.log(`  ... and ${partial.length - 5} more`);
    }
  }

  if (failed.length > 0) {
    console.log("\n--- Records with Missing Documents ---");
    failed.forEach(v => {
      const issues = [];
      if (!v.auth) issues.push("auth missing/wrong");
      if (!v.roleDoc) issues.push("consultantRoles missing");
      if (!v.profileDoc) issues.push("consultantProfiles missing");
      if (v.profileData && !v.profileData.idMatch) issues.push("id mismatch");
      if (v.profileData && !v.profileData.emailMatch) issues.push("email mismatch");
      console.log(`  ${v.name} (${v.uid}): ${issues.join(", ")}`);
    });
  }
}

importConsultants().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});