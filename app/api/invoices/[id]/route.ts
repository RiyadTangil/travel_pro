import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getById, updateById, deleteById } from "@/controllers/invoiceController"
import connectMongoose from "@/lib/mongoose"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId
    if (!companyId) return NextResponse.json({ error: "Unauthorized: Company ID required" }, { status: 401 })

    const { id } = await (params as any)
    const result = await getById({ id, companyId: String(companyId) })
    return result
  } catch (error) {
    console.error("Invoices [id] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId
    if (!companyId) return NextResponse.json({ error: "Unauthorized: Company ID required" }, { status: 401 })

    const { id } = await (params as any)
    const body = await request.json()
    const result = await updateById(id, body, String(companyId))
    return result
  } catch (error: any) {
    console.error("Invoices [id] PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId
    if (!companyId) return NextResponse.json({ error: "Unauthorized: Company ID required" }, { status: 401 })

    const { id } = await (params as any)
    const result = await deleteById(id, String(companyId))
    return result
  } catch (error) {
    console.error("Invoices [id] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
