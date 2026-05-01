import { NextRequest } from "next/server"
import { getClientVendorStats } from "@/services/clientVendorStatsService"
import { ok, fail } from "@/utils/api-response"
import { getBackendSession } from "@/lib/auth-server"

export async function GET(request: NextRequest) {
  try {
    const { companyId } = await getBackendSession()

    const data = await getClientVendorStats(companyId)
    return ok(data, 200, "Stats fetched successfully")
  } catch (error: any) {
    console.error("Client/Vendor stats error:", error)
    return fail(error.message || "Internal server error", error.statusCode || 500)
  }
}