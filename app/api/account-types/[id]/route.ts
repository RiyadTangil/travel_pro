import { type NextRequest } from "next/server"
import { update, remove } from "@/controllers/accountTypeController"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json()
  const { id } = await params
  return update(id, body)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return remove(id)
}
