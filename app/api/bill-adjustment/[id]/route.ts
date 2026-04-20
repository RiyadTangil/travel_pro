import { NextRequest, NextResponse } from "next/server"
import { deleteBillAdjustment } from "@/services/billAdjustmentService"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || req.headers.get("x-company-id")
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    await deleteBillAdjustment(id, companyId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting bill adjustment:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
