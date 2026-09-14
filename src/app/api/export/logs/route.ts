import { NextResponse } from "next/server"
import { adminDb, isAdminUser } from "@/lib/firebase-admin"
import { checkRateLimit } from "@/lib/rate-limit"

function escapeCsv(value: unknown): string {
  let str = value === null || value === undefined ? "" : String(value)
  // Neutralize spreadsheet formula injection (values starting with = + - @).
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDate(value: unknown): string {
  if (!value) return ""
  let date: Date
  if (value instanceof Date) {
    date = value
  } else if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    date = (value as { toDate(): Date }).toDate()
  } else {
    date = new Date(String(value))
  }
  if (isNaN(date.getTime())) return ""
  return date.toISOString()
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || ""
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = await isAdminUser(idToken)
  if (!admin) {
    return NextResponse.json({ error: "Administrator access required" }, { status: 403 })
  }

  const rateLimit = checkRateLimit(`export-logs:${admin.uid}`, 15, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many export requests. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    )
  }

  const rows = ["Timestamp,Recipient,Type,Status,Sent,Failed"]

  try {
    const snapshot = await adminDb
      .collection("systemLogs")
      .orderBy("timestamp", "desc")
      .limit(1000)
      .get()

    snapshot.docs.forEach((doc) => {
      const log = doc.data() as Record<string, unknown>
      rows.push(
        [
          escapeCsv(formatDate(log.timestamp)),
          escapeCsv(log.recipient),
          escapeCsv(log.type),
          escapeCsv(log.status),
          escapeCsv(log.sentCount ?? ""),
          escapeCsv(log.failedCount ?? ""),
        ].join(",")
      )
    })
  } catch (err) {
    console.error("Log export error:", err)
    return NextResponse.json(
      { error: "Failed to read audit logs." },
      { status: 500 }
    )
  }

  const filename = `curatio_audit_logs_${new Date().toISOString().split("T")[0]}.csv`

  return new NextResponse(rows.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
