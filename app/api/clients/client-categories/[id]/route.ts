import { update } from "@/controllers/clientCategoryController"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  return update(params.id, body)
}

