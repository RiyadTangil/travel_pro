import { NextRequest, NextResponse } from "next/server"
import { createVendorAdvanceReturn, listVendorAdvanceReturns } from "@/services/vendorAdvanceReturnService"
import { AppError } from "@/errors/AppError"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const companyId = req.headers.get("x-company-id")
    const result = await createVendorAdvanceReturn({ ...body, companyId })
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.statusCode || 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = req.headers.get("x-company-id")
    const params = {
      page: Number(searchParams.get("page") || 1),
      pageSize: Number(searchParams.get("pageSize") || 20),
      search: searchParams.get("search") || "",
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
      companyId
    }
    const result = await listVendorAdvanceReturns(params)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.statusCode || 500 })
  }
}
