import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { InvoiceItem } from "@/models/invoice-item"
import { AppError } from "@/errors/AppError"

export interface ItemSalesmanParams {
  employeeId?: string
  productName?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  companyId?: string
}

export async function getItemSalesmanReport(params: ItemSalesmanParams) {
  await connectMongoose()

  const {
    employeeId,
    productName,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 20,
    companyId
  } = params

  const match: any = {}

  if (companyId) {
    match.companyId = companyId // Stored as string in InvoiceItem
  }

  if (productName && productName !== "All") {
    match.product = productName
  }

  // To filter by employeeId and date, we need to look at the parent Invoice
  // We'll use aggregation to join InvoiceItem with Invoice
  
  const pipeline: any[] = [
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
    { $unwind: "$invoice" }
  ]

  // Add filters based on Invoice fields
  const invoiceMatch: any = {}
  if (employeeId) {
    invoiceMatch["invoice.employeeId"] = new Types.ObjectId(employeeId)
  }
  if (dateFrom || dateTo) {
    invoiceMatch["invoice.salesDate"] = {}
    if (dateFrom) invoiceMatch["invoice.salesDate"].$gte = dateFrom
    if (dateTo) invoiceMatch["invoice.salesDate"].$lte = dateTo
  }

  if (Object.keys(invoiceMatch).length > 0) {
    pipeline.push({ $match: invoiceMatch })
  }

  // Add sorting and pagination
  const skip = (page - 1) * pageSize

  const [results] = await InvoiceItem.aggregate([
    ...pipeline,
    {
      $facet: {
        items: [
          { $sort: { "invoice.salesDate": -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: pageSize },
          {
            $project: {
              id: "$_id",
              salesDate: "$invoice.salesDate",
              invoiceNo: "$invoice.invoiceNo",
              invoiceId: "$invoice._id",
              productName: "$product",
              clientName: "$invoice.clientName",
              clientId: "$invoice.clientId",
              salesBy: "$invoice.salesByName",
              salesAmount: "$totalSales"
            }
          }
        ],
        totalCount: [
          { $count: "count" }
        ],
        totals: [
          {
            $group: {
              _id: null,
              totalSalesAmount: { $sum: "$totalSales" }
            }
          }
        ]
      }
    }
  ])

  const items = results.items || []
  const total = results.totalCount[0]?.count || 0
  const totalSalesAmount = results.totals[0]?.totalSalesAmount || 0

  return {
    items,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    },
    totals: {
      salesAmount: totalSalesAmount
    }
  }
}
