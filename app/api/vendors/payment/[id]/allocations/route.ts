import { type NextRequest, NextResponse } from "next/server"
import {
  createVendorPaymentAllocations,
  listVendorPaymentAllocations,
} from "@/services/vendorPaymentService"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const companyId = request.headers.get("x-company-id") || ""
    const result = await listVendorPaymentAllocations(id, companyId)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: err?.status || 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const companyId = request.headers.get("x-company-id") || ""
    const body = await request.json()
    const rows = Array.isArray(body) ? body : Array.isArray(body?.rows) ? body.rows : [body]
    const result = await createVendorPaymentAllocations(id, rows, companyId)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: err?.status || 500 })
  }
}
