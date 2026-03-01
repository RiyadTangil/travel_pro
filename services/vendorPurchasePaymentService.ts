import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { InvoiceItem } from "@/models/invoice-item"
import { VendorPayment } from "@/models/vendor-payment"
import { Vendor } from "@/models/vendor"
import { Invoice } from "@/models/invoice"
import { AppError } from "@/errors/AppError"

export interface VendorPurchasePaymentParams {
  vendorId?: string
  dateFrom?: string
  dateTo?: string
  companyId?: string
}

export async function getVendorPurchasePaymentReport(params: VendorPurchasePaymentParams) {
  await connectMongoose()

  const {
    vendorId,
    dateFrom,
    dateTo,
    companyId
  } = params

  const match: any = {}
  if (companyId) {
    match.companyId = companyId
  }
  if (vendorId && Types.ObjectId.isValid(vendorId)) {
    match.vendorId = new Types.ObjectId(vendorId)
  }

  // 1. Fetch Ticket Purchases (InvoiceItems)
  // Join with Invoice to get salesDate and invoiceNo
  const purchasePipeline: any[] = [
    { $match: match },
    {
      $addFields: {
        invoiceObjectId: {
          $convert: {
            input: "$invoiceId",
            to: "objectId",
            onError: null,
            onNull: null
          }
        }
      }
    },
    {
      $lookup: {
        from: "invoices",
        localField: "invoiceObjectId",
        foreignField: "_id",
        as: "invoice"
      }
    },
    { $unwind: { path: "$invoice", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "vendors",
        localField: "vendorId",
        foreignField: "_id",
        as: "vendor"
      }
    },
    { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } }
  ]

  // Filter by date (using invoice salesDate)
  if (dateFrom || dateTo) {
    const dateFilter: any = {}
    if (dateFrom) dateFilter.$gte = dateFrom
    if (dateTo) dateFilter.$lte = dateTo
    purchasePipeline.push({ $match: { "invoice.salesDate": dateFilter } })
  }

  const purchaseItems = await InvoiceItem.aggregate([
    ...purchasePipeline,
    { $sort: { "invoice.salesDate": -1, createdAt: -1 } },
    {
      $project: {
        id: "$_id",
        salesDate: "$invoice.salesDate",
        invoiceNo: "$invoice.invoiceNo",
        invoiceId: "$invoice._id",
        ticketNo: "$description", // Often stored in description or product
        vendorName: "$vendor.name",
        purchaseAmount: "$totalCost"
      }
    }
  ])

  const totalPurchaseAmount = purchaseItems.reduce((sum, item) => sum + (item.purchaseAmount || 0), 0)

  // 2. Fetch Payment List (VendorPayments)
  const paymentMatch: any = {}
  if (companyId) {
    paymentMatch.companyId = new Types.ObjectId(companyId)
  }
  if (vendorId && Types.ObjectId.isValid(vendorId)) {
    paymentMatch.vendorId = new Types.ObjectId(vendorId)
  }
  if (dateFrom || dateTo) {
    paymentMatch.paymentDate = {}
    if (dateFrom) paymentMatch.paymentDate.$gte = dateFrom
    if (dateTo) paymentMatch.paymentDate.$lte = dateTo
  }

  const paymentItemsRaw = await VendorPayment.find(paymentMatch)
    .populate("invoiceId", "invoiceNo")
    .sort({ paymentDate: -1, createdAt: -1 })
    .lean()

  const paymentItems = paymentItemsRaw.map((vp: any) => ({
    id: String(vp._id),
    paymentDate: vp.paymentDate,
    vendorName: vp.vendorName || "",
    voucherNo: vp.voucherNo,
    invoiceNo: vp.invoiceId?.invoiceNo || "",
    cost: vp.vendorAit || 0, // AIT or other costs
    payment: vp.amount || 0
  }))

  const totalCostAmount = paymentItems.reduce((sum, item) => sum + item.cost, 0)
  const totalPaymentAmount = paymentItems.reduce((sum, item) => sum + item.payment, 0)

  return {
    purchases: {
      items: purchaseItems,
      total: totalPurchaseAmount
    },
    payments: {
      items: paymentItems,
      totalCost: totalCostAmount,
      totalPayment: totalPaymentAmount
    }
  }
}
