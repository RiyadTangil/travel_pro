import { NextResponse } from "next/server"
import { getSalesCollectionReport } from "@/services/salesCollectionService"
import { AppError } from "@/errors/AppError"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || undefined

    const params = {
      clientId: searchParams.get("clientId") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      companyId
    }

    const result = await getSalesCollectionReport(params)
    return NextResponse.json(result)

  } catch (error: any) {
    console.error("Sales Collection Report API Error:", error)
    const status = error instanceof AppError ? error.statusCode : 500
    const message = error instanceof AppError ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status })
  }
}
