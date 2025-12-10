import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getById, updateById, deleteById } from "@/controllers/invoiceController"
import connectMongoose from "@/lib/mongoose"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await connectMongoose()
    const { id } = await (params as any)
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || undefined
    return await getById({ id, companyId })
  } catch (error) {
    console.error("Invoices [id] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectMongoose()
    const { id } = await (params as any)
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || undefined
    const body = await request.json()
    return await updateById(id, body, companyId)
  } catch (error: any) {
    console.error("Invoices [id] PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await connectMongoose()
    const { id } = await (params as any)
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || undefined
    return await deleteById(id, companyId)
  } catch (error) {
    console.error("Invoices [id] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
