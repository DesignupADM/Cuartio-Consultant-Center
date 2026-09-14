import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminDb, isAdminUser } from "@/lib/firebase-admin"
import { isResendConfigured, sendBulkEmail, sendEmail } from "@/lib/email"
import { checkRateLimit } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || ""
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await isAdminUser(idToken)
    if (!admin) {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 })
    }

    const rateLimit = checkRateLimit(`email:${admin.uid}`, 20, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many email requests. Please wait before sending again." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      )
    }

    if (!isResendConfigured()) {
      return NextResponse.json(
        { error: "Email service is not configured. Set RESEND_API_KEY." },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body.subject !== "string" || typeof body.message !== "string") {
      return NextResponse.json({ error: "subject and message are required" }, { status: 400 })
    }

    const subject = body.subject.trim().slice(0, 200)
    const message = body.message.trim().slice(0, 5000)
    const recipient: string | undefined = body.recipient
    const recipientEmail: string | undefined = body.recipientEmail

    if (!recipient && !recipientEmail) {
      return NextResponse.json({ error: "recipient or recipientEmail is required" }, { status: 400 })
    }

    let emails: string[] = []
    let displayRecipient = recipient || recipientEmail || "Unknown"

    if (recipientEmail) {
      emails = [recipientEmail]
      displayRecipient = recipientEmail
    } else if (recipient === "ALL") {
      const snapshot = await adminDb.collection("consultantProfiles").select("email").get()
      const unique = new Set<string>()
      snapshot.docs.forEach((doc) => {
        const email = doc.data()?.email
        if (typeof email === "string" && email.includes("@")) {
          unique.add(email.toLowerCase().trim())
        }
      })
      emails = Array.from(unique)
      displayRecipient = "All Consultants"
    } else if (recipient) {
      const profileSnap = await adminDb.collection("consultantProfiles").doc(recipient).get()
      const profileEmail = profileSnap.data()?.email
      if (typeof profileEmail === "string" && profileEmail.includes("@")) {
        emails = [profileEmail]
        displayRecipient = recipient
      }
    }

    if (emails.length === 0) {
      return NextResponse.json({ error: "No recipient email addresses found." }, { status: 404 })
    }

    const { sent, failed } =
      emails.length === 1
        ? await sendEmail(emails[0], subject, message).then(() => ({ sent: 1, failed: [] }))
        : await sendBulkEmail(emails, subject, message)

    const status = failed.length === 0 ? "Sent" : sent === 0 ? "Failed" : "Partial"

    if (recipient && recipient !== "ALL") {
      await adminDb
        .collection("consultantNotifications")
        .doc(recipient)
        .collection("notifications")
        .add({
          subject,
          message,
          type: "manual",
          status,
          timestamp: FieldValue.serverTimestamp(),
        })
    }

    await adminDb.collection("systemLogs").add({
      recipient: displayRecipient,
      type: subject,
      status,
      sentCount: sent,
      failedCount: failed.length,
      timestamp: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      ok: true,
      sent,
      failed: failed.length,
      status,
    })
  } catch (err) {
    console.error("Email API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email" },
      { status: 500 }
    )
  }
}
