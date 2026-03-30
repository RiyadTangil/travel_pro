import { NextResponse } from "next/server"
import { getServerSession, Session } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getNonCommissionInvoiceById, updateNonCommissionInvoice } from "@/services/invoiceService"
import { AppError } from "@/errors/AppError"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions as any) as Session | null
    const companyId = session?.user?.companyId
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await (params as any)
    const result = await getNonCommissionInvoiceById(String(id || "").trim(), String(companyId))
    return NextResponse.json(result)
  } catch (error: any) {
    const status = error instanceof AppError ? error.status : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions as any) as Session | null
    const companyId = session?.user?.companyId
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await (params as any)
    const body = await request.json()
    const result = await updateNonCommissionInvoice(String(id || "").trim(), body, String(companyId))
    return NextResponse.json(result)
  } catch (error: any) {
    const status = error instanceof AppError ? error.status : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
