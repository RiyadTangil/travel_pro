import { NextRequest, NextResponse } from "next/server"
import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { NonInvoiceCompany } from "@/models/non-invoice-company"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongoose()
    const body = await request.json()
    const companyId = request.headers.get("x-company-id")
    const { id } = params

    if (!companyId) return NextResponse.json({ error: "Company ID required" }, { status: 400 })

    const updated = await NonInvoiceCompany.findOneAndUpdate(
      { _id: id, companyId: new Types.ObjectId(companyId) },
      { ...body, updatedAt: new Date().toISOString() },
      { new: true }
    )

    if (!updated) return NextResponse.json({ error: "Company not found" }, { status: 404 })

    return NextResponse.json(updated)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongoose()
    const companyId = request.headers.get("x-company-id")
    const { id } = params

    if (!companyId) return NextResponse.json({ error: "Company ID required" }, { status: 400 })

    const deleted = await NonInvoiceCompany.findOneAndDelete({ 
      _id: id, 
      companyId: new Types.ObjectId(companyId) 
    })

    if (!deleted) return NextResponse.json({ error: "Company not found" }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
