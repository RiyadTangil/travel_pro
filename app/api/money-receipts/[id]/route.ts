import { type NextRequest, NextResponse } from "next/server"
import { updateMoneyReceipt, deleteMoneyReceipt } from "@/services/moneyReceiptService"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const companyId = request.headers.get('x-company-id') || undefined
    const result = await updateMoneyReceipt(params.id, body, companyId)
    return NextResponse.json(result)
  } catch (err: any) {
    const msg = err?.message || "Internal server error"
    const status = err?.statusCode || 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const companyId = request.headers.get('x-company-id') || undefined
    const result = await deleteMoneyReceipt(params.id, companyId)
    return NextResponse.json(result)
  } catch (err: any) {
    const msg = err?.message || "Internal server error"
    const status = err?.statusCode || 500
    return NextResponse.json({ error: msg }, { status })
  }
}
