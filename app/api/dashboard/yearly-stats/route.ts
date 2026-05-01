import { NextRequest } from "next/server"
import { getDashboardYearlyStats } from "@/services/dashboardService"
import { ok, fail } from "@/utils/api-response"
import { getBackendSession } from "@/lib/auth-server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get("year") || new Date().getFullYear())
    const { companyId } = await getBackendSession()

    const stats = await getDashboardYearlyStats(year, companyId)
    return ok(stats)
  } catch (error: any) {
    console.error("Dashboard Yearly Stats API Error:", error)
    return fail(error.message || "Internal Server Error", error.statusCode || 500)
  }
}
