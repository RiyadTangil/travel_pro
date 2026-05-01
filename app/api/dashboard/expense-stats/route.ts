import { NextRequest } from "next/server"
import { getExpenseDashboardStats } from "@/services/expenseDashboardService"
import { ok, fail } from "@/utils/api-response"
import { getBackendSession } from "@/lib/auth-server"

export async function GET(request: NextRequest) {
  try {
    const { companyId } = await getBackendSession()

    const data = await getExpenseDashboardStats(companyId)
    return ok(data, 200, "Expense stats fetched successfully")
  } catch (error: any) {
    console.error("Expense dashboard stats error:", error)
    return fail(error.message || "Internal server error", error.statusCode || 500)
  }
}
