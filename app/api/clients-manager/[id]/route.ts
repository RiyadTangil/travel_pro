import { getById, updateById, deleteById } from "@/controllers/clientsManagerController"

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { id } = await (params as any)
  return getById(id)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { id } = await (params as any)
  const body = await request.json()
  return updateById(id, body)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { id } = await (params as any)
  return deleteById(id)
}

