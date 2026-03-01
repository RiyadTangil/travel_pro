import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Invoice } from "@/models/invoice"
import { MoneyReceipt } from "@/models/money-receipt"
import { InvoiceItem } from "@/models/invoice-item"
import { AppError } from "@/errors/AppError"

export interface SalesCollectionParams {
  clientId?: string
  dateFrom?: string
  dateTo?: string
  companyId?: string
}

export async function getSalesCollectionReport(params: SalesCollectionParams) {
  await connectMongoose()

  const {
    clientId,
    dateFrom,
    dateTo,
    companyId
  } = params

  const query: any = {}

  if (clientId && Types.ObjectId.isValid(clientId)) {
    query.clientId = new Types.ObjectId(clientId)
  }

  if (companyId) {
    query.companyId = new Types.ObjectId(companyId)
  }

  // Filter for collections
  const collectionQuery: any = { ...query }
  if (dateFrom || dateTo) {
    collectionQuery.paymentDate = {}
    if (dateFrom) collectionQuery.paymentDate.$gte = dateFrom
    if (dateTo) collectionQuery.paymentDate.$lte = dateTo
  }

  // Filter for sales
  const salesQuery: any = { ...query }
  if (dateFrom || dateTo) {
    salesQuery.salesDate = {}
    if (dateFrom) salesQuery.salesDate.$gte = dateFrom
    if (dateTo) salesQuery.salesDate.$lte = dateTo
  }

  // Fetch Collections
  const collections = await MoneyReceipt.find(collectionQuery)
    .sort({ paymentDate: -1, createdAt: -1 })
    .lean()

  const collectionItems = collections.map((mr: any) => ({
    id: String(mr._id),
    paymentDate: mr.paymentDate,
    moneyReceiptNo: mr.voucherNo,
    particular: mr.paymentTo || "Sales Collection",
    client: mr.clientName || "",
    collectionAmount: Number(mr.amount || 0)
  }))

  const totalCollectionAmount = collectionItems.reduce((sum, item) => sum + item.collectionAmount, 0)

  // Fetch Sales (Invoices)
  const invoices = await Invoice.find(salesQuery)
    .sort({ salesDate: -1, createdAt: -1 })
    .lean()

  // For each invoice, find its items to get PAX names and ticket numbers
  const salesItems = await Promise.all(invoices.map(async (inv: any) => {
    const items = await InvoiceItem.find({ invoiceId: String(inv._id) }).lean()
    
    // Concatenate PAX names and Ticket numbers (assuming 'product' or 'description' might be ticket no if not explicit)
    const paxNames = items.map((i: any) => i.paxName).filter(Boolean).join(", ")
    const ticketNos = items.map((i: any) => i.ticketNo || i.product || "").filter(Boolean).join(", ")

    return {
      id: String(inv._id),
      invoiceDate: inv.salesDate,
      invoiceNo: inv.invoiceNo,
      client: inv.clientName || "",
      paxName: paxNames || inv.clientName || "",
      ticketNo: ticketNos,
      netTotal: Number(inv.netTotal || inv.billing?.netTotal || 0)
    }
  }))

  const totalSalesAmount = salesItems.reduce((sum, item) => sum + item.netTotal, 0)

  return {
    collections: {
      items: collectionItems,
      total: totalCollectionAmount
    },
    sales: {
      items: salesItems,
      total: totalSalesAmount
    }
  }
}
