import { NextResponse } from "next/server"
import { createHash, createHmac, timingSafeEqual } from "crypto"
import { FieldValue } from "firebase-admin/firestore"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import { sendEmail, isResendConfigured } from "@/lib/email"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { hasSeenRecently, rememberRequest, REPLAY_WINDOW_MS } from "@/lib/replay-cache"

const MAX_BODY_SIZE = 1 * 1024 * 1024 // 1MB
const MAX_ENTRIES_PER_REQUEST = 500
const MAX_ACCOUNT_ENTRIES_PER_REQUEST = 10
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_PER_IP = 60
const RATE_LIMIT_GLOBAL = 300
const ACCOUNT_CREATION_LIMIT = 30
const ACCOUNT_CREATION_WINDOW_MS = 10 * 60_000
const TIMESTAMP_TOLERANCE_MS = 5 * 60_000
const MAX_SIGNATURE_LENGTH = 512

const MAX_STRING_LENGTH = 500
const MAX_BIO_LENGTH = 5000
const MAX_URL_LENGTH = 2000
const MAX_ARRAY_ITEMS = 50
const MAX_ARRAY_ITEM_LENGTH = 200
const MAX_EMAIL_LENGTH = 320

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
  "genderSelfDescribe",
  "dateOfBirth",
  "alternativeEmail",
  "highestDegree",
  "completionYear",
] as const

const URL_FIELDS = new Set(["cvUrl", "avatarUrl", "website"])

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
  alternative_email: "alternativeEmail",
  alt_email: "alternativeEmail",
  secondary_email: "alternativeEmail",
  personal_email: "alternativeEmail",
  date_of_birth: "dateOfBirth",
  dob: "dateOfBirth",
  birth_date: "dateOfBirth",
  birthdate: "dateOfBirth",
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
  profile_url: "website",
  professional_website: "website",
  skype: "skype",
  gender: "gender",
  gender_self_describe: "genderSelfDescribe",
  self_described_gender: "genderSelfDescribe",
  gender_detail: "genderSelfDescribe",
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

function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, "")
}

function sanitizeText(value: string, maxLength: number): string {
  const cleaned = stripControlCharacters(value).trim()
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned
}

function getFieldLimit(field: string): number {
  if (field === "bio") return MAX_BIO_LENGTH
  if (URL_FIELDS.has(field)) return MAX_URL_LENGTH
  return MAX_STRING_LENGTH
}

function sanitizeUrl(value: string): string | null {
  const cleaned = stripControlCharacters(value).trim()
  if (!cleaned) return null
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(cleaned) ? cleaned : `https://${cleaned}`
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return candidate.length > MAX_URL_LENGTH ? candidate.slice(0, MAX_URL_LENGTH) : candidate
  } catch {
    return null
  }
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

function isFreshTimestamp(timestamp: string | null): boolean {
  if (!timestamp) return true
  const parsed = Number(timestamp)
  if (!Number.isFinite(parsed)) return false
  const timestampMs = parsed > 1e12 ? parsed : parsed * 1000
  return Math.abs(Date.now() - timestampMs) <= TIMESTAMP_TOLERANCE_MS
}

function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
  timestamp: string | null
): boolean {
  if (!signature || signature.length > MAX_SIGNATURE_LENGTH) return false
  const signedPayload = timestamp ? `${timestamp}.${rawBody}` : rawBody
  const expected = `sha256=${createHmac("sha256", secret).update(signedPayload).digest("hex")}`
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function isAuthorized(request: Request, rawBody: string): boolean {
  const secret = getSecret()
  if (!secret) return false

  const timestamp = request.headers.get("x-curatio-timestamp")
  if (!isFreshTimestamp(timestamp)) return false

  const signature =
    request.headers.get("x-curatio-signature") || request.headers.get("x-webhook-signature")
  if (signature && verifySignature(rawBody, signature, secret, timestamp)) {
    return true
  }

  const authHeader = request.headers.get("authorization") || ""
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  if (bearer) {
    const a = Buffer.from(bearer)
    const b = Buffer.from(secret)
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return true
    }
  }

  return false
}

function buildFingerprint(rawBody: string, request: Request): string {
  const credential =
    request.headers.get("x-curatio-signature") ||
    request.headers.get("x-webhook-signature") ||
    (request.headers.get("authorization") || "").slice(0, MAX_SIGNATURE_LENGTH)
  return createHash("sha256").update(rawBody).update("\n").update(credential).digest("hex")
}

function normalizeConsultant(raw: unknown): NormalizedConsultant | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null
  const input = raw as Record<string, unknown>

  const rawEmail = typeof input.email === "string" ? sanitizeText(input.email, MAX_EMAIL_LENGTH) : ""
  const email = rawEmail.toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null
  }

  const consultant: Record<string, unknown> = { email }

  for (const field of STRING_FIELDS) {
    const value = input[field]
    if (typeof value !== "string") continue

    if (URL_FIELDS.has(field)) {
      const url = sanitizeUrl(value)
      if (url) consultant[field] = url
      continue
    }

    const cleaned = sanitizeText(value, getFieldLimit(field))
    if (cleaned !== "") consultant[field] = cleaned
  }

  for (const field of ARRAY_FIELDS) {
    const value = input[field]
    const items = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : typeof value === "string"
        ? value.split(",")
        : []

    const cleaned = items
      .map((item) => sanitizeText(item, MAX_ARRAY_ITEM_LENGTH))
      .filter(Boolean)
      .slice(0, MAX_ARRAY_ITEMS)

    if (cleaned.length > 0) {
      consultant[field] = cleaned
    }
  }

  if (input.years !== undefined && input.years !== null && input.years !== "") {
    const years = Number(input.years)
    if (Number.isFinite(years) && years >= 0 && years <= 120) {
      consultant.years = Math.floor(years)
    }
  }

  if (input.status !== undefined) {
    if ((STATUS_VALUES as readonly string[]).includes(String(input.status))) {
      consultant.status = input.status
    }
  }

  if (
    input.customAnswers !== null &&
    typeof input.customAnswers === "object" &&
    !Array.isArray(input.customAnswers)
  ) {
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

function jsonResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  headers.set("Cache-Control", "no-store")
  headers.set("X-Content-Type-Options", "nosniff")
  return NextResponse.json(body, { ...init, headers })
}

function rateLimitedResponse(retryAfterSeconds: number) {
  return jsonResponse(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  )
}

export async function GET() {
  return jsonResponse({
    ok: true,
    service: "curatio-consultants-webhook",
    configured: Boolean(getSecret()),
    hint: "POST JSON consultant records signed with HMAC-SHA256 using WEBHOOK_SECRET (header x-curatio-signature, value sha256=<hex>) or Authorization: Bearer <WEBHOOK_SECRET>. Optionally bind the signature to a unix timestamp via x-curatio-timestamp (sign '<timestamp>.<body>'); requests older than 5 minutes are rejected. Max 1MB, 500 records per request, 10 account creations per request. Add \"createAccount\": true to also create a Firebase Auth login and email a password setup link.",
  })
}

export async function POST(request: Request) {
  const ip = getClientIp(request.headers)
  const perIpLimit = checkRateLimit(`webhook:ip:${ip}`, RATE_LIMIT_PER_IP, RATE_LIMIT_WINDOW_MS)
  if (!perIpLimit.allowed) {
    return rateLimitedResponse(perIpLimit.retryAfterSeconds)
  }

  const globalLimit = checkRateLimit("webhook:global", RATE_LIMIT_GLOBAL, RATE_LIMIT_WINDOW_MS)
  if (!globalLimit.allowed) {
    return rateLimitedResponse(globalLimit.retryAfterSeconds)
  }

  const contentType = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase()
  if (contentType !== "application/json" && !contentType.endsWith("+json")) {
    return jsonResponse({ error: "Unsupported content type. Send application/json." }, { status: 415 })
  }

  const declaredLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_SIZE) {
    return jsonResponse({ error: "Payload too large. Maximum size is 1MB." }, { status: 413 })
  }

  const rawBody = await request.text()

  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_SIZE) {
    return jsonResponse({ error: "Payload too large. Maximum size is 1MB." }, { status: 413 })
  }

  if (!isAuthorized(request, rawBody)) {
    return jsonResponse({ error: "Unauthorized." }, { status: 401 })
  }

  const fingerprint = buildFingerprint(rawBody, request)
  if (hasSeenRecently(fingerprint, REPLAY_WINDOW_MS)) {
    return jsonResponse({
      ok: true,
      duplicate: true,
      received: 0,
      invalid: 0,
      created: 0,
      updated: 0,
      accounts: [],
      errors: [],
    })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, { status: 400 })
  }

  const { entries, invalid } = extractPayload(body)

  if (entries.length === 0) {
    return jsonResponse(
      {
        ok: false,
        error:
          "No valid consultants found. Provide a consultant object, an array, or { consultants: [...] } with a valid email per record.",
        invalid,
      },
      { status: 400 }
    )
  }

  if (entries.length > MAX_ENTRIES_PER_REQUEST) {
    return jsonResponse(
      { error: `Too many records. Maximum is ${MAX_ENTRIES_PER_REQUEST} per request.` },
      { status: 400 }
    )
  }

  const accountEntries = entries.filter((e) => e.createAccount)
  const plainEntries = entries.filter((e) => !e.createAccount)

  if (accountEntries.length > MAX_ACCOUNT_ENTRIES_PER_REQUEST) {
    return jsonResponse(
      { error: `Too many account creations. Maximum is ${MAX_ACCOUNT_ENTRIES_PER_REQUEST} per request.` },
      { status: 400 }
    )
  }

  if (accountEntries.length > 0) {
    const accountLimit = checkRateLimit(
      "webhook:account-creation",
      ACCOUNT_CREATION_LIMIT,
      ACCOUNT_CREATION_WINDOW_MS,
      accountEntries.length
    )
    if (!accountLimit.allowed) {
      return rateLimitedResponse(accountLimit.retryAfterSeconds)
    }
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

  rememberRequest(fingerprint, REPLAY_WINDOW_MS)

  return jsonResponse({
    ok: true,
    received: entries.length + invalid,
    invalid,
    created,
    updated,
    accounts,
    errors,
  })
}
