import { type NextRequest, NextResponse } from "next/server"
import { deleteReceiptAllocation } from "@/services/moneyReceiptService"

export async function DELETE(request: NextRequest, { params }: { params: { id: string; allocId: string } }) {
  try {
    const companyId = request.headers.get('x-company-id') || undefined
    const result = await deleteReceiptAllocation(params.id, params.allocId, companyId)
    return NextResponse.json(result)
  } catch (err: any) {
    const msg = err?.message || "Internal server error"
    const status = err?.statusCode || 500
    return NextResponse.json({ error: msg }, { status })
  }
}
