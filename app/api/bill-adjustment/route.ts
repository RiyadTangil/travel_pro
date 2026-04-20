import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { listBillAdjustments, postBillAdjustment } from "@/controllers/billAdjustmentController"

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { companyId?: string } } | null
  const companyId = session?.user?.companyId || req.headers.get("x-company-id")
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const data = await req.json()
  return postBillAdjustment(data, companyId)
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { companyId?: string } } | null
  const companyId = session?.user?.companyId || req.headers.get("x-company-id")
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get("page") || 1)
  const pageSize = Number(searchParams.get("pageSize") || 20)

  return listBillAdjustments(companyId, page, pageSize)
}
