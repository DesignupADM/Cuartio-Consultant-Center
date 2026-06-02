"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportConsultants = exports.onApplicantWritten = exports.onOpportunityWritten = exports.onConsultantWritten = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
// 1. Dashboard Summaries Trigger
// Updates the precomputed _system/dashboard_stats document when core collections change.
exports.onConsultantWritten = functions.firestore.document('consultantProfiles/{uid}').onWrite(async (change, context) => {
    await updateSummaries();
});
exports.onOpportunityWritten = functions.firestore.document('opportunities/{oppId}').onWrite(async (change, context) => {
    await updateSummaries();
});
exports.onApplicantWritten = functions.firestore.document('opportunities/{oppId}/applicants/{uid}').onWrite(async (change, context) => {
    await updateSummaries();
});
async function updateSummaries() {
    const now = new Date();
    const currentWindowStart = new Date(now);
    currentWindowStart.setDate(now.getDate() - 30);
    const previousWindowStart = new Date(currentWindowStart);
    previousWindowStart.setDate(currentWindowStart.getDate() - 30);
    const safeCount = async (q) => q.count().get().catch(() => ({ data: () => ({ count: 0 }) }));
    const [totalConsultantsSnap, pendingConsultantsSnap, openRolesSnap, totalApplicationsSnap, appliedSnap, shortlistedSnap, declinedSnap, recentConsultantsSnap, previousConsultantsSnap, consultantsSampleSnap, opportunitiesSampleSnap, applicantsSampleSnap] = await Promise.all([
        safeCount(db.collection("consultantProfiles")),
        safeCount(db.collection("consultantProfiles").where("status", "==", "pending")),
        safeCount(db.collection("opportunities").where("status", "==", "open")),
        safeCount(db.collectionGroup("applicants")),
        safeCount(db.collectionGroup("applicants").where("status", "==", "applied")),
        safeCount(db.collectionGroup("applicants").where("status", "==", "accepted")),
        safeCount(db.collectionGroup("applicants").where("status", "==", "declined")),
        safeCount(db.collection("consultantProfiles").where("createdAt", ">=", currentWindowStart)),
        safeCount(db.collection("consultantProfiles").where("createdAt", ">=", previousWindowStart).where("createdAt", "<", currentWindowStart)),
        db.collection("consultantProfiles").orderBy("createdAt", "desc").limit(100).get().catch(() => ({ docs: [] })),
        db.collection("opportunities").orderBy("createdAt", "desc").limit(100).get().catch(() => ({ docs: [] })),
        db.collectionGroup("applicants").limit(200).get().catch(() => ({ docs: [] }))
    ]);
    // Aggregate region and sector data for charts
    const regionCounts = {};
    const sectorCounts = {};
    const supplyCounts = {};
    consultantsSampleSnap.docs.forEach((doc) => {
        const data = doc.data();
        // Region
        const region = data.region || data.country || "Other";
        regionCounts[region] = (regionCounts[region] || 0) + 1;
        // Sector (admin-overview)
        const sector = data.sector || "General";
        sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
        // Supply (analytics)
        const skill = data.sector || data.profession || "General";
        supplyCounts[skill] = (supplyCounts[skill] || 0) + 1;
    });
    // 6-month trend (admin-overview)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trendCounts = {};
    const currentMonth = new Date().getMonth();
    for (let i = 5; i >= 0; i--) {
        const m = months[(currentMonth - i + 12) % 12];
        trendCounts[m] = 0;
    }
    consultantsSampleSnap.docs.forEach((doc) => {
        var _a;
        const data = doc.data();
        const date = ((_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date();
        if (Date.now() - date.getTime() > 1000 * 60 * 60 * 24 * 180)
            return; // ignore older than 6mo
        const monthName = months[date.getMonth()];
        if (trendCounts[monthName] !== undefined) {
            trendCounts[monthName]++;
        }
    });
    const monthlyTrend = Object.entries(trendCounts).map(([month, apps]) => ({ month, apps }));
    // Format arrays for Recharts
    const regionData = Object.entries(regionCounts)
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    const sectorData = Object.entries(sectorCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    const supplyData = Object.entries(supplyCounts)
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    const demandCounts = {};
    opportunitiesSampleSnap.docs.forEach((doc) => {
        const opp = doc.data();
        const tokens = [...(opp.tags || []), ...(opp.requirements || [])];
        tokens.forEach((token) => {
            const normalized = token.trim();
            if (!normalized)
                return;
            demandCounts[normalized] = (demandCounts[normalized] || 0) + 1;
        });
    });
    const skillSubjects = Array.from(new Set([...Object.keys(supplyCounts), ...Object.keys(demandCounts)]))
        .sort((a, b) => (demandCounts[b] || 0) + (supplyCounts[b] || 0) - ((demandCounts[a] || 0) + (supplyCounts[a] || 0)))
        .slice(0, 6);
    const skillsData = skillSubjects.map((subject) => ({
        subject,
        A: demandCounts[subject] || 0,
        B: supplyCounts[subject] || 0,
        fullMark: Math.max(demandCounts[subject] || 0, supplyCounts[subject] || 0, 1),
    }));
    const applicantsDocs = applicantsSampleSnap.docs || [];
    const applicantsByOpportunity = applicantsDocs.reduce((acc, doc) => {
        var _a;
        const applicant = doc.data();
        const opportunityId = (_a = doc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
        if (!opportunityId)
            return acc;
        acc[opportunityId] = acc[opportunityId] || [];
        acc[opportunityId].push(applicant);
        return acc;
    }, {});
    const mandateMetrics = opportunitiesSampleSnap.docs
        .map((doc) => {
        const opportunity = doc.data();
        opportunity.id = doc.id;
        const opportunityApplicants = applicantsByOpportunity[opportunity.id] || [];
        const applications = opportunityApplicants.length;
        const shortlisted = opportunityApplicants.filter((a) => a.status === "accepted").length;
        const shortlistRate = applications ? (shortlisted / applications) * 100 : 0;
        return {
            id: opportunity.id,
            title: opportunity.title || "Untitled",
            applications,
            shortlistRate,
            createdAt: opportunity.createdAt || new Date()
        };
    })
        .sort((a, b) => {
        var _a, _b, _c, _d, _e, _f;
        const dateA = ((_c = (_b = (_a = a.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.getTime()) || 0;
        const dateB = ((_f = (_e = (_d = b.createdAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.getTime()) || 0;
        return dateB - dateA;
    })
        .slice(0, 5);
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
        regionData,
        sectorData,
        supplyData,
        skillsData,
        mandateMetrics,
        monthlyTrend,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}
// 2. Export Worker
// Generates a complete CSV on the backend instead of the browser
exports.exportConsultants = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User is not logged in.');
    }
    const querySnapshot = await db.collection('consultantProfiles').get();
    const profiles = querySnapshot.docs.map(doc => doc.data());
    const csvContent = ["Name,Last Name,Email,Country,Profession,Years Experience,Sector,Status"].join(",") + "\n"
        + profiles.map(c => `${c.firstName || ''},${c.lastName || ''},${c.email || ''},${c.country || ''},${c.profession || ''},${c.years || ''},${c.sector || ''},${c.status || ''}`).join("\n");
    return { csv: csvContent };
});
//# sourceMappingURL=index.js.map