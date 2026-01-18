import { NextResponse } from "next/server"
import { getClientLedger } from "@/services/clientLedgerService"
import { AppError } from "@/errors/AppError"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 })
    }

    const result = await getClientLedger(clientId, dateFrom, dateTo)
    return NextResponse.json(result)

  } catch (error: any) {
    console.error("Ledger API Error:", error)
    const status = error instanceof AppError ? error.statusCode : 500
    const message = error instanceof AppError ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status })
  }
}
