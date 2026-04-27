import { MONGODB_DB_NAME } from "@/lib/database-config"
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { ObjectId } from "mongodb"

function normalizeType(type?: string | null): "other" | "visa" | "non_commission" {
  const t = String(type || "other").trim().toLowerCase()
  if (t === "standard") return "other"
  if (t === "visa") return "visa"
  if (t === "non_commission") return "non_commission"
  return "other"
}

function prefixForType(type: "other" | "visa" | "non_commission"): string {
  if (type === "non_commission") return "ANC"
  if (type === "visa") return "IV"
  return "IO"
}

function computeNextInvoiceNo(prev: string | null | undefined, type: "other" | "visa" | "non_commission"): string {
  const prefix = prefixForType(type)
  const s = String(prev || "").trim()
  const m = s.match(/(\d+)$/)
  const prevNum = m ? parseInt(m[1], 10) || 0 : 0
  const nextNum = prevNum + 1
  return `${prefix}-${String(nextNum).padStart(4, "0")}`
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const requestedType = searchParams.get("type")
    const type = normalizeType(requestedType)
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId
    if (!companyId) return NextResponse.json({ error: "Unauthorized: Company ID required" }, { status: 401 })

    const client = await clientPromise
    const db = client.db(MONGODB_DB_NAME)
    const col = db.collection("invoices")

    const filter: any =
      type === "other"
        ? { invoiceType: { $in: ["other", "standard"] } }
        : { invoiceType: type }
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
