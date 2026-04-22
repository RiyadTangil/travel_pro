import { type NextRequest, NextResponse } from "next/server"
import { getInvoicesByVendor } from "@/services/vendorPaymentService"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const companyId = request.headers.get("x-company-id") || ""
    const items = await getInvoicesByVendor(id, companyId)
    return NextResponse.json({ items })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: err?.status || 500 })
  }
}
