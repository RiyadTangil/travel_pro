import { NextRequest, NextResponse } from "next/server"
import { getVendorPaymentById, updateVendorPayment, deleteVendorPayment } from "@/services/vendorPaymentService"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const companyId = req.headers.get("x-company-id") || undefined
    const { id } = await params
    const payment = await getVendorPaymentById(id, companyId)
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }
    return NextResponse.json(payment)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch payment" }, { status: error.status ?? 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json()
    const companyId = req.headers.get("x-company-id") || undefined
    const { id } = await params
    const result = await updateVendorPayment(id, body, companyId)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update payment" }, { status: error.status ?? 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const companyId = req.headers.get("x-company-id") || undefined
    const { id } = await params
    const result = await deleteVendorPayment(id, companyId)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete payment" }, { status: error.status ?? 500 })
  }
}
