import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Invoice } from "@/models/invoice"
import { AppError } from "@/errors/AppError"

export interface SalesmanCollectionParams {
  employeeId?: string
  dateFrom?: string
  dateTo?: string
  companyId?: string
}

export async function getSalesmanCollectionReport(params: SalesmanCollectionParams) {
  await connectMongoose()

  const {
    employeeId,
    dateFrom,
    dateTo,
    companyId
  } = params

  const query: any = {}

  if (companyId) {
    query.companyId = new Types.ObjectId(companyId)
  }

  if (employeeId && Types.ObjectId.isValid(employeeId)) {
    query.employeeId = new Types.ObjectId(employeeId)
  }

  if (dateFrom || dateTo) {
    query.salesDate = {}
    if (dateFrom) query.salesDate.$gte = dateFrom
    if (dateTo) query.salesDate.$lte = dateTo
  }

  const invoices = await Invoice.find(query)
    .sort({ salesDate: -1, createdAt: -1 })
    .lean()

  const items = invoices.map((inv: any) => {
    const salesPrice = Number(inv.netTotal || inv.billing?.netTotal || 0)
    const collectedAmount = Number(inv.receivedAmount || 0)
    const due = Math.max(0, salesPrice - collectedAmount)

    return {
      id: String(inv._id),
      date: inv.salesDate,
      invoiceNo: inv.invoiceNo,
      clientName: inv.clientName || "",
      salesBy: inv.salesByName || "",
      salesPrice: salesPrice,
      collectedAmount: collectedAmount,
      due: due
    }
  })

  // Calculate grand totals
  const totals = items.reduce((acc, item) => ({
    salesPrice: acc.salesPrice + item.salesPrice,
    collectedAmount: acc.collectedAmount + item.collectedAmount,
    due: acc.due + item.due,
  }), { salesPrice: 0, collectedAmount: 0, due: 0 })

  return {
    items,
    totals
  }
}
