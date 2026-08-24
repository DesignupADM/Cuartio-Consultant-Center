import { NextResponse } from "next/server"
import type { Query, DocumentData } from "firebase-admin/firestore"
import { adminDb, isAdminUser } from "@/lib/firebase-admin"

const CSV_COLUMNS = [
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Country",
  "City",
  "Profession",
  "Sector",
  "Years Experience",
  "Status",
  "Last Update",
  "CV URL",
]

function escapeCsv(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDate(value: unknown): string {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(String(value))
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

  const rows: string[] = [CSV_COLUMNS.join(",")]

  try {
    let exportQuery: Query<DocumentData> = adminDb.collection("consultantProfiles")

    const settingsSnap = await adminDb.collection("settings").doc("global").get()
    const dbLimit = settingsSnap.data()?.dbLimit
    if (typeof dbLimit === "number" && dbLimit > 0) {
      exportQuery = exportQuery.limit(dbLimit)
    }

    const snapshot = await exportQuery.get()

    snapshot.docs.forEach((doc) => {
      const c = doc.data() as Record<string, unknown>
      rows.push(
        [
          escapeCsv(c.firstName),
          escapeCsv(c.lastName),
          escapeCsv(c.email),
          escapeCsv(c.phone),
          escapeCsv(c.country),
          escapeCsv(c.city),
          escapeCsv(c.profession),
          escapeCsv(c.sector),
          escapeCsv(c.years),
          escapeCsv(c.status),
          escapeCsv(formatDate(c.updatedAt)),
          escapeCsv(c.cvUrl),
        ].join(",")
      )
    })
  } catch (err) {
    console.error("Export error:", err)
    return NextResponse.json(
      { error: "Failed to read consultant records." },
      { status: 500 }
    )
  }

  const filename = `curatio_consultants_${new Date().toISOString().split("T")[0]}.csv`

  return new NextResponse(rows.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
