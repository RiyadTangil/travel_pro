import { NextResponse } from "next/server"
import { getClientVendorStats } from "@/services/clientVendorStatsService"
import { ok, fail, badRequest } from "@/utils/api-response"

export async function GET(request: Request) {
  try {
    const companyId = request.headers.get("x-company-id")

    if (!companyId) {
      return badRequest("Company ID is required")
    }

    const data = await getClientVendorStats(companyId)
    return ok(data, 200, "Stats fetched successfully")
  } catch (error) {
    console.error("Client/Vendor stats error:", error)
    return fail("Internal server error", 500)
  }
}