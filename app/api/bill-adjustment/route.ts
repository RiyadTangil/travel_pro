import { NextRequest, NextResponse } from "next/server"
import { createBillAdjustment, getBillAdjustments } from "@/services/billAdjustmentService"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || req.headers.get("x-company-id")
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const data = await req.json()
    const result = await createBillAdjustment(data, companyId)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error creating bill adjustment:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || req.headers.get("x-company-id")
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get("page") || 1)
    const pageSize = Number(searchParams.get("pageSize") || 20)

    const result = await getBillAdjustments(companyId, page, pageSize)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error fetching bill adjustments:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
