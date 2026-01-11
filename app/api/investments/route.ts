import { type NextRequest } from "next/server"
import { list, create } from "@/controllers/investmentController"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "20")
  const search = (searchParams.get("search") || "").trim()
  const dateFrom = searchParams.get("dateFrom") || undefined
  const dateTo = searchParams.get("dateTo") || undefined
  const companyId = request.headers.get("x-company-id") || undefined
  return await list({ page, pageSize, search, dateFrom, dateTo, companyId })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const companyId = request.headers.get("x-company-id") || undefined
  return await create(body, companyId)
}
