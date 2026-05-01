import { NextRequest } from "next/server"
import { getDashboardMetrics } from "@/services/dashboardService"
import { ok, fail } from "@/utils/api-response"
import { getBackendSession } from "@/lib/auth-server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get("period") || "daily") as "daily" | "monthly" | "yearly"
    const { companyId } = await getBackendSession()

    const stats = await getDashboardMetrics(period, companyId)
    return ok(stats)
  } catch (error: any) {
    console.error("Dashboard Metrics API Error:", error)
    return fail(error.message || "Internal Server Error", error.statusCode || 500)
  }
}
