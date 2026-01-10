import { type NextRequest } from "next/server"
import { getBalanceStatus } from "@/controllers/balanceStatusController"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const companyId = request.headers.get("x-company-id") || undefined
  return await getBalanceStatus(companyId)
}
