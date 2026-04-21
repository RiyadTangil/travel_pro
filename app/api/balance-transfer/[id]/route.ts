import { type NextRequest } from "next/server"
import { update, remove } from "@/controllers/balanceTransferController"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json()
  const companyId = request.headers.get("x-company-id") || undefined
  const { id } = await params
  return await update(id, body, companyId)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const companyId = request.headers.get("x-company-id") || undefined
  const { id } = await params
  return await remove(id, companyId)
}
