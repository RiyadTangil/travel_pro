import { NextRequest } from "next/server"
import { getDashboardMetrics } from "@/services/dashboardService"
import { ok, fail } from "@/utils/api-response"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get("period") || "daily") as "daily" | "monthly" | "yearly"
    const companyId = request.headers.get("x-company-id")

    if (!companyId) {
      return fail("Company ID is required", 401)
    }

    const stats = await getDashboardMetrics(period, companyId)
    return ok(stats)
  } catch (error: any) {
    console.error("Dashboard Metrics API Error:", error)
    return fail(error.message || "Internal Server Error", 500)
  }
}
