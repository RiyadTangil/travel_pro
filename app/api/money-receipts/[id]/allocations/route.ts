import { type NextRequest, NextResponse } from "next/server"
import { createReceiptAllocations, listReceiptAllocations } from "@/services/moneyReceiptService"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const companyId = request.headers.get('x-company-id') || undefined
    const rows = Array.isArray(body) ? body : (Array.isArray(body?.rows) ? body.rows : [body])
    const result = await createReceiptAllocations(params.id, rows, companyId)
    return NextResponse.json(result)
  } catch (err: any) {
    const msg = err?.message || "Internal server error"
    const status = err?.statusCode || 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const companyId = request.headers.get('x-company-id') || undefined
    const result = await listReceiptAllocations(params.id, companyId)
    return NextResponse.json(result)
  } catch (err: any) {
    const msg = err?.message || "Internal server error"
    const status = err?.statusCode || 500
    return NextResponse.json({ error: msg }, { status })
  }
}
