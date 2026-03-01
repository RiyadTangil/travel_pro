import { NextResponse } from "next/server"
import { getItemSalesmanReport } from "@/services/itemSalesmanReportService"
import { AppError } from "@/errors/AppError"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || undefined

    const params = {
      employeeId: searchParams.get("employeeId") || undefined,
      productName: searchParams.get("productName") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: Number(searchParams.get("page") || 1),
      pageSize: Number(searchParams.get("pageSize") || 20),
      companyId
    }

    const result = await getItemSalesmanReport(params)
    return NextResponse.json(result)

  } catch (error: any) {
    console.error("Item Salesman Report API Error:", error)
    const status = error instanceof AppError ? error.statusCode : 500
    const message = error instanceof AppError ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status })
  }
}
