import { NextRequest, NextResponse } from "next/server"
import { updateVendorPayment, deleteVendorPayment } from "@/services/vendorPaymentService"

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const companyId = req.headers.get("x-company-id") || undefined
    const { id } = await params
    const result = await updateVendorPayment(id, body, companyId)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Update Vendor Payment Error:", error)
    return NextResponse.json({ error: error.message || "Failed to update payment" }, { status: error.statusCode || 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const companyId = req.headers.get("x-company-id") || undefined
    const { id } = await params
    const result = await deleteVendorPayment(id, companyId)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Delete Vendor Payment Error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete payment" }, { status: error.statusCode || 500 })
  }
}
