import { NextResponse } from "next/server"
import { getUniqueVendorInvoices, getVendorSummaryByInvoice } from "@/services/vendorPaymentService"

export async function getUniqueInvoices(req: Request) {
  try {
    const companyId = req.headers.get("x-company-id") || undefined
    const items = await getUniqueVendorInvoices(companyId)
    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function getInvoiceVendors(req: Request, { params }: { params: { id: string } }) {
  try {
    const items = await getVendorSummaryByInvoice(params.id)
    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
