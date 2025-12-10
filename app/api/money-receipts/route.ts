import { type NextRequest, NextResponse } from "next/server"
import { createMoneyReceipt, listMoneyReceipts } from "@/services/moneyReceiptService"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "20")
    const clientId = searchParams.get("clientId") || undefined
    const companyId = request.headers.get('x-company-id') || undefined
    const result = await listMoneyReceipts({ page, pageSize, clientId: clientId || undefined, companyId })
    return NextResponse.json(result)
  } catch (err) {
    console.error("money-receipts GET error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const companyId = request.headers.get('x-company-id') || undefined
    const result = await createMoneyReceipt(body, companyId)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error("money-receipts POST error", err)
    const msg = err?.message || "Internal server error"
    const status = err?.statusCode || 500
    return NextResponse.json({ error: msg }, { status })
  }
}
