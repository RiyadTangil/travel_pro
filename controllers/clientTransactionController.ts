import { Types } from "mongoose"
import { ok, fail, badRequest } from "@/utils/api-response"
import { listClientTransactionsForAccountHistory } from "@/services/clientTransactionService"

function parseNumber(n: any, def = 0): number {
  const x = Number(n)
  return isFinite(x) ? x : def
}

export async function listForAccountHistory(
  searchParams: URLSearchParams,
  companyIdHeader?: string | null,
) {
  try {
    const companyId = (companyIdHeader || "").trim()
    if (!companyId || !Types.ObjectId.isValid(companyId)) {
      return badRequest("Valid x-company-id header is required")
    }

    const page = parseNumber(searchParams.get("page"), 1)
    const pageSize = parseNumber(searchParams.get("pageSize"), 20)
    const accountIdRaw = (searchParams.get("accountId") || "").trim()
    const clientIdRaw = (searchParams.get("clientId") || "").trim()
    const dateFrom = searchParams.get("dateFrom") || undefined
    const dateTo = searchParams.get("dateTo") || undefined

    const data = await listClientTransactionsForAccountHistory({
      page,
      pageSize,
      companyId,
      accountId: accountIdRaw && accountIdRaw !== "all" ? accountIdRaw : undefined,
      clientId: clientIdRaw || undefined,
      dateFrom,
      dateTo,
    })
    return ok(data)
  } catch (e: any) {
    if (e?.statusCode === 400) {
      return badRequest(e?.message || "Bad request")
    }
    console.error("clientTransactionController.listForAccountHistory error:", e)
    return fail("Internal server error", 500)
  }
}
