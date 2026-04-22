import { type NextRequest, NextResponse } from "next/server"
import { deleteVendorPaymentAllocation } from "@/services/vendorPaymentService"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; allocId: string }> }
) {
  try {
    const { id, allocId } = await params
    const companyId = request.headers.get("x-company-id") || ""
    const result = await deleteVendorPaymentAllocation(id, allocId, companyId)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: err?.status || 500 })
  }
}
