import { NextRequest, NextResponse } from "next/server"
import { deleteAirticketRefund } from "@/services/refundService"
import { AppError } from "@/errors/AppError"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = req.headers.get("companyid")
    if (!companyId) return NextResponse.json({ error: "Company ID is required" }, { status: 401 })

    const { id } = await params
    const result = await deleteAirticketRefund(id, companyId)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("DELETE /api/refund/airticket/[id] error:", error)
    const status = error instanceof AppError ? error.statusCode : 500
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status })
  }
}
