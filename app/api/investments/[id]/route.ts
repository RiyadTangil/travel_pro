import { type NextRequest } from "next/server"
import { update, remove } from "@/controllers/investmentController"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json()
  const companyId = request.headers.get("x-company-id") || undefined
  return await update(params.id, body, companyId)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const companyId = request.headers.get("x-company-id") || undefined
  return await remove(params.id, companyId)
}
