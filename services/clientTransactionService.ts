import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { ClientTransaction } from "@/models/client-transaction"

function parseNumber(n: any, def = 0): number {
  const x = Number(n)
  return isFinite(x) ? x : def
}

/** Rows excluded from account transaction history unless explicitly shown. */
export function accountTransactionListVisibilityFilter(): Record<string, unknown> {
  return {
    $or: [
      { isMonetoryTranseciton: true },
      {
        isMonetoryTranseciton: { $exists: false }
      },
    ],
  }
}

export async function listClientTransactionsForAccountHistory(params: {
  page: number
  pageSize: number
  companyId: string
  accountId?: string
  clientId?: string
  dateFrom?: string
  dateTo?: string
}) {
  await connectMongoose()

  const page = Math.max(1, parseNumber(params.page, 1))
  const pageSize = Math.max(1, parseNumber(params.pageSize, 20))

  const companyIdRaw = (params.companyId || "").trim()
  if (!companyIdRaw || !Types.ObjectId.isValid(companyIdRaw)) {
    const err = new Error("Valid companyId is required") as Error & { statusCode?: number }
    err.statusCode = 400
    throw err
  }

  const filter: Record<string, unknown> = {
    ...accountTransactionListVisibilityFilter(),
    companyId: new Types.ObjectId(companyIdRaw),
  }

  const accountIdRaw = (params.accountId || "").trim()
  const clientIdRaw = (params.clientId || "").trim()
  if (clientIdRaw && Types.ObjectId.isValid(clientIdRaw)) filter.clientId = new Types.ObjectId(clientIdRaw)
  if (accountIdRaw && Types.ObjectId.isValid(accountIdRaw)) filter.paymentTypeId = new Types.ObjectId(accountIdRaw)

  const dateFrom = params.dateFrom
  const dateTo = params.dateTo
  if (dateFrom || dateTo) {
    const range: Record<string, string> = {}
    if (dateFrom) range.$gte = dateFrom
    if (dateTo) range.$lte = dateTo
    filter.date = range
  }

  const total = await ClientTransaction.countDocuments(filter)
  const docs = await ClientTransaction.find(filter)
    .sort({ date: 1, createdAt: 1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean()

  const items = docs.map((t: any) => ({
    _id: String(t._id),
    date: t.date,
    voucherNo: t.voucherNo,
    accountName: t.accountName || "",
    clientName: t.clientName || "",
    direction: t.direction,
    amount: parseNumber(t.amount, 0),
    lastTotalAmount: t.lastTotalAmount !== undefined ? parseNumber(t.lastTotalAmount) : null,
    note: t.note || "",
    transactionType: t.transactionType,
    invoiceType: t.invoiceType,
  }))

  return { items, pagination: { page, pageSize, total } }
}
