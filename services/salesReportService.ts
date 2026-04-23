import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Invoice } from "@/models/invoice"

export interface SalesReportParams {
  clientId?: string
  employeeId?: string
  categoryId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  companyId?: string
}

/**
 * Returns paginated invoice rows + grand-total aggregates in a single
 * MongoDB round-trip using $facet.
 *
 * Optimization vs. previous version:
 *   Before: Invoice.find()  +  Invoice.countDocuments()  +  Invoice.aggregate()  = 3 DB calls
 *   After:  Invoice.aggregate([ $match, { $facet: { items, totals, count } } ])  = 1 DB call
 */
export async function getSalesReport(params: SalesReportParams) {
  await connectMongoose()

  const {
    clientId,
    employeeId,
    categoryId,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 20,
    companyId,
  } = params

  const query: Record<string, unknown> = { isDeleted: { $ne: true } }

  if (companyId) query.companyId = new Types.ObjectId(companyId)

  if (clientId && Types.ObjectId.isValid(clientId))
    query.clientId = new Types.ObjectId(clientId)

  if (employeeId && Types.ObjectId.isValid(employeeId))
    query.employeeId = new Types.ObjectId(employeeId)

  if (categoryId) query.invoiceType = categoryId

  if (dateFrom || dateTo) {
    const df: Record<string, string> = {}
    if (dateFrom) df.$gte = dateFrom
    if (dateTo)   df.$lte = dateTo
    query.salesDate = df
  }

  const skip = (page - 1) * pageSize

  const [result] = await Invoice.aggregate([
    { $match: query },
    {
      $facet: {
        // ── paginated rows ───────────────────────────────────────────────────
        items: [
          { $sort: { salesDate: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: pageSize },
        ],
        // ── grand totals for the whole result set ────────────────────────────
        totals: [
          {
            $group: {
              _id: null,
              totalSales: {
                $sum: { $ifNull: ["$netTotal", { $ifNull: ["$billing.netTotal", 0] }] },
              },
              totalCost:      { $sum: { $ifNull: ["$billing.totalCost", 0] } },
              totalCollected: { $sum: { $ifNull: ["$receivedAmount", 0] } },
            },
          },
        ],
        // ── total document count ─────────────────────────────────────────────
        count: [{ $count: "n" }],
      },
    },
  ])

  const docs          = (result.items   ?? []) as any[]
  const total         = (result.count[0]?.n   ?? 0)  as number
  const raw           = result.totals[0] ?? { totalSales: 0, totalCost: 0, totalCollected: 0 }

  const items = docs.map((d: any) => {
    const netTotal       = Number(d.netTotal ?? d.billing?.netTotal ?? 0)
    const totalCost      = Number(d.billing?.totalCost ?? 0)
    const receivedAmount = Number(d.receivedAmount ?? 0)
    return {
      id:             String(d._id),
      clientId:       String(d.clientId ?? ""),
      date:           d.salesDate ?? "",
      invoiceNo:      d.invoiceNo ?? "",
      clientName:     d.clientName ?? "",
      category:       d.invoiceType ?? "Other",
      salesBy:        d.salesByName ?? "",
      salesPrice:     netTotal,
      costPrice:      totalCost,
      profit:         netTotal - totalCost,
      collectAmount:  receivedAmount,
      dueAmount:      Math.max(0, netTotal - receivedAmount),
    }
  })

  return {
    items,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    totals: {
      salesPrice:    raw.totalSales,
      costPrice:     raw.totalCost,
      profit:        raw.totalSales - raw.totalCost,
      collectAmount: raw.totalCollected,
      dueAmount:     Math.max(0, raw.totalSales - raw.totalCollected),
    },
  }
}
