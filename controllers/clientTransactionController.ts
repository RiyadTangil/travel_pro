import { ok, fail } from "@/utils/api-response"
import { listClientTransactionsForAccountHistory } from "@/services/clientTransactionService"

function parseNumber(n: any, def = 0): number {
  const x = Number(n)
  return isFinite(x) ? x : def
}

export async function listForAccountHistory(searchParams: URLSearchParams) {
  try {
    const page = parseNumber(searchParams.get("page"), 1)
    const pageSize = parseNumber(searchParams.get("pageSize"), 20)
    const accountIdRaw = (searchParams.get("accountId") || "").trim()
    const clientIdRaw = (searchParams.get("clientId") || "").trim()
    const dateFrom = searchParams.get("dateFrom") || undefined
    const dateTo = searchParams.get("dateTo") || undefined

    const data = await listClientTransactionsForAccountHistory({
      page,
      pageSize,
      accountId: accountIdRaw && accountIdRaw !== "all" ? accountIdRaw : undefined,
      clientId: clientIdRaw || undefined,
      dateFrom,
      dateTo,
    })
    return ok(data)
  } catch (e: any) {
    console.error("clientTransactionController.listForAccountHistory error:", e)
    return fail("Internal server error", 500)
  }
}
