import { NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { FieldValue } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"

const MAX_BODY_SIZE = 1 * 1024 * 1024 // 1MB

const STRING_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "country",
  "city",
  "state",
  "profession",
  "sector",
  "bio",
  "phone",
  "cvUrl",
  "avatarUrl",
  "language",
  "website",
  "skype",
  "gender",
  "highestDegree",
  "completionYear",
] as const

const ARRAY_FIELDS = [
  "sectors",
  "professions",
  "languages",
  "regions",
  "services",
  "requirements",
] as const

const STATUS_VALUES = ["pending", "verified", "rejected"] as const

type NormalizedConsultant = Record<string, unknown> & { email: string }

function getSecret(): string | null {
  return process.env.WEBHOOK_SECRET?.trim() || null
}

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function isAuthorized(request: Request, rawBody: string): { ok: boolean; error?: string } {
  const secret = getSecret()
  if (!secret) {
    return { ok: false, error: "Webhook is not configured. Set WEBHOOK_SECRET on the server." }
  }

  const signature =
    request.headers.get("x-curatio-signature") || request.headers.get("x-webhook-signature")

  if (signature && verifySignature(rawBody, signature, secret)) {
    return { ok: true }
  }

  const authHeader = request.headers.get("authorization") || ""
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  if (bearer) {
    const a = Buffer.from(bearer)
    const b = Buffer.from(secret)
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return { ok: true }
    }
  }

  return { ok: false, error: "Invalid webhook signature or token." }
}

function normalizeConsultant(raw: unknown): NormalizedConsultant | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null
  const input = raw as Record<string, unknown>

  const email = typeof input.email === "string" ? input.email.toLowerCase().trim() : ""
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null
  }

  const consultant: Record<string, unknown> = { email }

  for (const field of STRING_FIELDS) {
    const value = input[field]
    if (typeof value === "string" && value.trim() !== "") {
      consultant[field] = value.trim()
    }
  }

  for (const field of ARRAY_FIELDS) {
    const value = input[field]
    if (Array.isArray(value)) {
      consultant[field] = value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    } else if (typeof value === "string" && value.trim() !== "") {
      consultant[field] = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  if (input.years !== undefined && input.years !== null && input.years !== "") {
    const years = Number(input.years)
    if (Number.isFinite(years) && years >= 0) {
      consultant.years = years
    }
  }

  if (input.status !== undefined) {
    if ((STATUS_VALUES as readonly string[]).includes(String(input.status))) {
      consultant.status = input.status
    }
  }

  if (input.customAnswers !== null && typeof input.customAnswers === "object" && !Array.isArray(input.customAnswers)) {
    consultant.customAnswers = input.customAnswers
  }

  return consultant as NormalizedConsultant
}

function extractPayload(body: unknown): { consultants: NormalizedConsultant[]; invalid: number } {
  const invalid: number[] = []
  let raws: unknown[] = []

  if (Array.isArray(body)) {
    raws = body
  } else if (typeof body === "object" && body !== null) {
    const wrapped = (body as Record<string, unknown>).consultants
    if (Array.isArray(wrapped)) {
      raws = wrapped
    } else {
      raws = [body]
    }
  }

  const consultants: NormalizedConsultant[] = []
  raws.forEach((raw, index) => {
    const normalized = normalizeConsultant(raw)
    if (normalized) {
      consultants.push(normalized)
    } else {
      invalid.push(index)
    }
  })

  return { consultants, invalid: invalid.length }
}

export async function GET() {
  const secret = getSecret()
  return NextResponse.json({
    ok: true,
    service: "curatio-consultants-webhook",
    configured: Boolean(secret),
    hint: "POST consultant profiles to this endpoint. Sign requests with HMAC-SHA256 using WEBHOOK_SECRET or pass Authorization: Bearer <WEBHOOK_SECRET>.",
  })
}

export async function POST(request: Request) {
  const rawBody = await request.text()

  if (rawBody.length > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Payload too large. Maximum size is 1MB." }, { status: 413 })
  }

  const auth = isAuthorized(request, rawBody)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 })
  }

  const { consultants, invalid } = extractPayload(body)

  if (consultants.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No valid consultants found. Provide a consultant object, an array, or { consultants: [...] } with a valid email per record.",
        invalid,
      },
      { status: 400 }
    )
  }

  let created = 0
  let updated = 0
  const errors: { email: string; error: string }[] = []

  const chunks: NormalizedConsultant[][] = []
  for (let i = 0; i < consultants.length; i += 400) {
    chunks.push(consultants.slice(i, i + 400))
  }

  for (const chunk of chunks) {
    const batch = adminDb.batch()
    const chunkUpdates: { email: string; created: boolean }[] = []

    try {
      const existingSnapshots = await Promise.all(
        chunk.map((c) => adminDb.collection("consultantProfiles").doc(c.email).get())
      )

      chunk.forEach((consultant, index) => {
        const docRef = adminDb.collection("consultantProfiles").doc(consultant.email)
        const exists = existingSnapshots[index].exists

        if (exists) {
          batch.update(docRef, {
            ...consultant,
            status: consultant.status ?? existingSnapshots[index].data()?.status ?? "pending",
            source: "webhook",
            updatedAt: FieldValue.serverTimestamp(),
          })
          chunkUpdates.push({ email: consultant.email, created: false })
        } else {
          batch.set(docRef, {
            ...consultant,
            status: consultant.status ?? "pending",
            source: "webhook",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          })
          chunkUpdates.push({ email: consultant.email, created: true })
        }
      })

      await batch.commit()
      chunkUpdates.forEach(({ created: wasCreated }) => {
        if (wasCreated) created += 1
        else updated += 1
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Batch write failed"
      chunk.forEach(({ email }) => errors.push({ email, error: message }))
    }
  }

  try {
    await adminDb.collection("systemLogs").add({
      recipient: "Webhook",
      type: "Consultant directory webhook",
      status: errors.length > 0 ? "Partial" : "Sent",
      sentCount: created + updated,
      failedCount: errors.length,
      timestamp: FieldValue.serverTimestamp(),
    })
  } catch {
    // Logging is best-effort; do not fail the request because of it.
  }

  return NextResponse.json({
    ok: true,
    received: consultants.length + invalid,
    invalid,
    created,
    updated,
    errors,
  })
}
