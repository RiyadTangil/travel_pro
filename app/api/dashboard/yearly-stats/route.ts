import { NextRequest } from "next/server"
import { getDashboardYearlyStats } from "@/services/dashboardService"
import { ok, fail } from "@/utils/api-response"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const companyId = request.headers.get("x-company-id")

    if (!companyId) {
      return fail("Company ID is required", 401)
    }

    const stats = await getDashboardYearlyStats(year, companyId)
    return ok(stats)
  } catch (error: any) {
    console.error("Dashboard Stats API Error:", error)
    return fail(error.message || "Internal Server Error", 500)
  }
}
