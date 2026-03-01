import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Invoice } from "@/models/invoice"
import { AppError } from "@/errors/AppError"

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
    companyId
  } = params

  const query: any = {}

  if (companyId) {
    query.companyId = new Types.ObjectId(companyId)
  }

  if (clientId && Types.ObjectId.isValid(clientId)) {
    query.clientId = new Types.ObjectId(clientId)
  }

  if (employeeId && Types.ObjectId.isValid(employeeId)) {
    query.employeeId = new Types.ObjectId(employeeId)
  }

  // categoryId might be a string name or an ID depending on how it's stored
  // In the current Invoice model, there is no explicit category field, 
  // but invoiceType exists: ["standard", "visa", "non_commission"]
  // If the user wants to filter by "Category", we might need to check how it's mapped.
  // Assuming for now categoryId refers to invoiceType or a custom field.
  if (categoryId) {
    query.invoiceType = categoryId 
  }

  if (dateFrom || dateTo) {
    query.salesDate = {}
    if (dateFrom) query.salesDate.$gte = dateFrom
    if (dateTo) query.salesDate.$lte = dateTo
  }

  const skip = (page - 1) * pageSize

  const [docs, total] = await Promise.all([
    Invoice.find(query)
      .sort({ salesDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Invoice.countDocuments(query)
  ])

  const items = docs.map((d: any) => {
    const netTotal = Number(d.netTotal || d.billing?.netTotal || 0)
    const totalCost = Number(d.billing?.totalCost || 0)
    const profit = netTotal - totalCost
    const receivedAmount = Number(d.receivedAmount || 0)
    const dueAmount = Math.max(0, netTotal - receivedAmount)

    return {
      id: String(d._id),
      date: d.salesDate,
      invoiceNo: d.invoiceNo,
      clientName: d.clientName || "",
      category: d.invoiceType || "Other",
      salesBy: d.salesByName || "",
      salesPrice: netTotal,
      costPrice: totalCost,
      profit: profit,
      collectAmount: receivedAmount,
      dueAmount: dueAmount,
    }
  })

  // Calculate totals for the entire filtered set (not just the page)
  const aggregateTotals = await Invoice.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalSales: { $sum: { $ifNull: ["$netTotal", { $ifNull: ["$billing.netTotal", 0] }] } },
        totalCost: { $sum: { $ifNull: ["$billing.totalCost", 0] } },
        totalCollected: { $sum: { $ifNull: ["$receivedAmount", 0] } },
      }
    }
  ])

  const overallTotals = aggregateTotals[0] || { totalSales: 0, totalCost: 0, totalCollected: 0 }
  
  return {
    items,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    },
    totals: {
      salesPrice: overallTotals.totalSales,
      costPrice: overallTotals.totalCost,
      profit: overallTotals.totalSales - overallTotals.totalCost,
      collectAmount: overallTotals.totalCollected,
      dueAmount: Math.max(0, overallTotals.totalSales - overallTotals.totalCollected)
    }
  }
}
