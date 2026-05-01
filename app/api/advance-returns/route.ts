import { type NextRequest } from "next/server"
import { list, create } from "@/controllers/advanceReturnController"
import { getBackendSession } from "@/lib/auth-server"
import { fail } from "@/utils/api-response"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "20")
    const search = (searchParams.get("search") || "").trim()
    const dateFrom = searchParams.get("dateFrom") || undefined
    const dateTo = searchParams.get("dateTo") || undefined
    const clientId = searchParams.get("clientId") || undefined
    
    const { companyId } = await getBackendSession()
    return await list({ page, pageSize, search, dateFrom, dateTo, clientId, companyId })
  } catch (error: any) {
    return fail(error.message || "Unauthorized", error.statusCode || 401)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId } = await getBackendSession()
    return await create(body, companyId)
  } catch (error: any) {
    return fail(error.message || "Unauthorized", error.statusCode || 401)
  }
}
