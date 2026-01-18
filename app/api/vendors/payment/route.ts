import { NextRequest, NextResponse } from "next/server"
import { createVendorPayment, listVendorPayments } from "@/services/vendorPaymentService"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get("page") || 1)
    const pageSize = Number(searchParams.get("pageSize") || 20)
    const search = searchParams.get("search") || ""
    const companyId = req.headers.get("x-company-id") || undefined

    const result = await listVendorPayments({ page, pageSize, search, companyId })
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const companyId = req.headers.get("x-company-id") || undefined
    const result = await createVendorPayment(body, companyId)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Create Vendor Payment Error:", error)
    return NextResponse.json({ error: error.message || "Failed to create payment" }, { status: error.statusCode || 500 })
  }
}
