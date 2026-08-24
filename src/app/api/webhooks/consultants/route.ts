import { NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { FieldValue } from "firebase-admin/firestore"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import { sendEmail, isResendConfigured } from "@/lib/email"

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

// Elementor forms send { form_fields: { <fieldId>: value } }.
// Field IDs are matched against normalized aliases; an explicit
// { map: { <fieldId>: <consultantField> } } object can override.
const ELEMENTOR_FIELD_MAP: Record<string, string> = {
  email: "email",
  email_address: "email",
  e_mail: "email",
  your_email: "email",
  mail: "email",
  first_name: "firstName",
  firstname: "firstName",
  fname: "firstName",
  first: "firstName",
  last_name: "lastName",
  lastname: "lastName",
  lname: "lastName",
  last: "lastName",
  country: "country",
  city: "city",
  state: "state",
  province: "state",
  region: "state",
  profession: "profession",
  occupation: "profession",
  job_title: "profession",
  discipline: "profession",
  sector: "sector",
  industry: "sector",
  area: "sector",
  years: "years",
  years_experience: "years",
  experience: "years",
  bio: "bio",
  message: "bio",
  about: "bio",
  summary: "bio",
  comments: "bio",
  phone: "phone",
  telephone: "phone",
  mobile: "phone",
  cv_url: "cvUrl",
  cvurl: "cvUrl",
  resume_url: "cvUrl",
  resume: "cvUrl",
  cv: "cvUrl",
  avatar_url: "avatarUrl",
  avatarurl: "avatarUrl",
  photo_url: "avatarUrl",
  language: "language",
  primary_language: "language",
  website: "website",
  linkedin: "website",
  skype: "skype",
  gender: "gender",
  highest_degree: "highestDegree",
  degree: "highestDegree",
  education: "highestDegree",
  completion_year: "completionYear",
  graduation_year: "completionYear",
  sectors: "sectors",
  professions: "professions",
  languages: "languages",
  regions: "regions",
  services: "services",
  requirements: "requirements",
}

const TRUTHY_VALUES = ["true", "1", "yes", "on"]

function normalizeKey(key: string): string {
  return key.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
}

function buildConsultantFromElementor(
  fields: Record<string, unknown>,
  explicitMap?: Record<string, string>
): Record<string, unknown> | null {
  const result: Record<string, unknown> = {}
  const consumed = new Set<string>()

  if (explicitMap && typeof explicitMap === "object") {
    for (const [src, dest] of Object.entries(explicitMap)) {
      if (typeof dest === "string" && src in fields) {
        result[dest] = fields[src]
        consumed.add(src)
      }
    }
  }

  for (const [srcKey, value] of Object.entries(fields)) {
    if (consumed.has(srcKey)) continue
    const matched = ELEMENTOR_FIELD_MAP[normalizeKey(srcKey)]
    if (matched && value !== null && value !== undefined && value !== "") {
      result[matched] = value
    }
  }

  const createAccountRaw = fields["create_account"] ?? fields["createAccount"]
  const createAccount =
    typeof createAccountRaw === "string"
      ? TRUTHY_VALUES.includes(createAccountRaw.toLowerCase().trim())
      : createAccountRaw === true
  if (createAccount) {
    result.createAccount = true
  }

  return result
}

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

function extractPayload(body: unknown): {
  entries: { consultant: NormalizedConsultant; createAccount: boolean }[]
  invalid: number
} {
  const invalid: number[] = []
  let raws: unknown[] = []

  if (Array.isArray(body)) {
    raws = body
  } else if (typeof body === "object" && body !== null) {
    const obj = body as Record<string, unknown>
    const formFields = obj.form_fields
    if (formFields !== null && typeof formFields === "object" && !Array.isArray(formFields)) {
      const explicitMap =
        obj.map !== null && typeof obj.map === "object" && !Array.isArray(obj.map)
          ? (obj.map as Record<string, string>)
          : undefined
      const elementorRecord = buildConsultantFromElementor(formFields as Record<string, unknown>, explicitMap)
      raws = elementorRecord ? [elementorRecord] : []
    } else {
      const wrapped = obj.consultants
      if (Array.isArray(wrapped)) {
        raws = wrapped
      } else {
        raws = [body]
      }
    }
  }

  const entries: { consultant: NormalizedConsultant; createAccount: boolean }[] = []
  raws.forEach((raw, index) => {
    const normalized = normalizeConsultant(raw)
    if (normalized) {
      const createAccount =
        typeof raw === "object" && raw !== null && (raw as Record<string, unknown>).createAccount === true
      entries.push({ consultant: normalized, createAccount })
    } else {
      invalid.push(index)
    }
  })

  return { entries, invalid: invalid.length }
}

export async function GET() {
  const secret = getSecret()
  return NextResponse.json({
    ok: true,
    service: "curatio-consultants-webhook",
    configured: Boolean(secret),
    hint: "POST consultant profiles to this endpoint. Sign requests with HMAC-SHA256 using WEBHOOK_SECRET or pass Authorization: Bearer <WEBHOOK_SECRET>. Add \"createAccount\": true to a record to also create a Firebase Auth login and email a password setup link.",
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

  const { entries, invalid } = extractPayload(body)

  if (entries.length === 0) {
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
  const accounts: {
    email: string
    uid: string
    created: boolean
    passwordResetLink?: string
  }[] = []

  const continueUrl = `${new URL(request.url).origin}/login`
  const accountEntries = entries.filter((e) => e.createAccount)
  const plainEntries = entries.filter((e) => !e.createAccount)

  // --- Account-backed registration (createAccount: true) ---
  for (const { consultant } of accountEntries) {
    try {
      let uid: string
      let accountCreated = false

      try {
        const existing = await adminAuth.getUserByEmail(consultant.email)
        uid = existing.uid
      } catch {
        const newUser = await adminAuth.createUser({
          email: consultant.email,
          emailVerified: false,
        })
        uid = newUser.uid
        accountCreated = true
      }

      const roleRef = adminDb.collection("consultantRoles").doc(uid)
      const profileRef = adminDb.collection("consultantProfiles").doc(uid)
      const profileSnap = await profileRef.get()

      const roleExists = (await roleRef.get()).exists
      if (!roleExists) {
        await roleRef.set({ enabled: true })
      }

      if (profileSnap.exists) {
        await profileRef.update({
          ...consultant,
          id: uid,
          status: consultant.status ?? profileSnap.data()?.status ?? "pending",
          source: "webhook",
          updatedAt: FieldValue.serverTimestamp(),
        })
        updated += 1
      } else {
        await profileRef.set({
          ...consultant,
          id: uid,
          status: consultant.status ?? "pending",
          source: "webhook",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        created += 1
      }

      let passwordResetLink: string | undefined
      let linkDelivered = false

      if (isResendConfigured()) {
        try {
          passwordResetLink = await adminAuth.generatePasswordResetLink(consultant.email, {
            url: continueUrl,
          })
          const firstName = typeof consultant.firstName === "string" ? consultant.firstName : "there"
          await sendEmail(
            consultant.email,
            "Welcome to the Curatio Consultant Center — set up your account",
            `Dear ${firstName},\n\nAn account has been created for you on the Curatio Consultant Center.\n\nSet up your password to access your dashboard:\n${passwordResetLink}\n\nThis link expires in 24 hours.\n\nCuratio International Foundation`
          )
          linkDelivered = true
        } catch (emailErr) {
          console.error("Welcome email failed:", emailErr)
        }
      }

      accounts.push({
        email: consultant.email,
        uid,
        created: accountCreated,
        ...(linkDelivered ? {} : { passwordResetLink }),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Account creation failed"
      errors.push({ email: consultant.email, error: message })
    }
  }

  // --- Directory-only records (createAccount omitted) ---
  const chunks: NormalizedConsultant[][] = []
  for (let i = 0; i < plainEntries.length; i += 400) {
    chunks.push(plainEntries.slice(i, i + 400).map((e) => e.consultant))
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
    received: entries.length + invalid,
    invalid,
    created,
    updated,
    accounts,
    errors,
  })
}
