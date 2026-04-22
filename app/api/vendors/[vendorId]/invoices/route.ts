import { getInvoicesByVendor } from "@/services/vendorPaymentService"
import { type NextRequest, NextResponse } from "next/server"


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params
    const companyId = request.headers.get("x-company-id") || ""
    const items = await getInvoicesByVendor(vendorId, companyId)
    return NextResponse.json({ items })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: err?.status || 500 })
  }
}
