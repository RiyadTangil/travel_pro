import { MONGODB_DB_NAME } from "@/lib/database-config"
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { ObjectId } from "mongodb"

function computeNextInvoiceNo(prev?: string | null, type: string = "standard"): string {
  const DEFAULT = type === "non_commission" ? "ANC-0001" : (type === "visa" ? "IV-0001" : "INV-0001")
  if (!prev || !prev.trim()) return DEFAULT
  const s = prev.trim()
  // Capture prefix and numeric tail, allow optional hyphen/space
  const m = s.match(/^(.+?)([-\s]?)(\d+)$/)
  if (!m) return DEFAULT
  const prefix = m[1]
  const sep = m[2] || (s.includes("-") ? "-" : "")
  const numStr = m[3]
  const nextNum = (parseInt(numStr, 10) || 0) + 1
  const padded = numStr.length > 1 ? String(nextNum).padStart(numStr.length, "0") : String(nextNum)
  return `${prefix}${sep}${padded}`
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "standard"
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId
    if (!companyId) return NextResponse.json({ error: "Unauthorized: Company ID required" }, { status: 401 })

    const client = await clientPromise
    const db = client.db(MONGODB_DB_NAME)
    const col = db.collection("invoices")

    const filter: any = { invoiceType: type }
    if (companyId) {
      // Support both ObjectId and string-typed companyId in stored documents
      filter.$or = [
        ...(ObjectId.isValid(String(companyId)) ? [{ companyId: new ObjectId(String(companyId)) }] : []),
        { companyId: String(companyId) },
      ]
    }
    // Consider only invoices with a non-empty invoiceNo
    filter.invoiceNo = { $exists: true, $ne: "" }

    // Find the most recent invoice with a non-empty invoiceNo
    const last = await col
      .find(filter, { projection: { invoiceNo: 1 } })
      .sort({ createdAt: -1, _id: -1 })
      .limit(1)
      .toArray()

    const lastNo = last?.[0]?.invoiceNo || null
    const nextInvoiceNo = computeNextInvoiceNo(lastNo, type)

    return NextResponse.json({ nextInvoiceNo, lastInvoiceNo: lastNo, companyId, type })
  } catch (error) {
    console.error("Next invoice no GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
