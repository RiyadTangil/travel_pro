import { NextRequest, NextResponse } from "next/server"
import { createAirticketRefund, getAirticketRefunds } from "@/services/refundService"
import { AppError } from "@/errors/AppError"

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("companyid")
    if (!companyId) return NextResponse.json({ error: "Company ID is required" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const query = Object.fromEntries(searchParams.entries())

    const result = await getAirticketRefunds(companyId, query)
    return NextResponse.json(result)
  } catch (error: any) {
    const status = error instanceof AppError ? error.statusCode : 500
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("companyid")
    if (!companyId) return NextResponse.json({ error: "Company ID is required" }, { status: 401 })

    const body = await req.json()
    const result = await createAirticketRefund(body, companyId)
    return NextResponse.json(result)
  } catch (error: any) {
    const status = error instanceof AppError ? error.statusCode : 500
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status })
  }
}
