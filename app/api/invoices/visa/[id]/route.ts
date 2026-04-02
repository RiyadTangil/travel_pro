import { NextResponse } from "next/server"
import { getServerSession, Session } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getInvoiceById, updateInvoiceById } from "@/services/invoiceService"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await (params as any)
    const session = await getServerSession(authOptions as any) as Session | null
    const companyId = session?.user?.companyId
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const result = await getInvoiceById(id, String(companyId))
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("GET Visa Invoice ID Error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.status || 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await (params as any)
    const session = await getServerSession(authOptions as any) as Session | null
    const companyId = session?.user?.companyId
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const result = await updateInvoiceById(id, { ...body, invoiceType: "visa" }, String(companyId))
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("PUT Visa Invoice ID Error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.status || 500 })
  }
}
