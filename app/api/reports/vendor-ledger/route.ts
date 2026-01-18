import { NextResponse } from "next/server"
import { getVendorLedger } from "@/services/vendorLedgerService"
import { AppError } from "@/errors/AppError"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get("vendorId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    if (!vendorId) {
      return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 })
    }

    const result = await getVendorLedger(vendorId, dateFrom, dateTo)
    return NextResponse.json(result)

  } catch (error: any) {
    console.error("Vendor Ledger API Error:", error)
    const status = error instanceof AppError ? error.statusCode : 500
    const message = error instanceof AppError ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status })
  }
}