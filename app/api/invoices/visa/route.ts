import { NextResponse } from "next/server"
import { getServerSession, Session } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { listInvoices, createInvoice } from "@/services/invoiceService"
import { AppError } from "@/errors/AppError"
import { StandardInvoiceSchema, formatZodErrors } from "@/lib/validations/invoice"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions as any) as Session | null
    const companyId = session?.user?.companyId
    if (!companyId) return NextResponse.json({ error: "Unauthorized: Company ID required" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const params = {
      page: Number(searchParams.get("page") || 1),
      pageSize: Number(searchParams.get("pageSize") || 20),
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      clientId: searchParams.get("clientId") || undefined,
      companyId: String(companyId),
      invoiceType: "visa"
    }

    const result = await listInvoices(params as any)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("GET Visa Invoices Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions as any) as Session | null
    const companyId = session?.user?.companyId
    if (!companyId) return NextResponse.json({ error: "Unauthorized: Company ID required" }, { status: 401 })

    const body = await request.json()

    const parsed = StandardInvoiceSchema.safeParse({ ...body, invoiceType: "visa" })
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(parsed.error) },
        { status: 422 }
      )
    }

    const result = await createInvoice(parsed.data, String(companyId))
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("POST Visa Invoice Error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.status || 500 })
  }
}
