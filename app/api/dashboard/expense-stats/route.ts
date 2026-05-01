import { NextResponse } from "next/server"
import { getExpenseDashboardStats } from "@/services/expenseDashboardService"
import { ok, fail, badRequest } from "@/utils/api-response"

export async function GET(request: Request) {
  try {
    const companyId = request.headers.get("x-company-id")

    if (!companyId) {
      return badRequest("Company ID is required")
    }

    const data = await getExpenseDashboardStats(companyId)
    return ok(data, 200, "Expense stats fetched successfully")
  } catch (error) {
    console.error("Expense dashboard stats error:", error)
    return fail("Internal server error", 500)
  }
}
