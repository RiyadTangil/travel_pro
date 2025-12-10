import { list, create } from "@/controllers/clientCategoryController"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get("page") || 1)
  const pageSize = Number(searchParams.get("pageSize") || 10)
  const companyId = request.headers.get("x-company-id") || undefined
  return list({ page, pageSize, companyId })
}

export async function POST(request: Request) {
  const body = await request.json()
  return create(body)
}

