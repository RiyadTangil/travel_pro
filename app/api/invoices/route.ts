import { NextResponse } from "next/server"
import { getServerSession, Session } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createInvoice, listInvoices } from "@/services/invoiceService"
import { apiErrorResponse } from "@/errors/apiErrorResponse"
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
      invoiceType: searchParams.get("invoiceType") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      clientId: searchParams.get("clientId") || undefined,
      salesBy: searchParams.get("salesBy") || undefined,
      companyId: String(companyId)
    }

    const result = await listInvoices(params)
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("GET Invoices Error:", error)
    return apiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions as any) as Session | null
    const companyId = session?.user?.companyId
    if (!companyId) return NextResponse.json({ error: "Unauthorized: Company ID required" }, { status: 401 })

    const body = await request.json()

    const parsed = StandardInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(parsed.error) },
        { status: 422 }
      )
    }

    const result = await createInvoice(parsed.data, String(companyId))
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("POST Invoice Error:", error)
    return apiErrorResponse(error)
  }
}
