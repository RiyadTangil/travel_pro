import { NextRequest, NextResponse } from "next/server"
import {
  getUniqueVendorInvoices,
  getVendorSummaryByInvoice,
  getVendorsWithNonCommissionTickets,
  getNonCommissionTicketLinesByVendor,
} from "@/services/vendorPaymentService"
import { AppError } from "@/errors/AppError"

export async function getUniqueInvoices(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id") || ""
    if (!companyId) {
      throw new AppError("Company ID is required", 400)
    }
    const items = await getUniqueVendorInvoices(companyId)
    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status ?? 500 })
  }
}

export async function getInvoiceVendors(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: "Invoice id is required" }, { status: 400 })
    }
    const companyId = req.headers.get("x-company-id") || undefined
    const items = await getVendorSummaryByInvoice(id, companyId)
    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status ?? 500 })
  }
}

export async function getNonCommissionTicketVendorList(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id") || ""
    if (!companyId) {
      throw new AppError("Company ID is required", 400)
    }
    const items = await getVendorsWithNonCommissionTickets(companyId)
    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status ?? 500 })
  }
}

export async function getNonCommissionTicketLines(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: vendorId } = await context.params
    if (!vendorId) {
      return NextResponse.json({ error: "Vendor id is required" }, { status: 400 })
    }
    const companyId = req.headers.get("x-company-id") || ""
    if (!companyId) {
      throw new AppError("Company ID is required", 400)
    }
    const items = await getNonCommissionTicketLinesByVendor(vendorId, companyId)
    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status ?? 500 })
  }
}
