import { list, create } from "@/controllers/clientsManagerController"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get("page") || 1)
  const limit = Number(searchParams.get("limit") || 10)
  const search = (searchParams.get("search") || "").trim()
  const categoryId = searchParams.get("categoryId") || undefined
  const userId = searchParams.get("userId") || undefined
  const status = searchParams.get("status") || undefined // "active" | "inactive" | undefined
  return list({ page, limit, search, categoryId, userId, status })
}

export async function POST(request: Request) {
  const body = await request.json()
  return create(body)
}
