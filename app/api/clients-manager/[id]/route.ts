import { getById, updateById, deleteById } from "@/controllers/clientsManagerController"

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return getById(params.id)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  return updateById(params.id, body)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return deleteById(params.id)
}

