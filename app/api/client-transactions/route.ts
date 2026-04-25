import { NextRequest } from "next/server"
import { listForAccountHistory } from "@/controllers/clientTransactionController"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const companyId = request.headers.get("x-company-id") || undefined
  return listForAccountHistory(searchParams, companyId)
}
