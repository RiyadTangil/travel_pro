import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

function computeNextInvoiceNo(prev?: string | null): string {
  const DEFAULT = "INV-0001"
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || null

    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection("invoices")

    const filter: any = {}
    if (companyId) filter.companyId = companyId

    // Find the most recent invoice with a non-empty invoiceNo
    const last = await col
      .find(filter, { projection: { invoiceNo: 1 }, sort: { createdAt: -1 } })
      .limit(1)
      .toArray()

    const lastNo = last?.[0]?.invoiceNo || null
    const nextInvoiceNo = computeNextInvoiceNo(lastNo)

    return NextResponse.json({ nextInvoiceNo, lastInvoiceNo: lastNo, companyId })
  } catch (error) {
    console.error("Next invoice no GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

