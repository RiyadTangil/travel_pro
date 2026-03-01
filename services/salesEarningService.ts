import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Invoice } from "@/models/invoice"
import { AppError } from "@/errors/AppError"

export interface SalesEarningParams {
  clientId?: string
  employeeId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  companyId?: string
}

export async function getMonthlySalesEarning(params: SalesEarningParams) {
  await connectMongoose()

  const {
    clientId,
    employeeId,
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
    const discount = Number(d.billing?.discount || 0)
    const serviceCharge = Number(d.billing?.serviceCharge || 0)
    const earningAmount = netTotal - totalCost
    const receivedAmount = Number(d.receivedAmount || 0)
    const dueAmount = Math.max(0, netTotal - receivedAmount)

    return {
      id: String(d._id),
      date: d.salesDate,
      invoiceNo: d.invoiceNo,
      clientName: d.clientName || "",
      salesBy: d.salesByName || "",
      salesCategory: d.invoiceType || "Other",
      salesPrice: netTotal,
      purchaseAmount: totalCost,
      clientDiscount: discount,
      serviceCharge: serviceCharge,
      earningAmount: earningAmount,
      collectedAmount: receivedAmount,
      dueAmount: dueAmount,
      status: d.status || "due"
    }
  })

  // Calculate totals for the entire filtered set
  const aggregateTotals = await Invoice.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalSales: { $sum: { $ifNull: ["$netTotal", { $ifNull: ["$billing.netTotal", 0] }] } },
        totalPurchase: { $sum: { $ifNull: ["$billing.totalCost", 0] } },
        totalDiscount: { $sum: { $ifNull: ["$billing.discount", 0] } },
        totalServiceCharge: { $sum: { $ifNull: ["$billing.serviceCharge", 0] } },
        totalCollected: { $sum: { $ifNull: ["$receivedAmount", 0] } },
      }
    }
  ])

  const overallTotals = aggregateTotals[0] || { totalSales: 0, totalPurchase: 0, totalDiscount: 0, totalServiceCharge: 0, totalCollected: 0 }
  
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
      purchaseAmount: overallTotals.totalPurchase,
      clientDiscount: overallTotals.totalDiscount,
      serviceCharge: overallTotals.totalServiceCharge,
      earningAmount: overallTotals.totalSales - overallTotals.totalPurchase,
      collectedAmount: overallTotals.totalCollected,
      dueAmount: Math.max(0, overallTotals.totalSales - overallTotals.totalCollected)
    }
  }
}
