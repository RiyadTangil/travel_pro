import { NextRequest, NextResponse } from "next/server"
import { updateVendorAdvanceReturn, deleteVendorAdvanceReturn } from "@/services/vendorAdvanceReturnService"
import { AppError } from "@/errors/AppError"

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await req.json()
    const result = await updateVendorAdvanceReturn(id, body)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.statusCode || 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const result = await deleteVendorAdvanceReturn(id)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.statusCode || 500 })
  }
}
