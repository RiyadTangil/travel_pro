import { startOfYear, endOfYear, eachQuarterOfInterval, format, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns"
import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Invoice } from "@/models/invoice"
import { MoneyReceipt } from "@/models/money-receipt"
import { Expense } from "@/models/expense"
import { VendorPayment } from "@/models/vendor-payment"
import { NonInvoiceIncome } from "@/models/non-invoice-income"
import { AirticketRefund } from "@/models/airticket-refund"
import { AdvanceReturn } from "@/models/advance-return"
import { InvoiceItem } from "@/models/invoice-item"

import { Account } from "@/models/account"
import { AccountType } from "@/models/account-type"
import { Client } from "@/models/client"
import { Employee } from "@/models/employee"

export async function getDashboardMetrics(period: "daily" | "monthly" | "yearly", companyId: string) {
  await connectMongoose()
  const companyObjectId = new Types.ObjectId(companyId)
  const now = new Date()

  let startDate: Date
  let endDate: Date

  if (period === "daily") {
    startDate = startOfDay(now)
    endDate = endOfDay(now)
  } else if (period === "monthly") {
    startDate = startOfMonth(now)
    endDate = endOfMonth(now)
  } else {
    startDate = startOfYear(now)
    endDate = endOfYear(now)
  }

  const baseMatch = { companyId: companyObjectId }
  const dateMatch = (field: string) => ({ [field]: { $gte: startDate, $lte: endDate } })

  // Define specific ranges for rankings (Monthly and Yearly)
  const monthlyStart = startOfMonth(now)
  const monthlyEnd = endOfMonth(now)
  const yearlyStart = startOfYear(now)
  const yearlyEnd = endOfYear(now)

  const rankMatch = (field: string, start: Date, end: Date) => ({
    [field]: { $gte: start, $lte: end },
    ...baseMatch,
    isDeleted: { $ne: true }
  })

  // Single large aggregation using $facet to reduce round-trips
  const [metrics] = await Invoice.aggregate([
    {
      $facet: {
        // Sales and Purchase (Period Specific)
        periodStats: [
          { $match: { ...baseMatch, isDeleted: { $ne: true }, ...dateMatch("salesDate") } },
          {
            $group: {
              _id: null,
              sales: { $sum: { $ifNull: ["$netTotal", { $ifNull: ["$billing.netTotal", 0] }] } },
              purchase: { $sum: { $ifNull: ["$billing.totalCost", 0] } },
              discount: { $sum: { $ifNull: ["$billing.discount", 0] } },
            },
          },
        ],
        // Global: Total Receivable
        totalReceivable: [
          { $match: { ...baseMatch, isDeleted: { $ne: true } } },
          {
            $group: {
              _id: null,
              total: { $sum: { $subtract: ["$netTotal", "$receivedAmount"] } }
            }
          }
        ],
        // Best Clients Monthly
        bestClientsMonthly: [
          { $match: rankMatch("salesDate", monthlyStart, monthlyEnd) },
          {
            $group: {
              _id: "$clientId",
              totalSales: { $sum: { $ifNull: ["$netTotal", { $ifNull: ["$billing.netTotal", 0] }] } }
            }
          },
          { $sort: { totalSales: -1 } },
          { $limit: 5 },
          { $lookup: { from: "clients", localField: "_id", foreignField: "_id", as: "client" } },
          { $unwind: "$client" },
          {
            $project: {
              id: "$_id",
              name: "$client.name",
              phone: "$client.phone",
              totalSales: 1,
              presentBalance: "$client.presentBalance"
            }
          }
        ],
        // Best Clients Yearly
        bestClientsYearly: [
          { $match: rankMatch("salesDate", yearlyStart, yearlyEnd) },
          {
            $group: {
              _id: "$clientId",
              totalSales: { $sum: { $ifNull: ["$netTotal", { $ifNull: ["$billing.netTotal", 0] }] } }
            }
          },
          { $sort: { totalSales: -1 } },
          { $limit: 5 },
          { $lookup: { from: "clients", localField: "_id", foreignField: "_id", as: "client" } },
          { $unwind: "$client" },
          {
            $project: {
              id: "$_id",
              name: "$client.name",
              phone: "$client.phone",
              totalSales: 1,
              presentBalance: "$client.presentBalance"
            }
          }
        ],
        // Best Employees Monthly
        bestEmployeesMonthly: [
          { $match: rankMatch("salesDate", monthlyStart, monthlyEnd) },
          {
            $group: {
              _id: "$employeeId",
              totalSales: { $sum: { $ifNull: ["$netTotal", { $ifNull: ["$billing.netTotal", 0] }] } }
            }
          },
          { $match: { _id: { $ne: null } } },
          { $sort: { totalSales: -1 } },
          { $limit: 5 },
          { $lookup: { from: "employees", localField: "_id", foreignField: "_id", as: "employee" } },
          { $unwind: "$employee" },
          {
            $project: {
              id: "$_id",
              name: "$employee.name",
              department: "$employee.department",
              totalSales: 1
            }
          }
        ],
        // Best Employees Yearly
        bestEmployeesYearly: [
          { $match: rankMatch("salesDate", yearlyStart, yearlyEnd) },
          {
            $group: {
              _id: "$employeeId",
              totalSales: { $sum: { $ifNull: ["$netTotal", { $ifNull: ["$billing.netTotal", 0] }] } }
            }
          },
          { $match: { _id: { $ne: null } } },
          { $sort: { totalSales: -1 } },
          { $limit: 5 },
          { $lookup: { from: "employees", localField: "_id", foreignField: "_id", as: "employee" } },
          { $unwind: "$employee" },
          {
            $project: {
              id: "$_id",
              name: "$employee.name",
              department: "$employee.department",
              totalSales: 1
            }
          }
        ]
      }
    }
  ])

  // Additional Parallel Queries for other collections (MoneyReceipt, Expense, etc.)
  const [
    receiptData,
    expenseData,
    vendorPaymentData,
    nonInvoiceIncomeData,
    refundData,
    advanceReturnData,
    totalAdvanceData,
    flightScheduleData,
    accountBalances
  ] = await Promise.all([
    MoneyReceipt.aggregate([
      { $match: { ...baseMatch, ...dateMatch("paymentDate") } },
      { $group: { _id: null, collection: { $sum: "$amount" }, discount: { $sum: "$discount" } } },
    ]),
    Expense.aggregate([
      { $match: { ...baseMatch, ...dateMatch("date") } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    VendorPayment.aggregate([
      { $match: { ...baseMatch, ...dateMatch("paymentDate") } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    NonInvoiceIncome.aggregate([
      { $match: { ...baseMatch, ...dateMatch("date") } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    AirticketRefund.aggregate([
      { $match: { ...baseMatch, isDeleted: { $ne: true }, ...dateMatch("refundDate") } },
      { $group: { _id: null, profit: { $sum: { $ifNull: ["$refundProfit", 0] } } } },
    ]),
    AdvanceReturn.aggregate([
      { $match: { ...baseMatch, ...dateMatch("returnDate") } },
      { $group: { _id: null, charges: { $sum: { $ifNull: ["$transactionCharge", 0] } } } },
    ]),
    MoneyReceipt.aggregate([
      { $match: { ...baseMatch, paymentTo: "advance" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    InvoiceItem.aggregate([
      { 
        $match: { 
          ...baseMatch, 
          itemType: "ticket", 
          isDeleted: { $ne: true },
          "ticketMetadata.journeyDate": { $gte: now.toISOString().slice(0, 10) }
        } 
      },
      {
        $lookup: { from: "invoices", localField: "invoiceId", foreignField: "_id", as: "invoice" }
      },
      { $unwind: "$invoice" },
      {
        $lookup: { from: "clients", localField: "invoice.clientId", foreignField: "_id", as: "client" }
      },
      { $unwind: "$client" },
      {
        $project: {
          id: "$_id",
          clientName: "$client.name",
          ticketNo: "$ticketMetadata.ticketNo",
          airline: "$ticketMetadata.airline",
          journeyDate: "$ticketMetadata.journeyDate"
        }
      },
      { $sort: { journeyDate: 1 } },
      { $limit: 5 }
    ]),
    Account.aggregate([
      { $match: { ...baseMatch } },
      {
        $lookup: {
          from: "account_types",
          localField: "accountTypeId",
          foreignField: "_id",
          as: "accountType"
        }
      },
      { $unwind: "$accountType" },
      {
        $group: {
          _id: "$accountType.name",
          totalBalance: { $sum: "$lastBalance" },
          accounts: {
            $push: {
              name: "$name",
              balance: "$lastBalance"
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ])

  const inv = metrics.periodStats[0] ?? { sales: 0, purchase: 0, discount: 0 }
  const rec = receiptData[0] ?? { collection: 0, discount: 0 }
  const exp = expenseData[0] ?? { total: 0 }
  const vp = vendorPaymentData[0] ?? { total: 0 }
  const nii = nonInvoiceIncomeData[0] ?? { total: 0 }
  const ref = refundData[0] ?? { profit: 0 }
  const adr = advanceReturnData[0] ?? { charges: 0 }

  return {
    salesAmount: Math.round(inv.sales),
    purchaseAmount: Math.round(inv.purchase),
    collectionAmount: Math.round(rec.collection),
    paymentAmount: Math.round(vp.total),
    discountAmount: Math.round(inv.discount + rec.discount),
    expenseAmount: Math.round(exp.total),
    profitLoss: Math.round(inv.sales - inv.purchase),
    totalReceivable: Math.round(metrics.totalReceivable[0]?.total || 0),
    totalAdvanceCollection: Math.round(totalAdvanceData[0]?.total || 0),
    flightSchedule: flightScheduleData,
    bestClientsMonthly: metrics.bestClientsMonthly,
    bestClientsYearly: metrics.bestClientsYearly,
    bestEmployeesMonthly: metrics.bestEmployeesMonthly,
    bestEmployeesYearly: metrics.bestEmployeesYearly,
    accountBalances: accountBalances
  }
}

export async function getDashboardYearlyStats(year: number, companyId: string) {
  await connectMongoose()
  const companyObjectId = new Types.ObjectId(companyId)

  const startDate = startOfYear(new Date(year, 0, 1))
  const endDate = endOfYear(new Date(year, 11, 31))

  const quarters = eachQuarterOfInterval({ start: startDate, end: endDate })

  const stats = await Promise.all(
    quarters.map(async (qDate, index) => {
      const qStart = startOfQuarter(qDate)
      const qEnd = endOfQuarter(qDate)

      const baseMatch = {
        companyId: companyObjectId,
      }

      const dateMatch = (field: string) => ({
        [field]: { $gte: qStart, $lte: qEnd },
      })

      const [
        invoiceData,
        receiptData,
        expenseData,
        vendorPaymentData,
        nonInvoiceIncomeData,
        refundData,
        advanceReturnData
      ] = await Promise.all([
        // Sales and Purchase Cost from Invoices
        Invoice.aggregate([
          { $match: { ...baseMatch, isDeleted: { $ne: true }, ...dateMatch("salesDate") } },
          {
            $group: {
              _id: null,
              sales: { $sum: { $ifNull: ["$netTotal", { $ifNull: ["$billing.netTotal", 0] }] } },
              purchase: { $sum: { $ifNull: ["$billing.totalCost", 0] } },
              serviceCharge: { $sum: { $ifNull: ["$billing.serviceCharge", 0] } },
              discount: { $sum: { $ifNull: ["$billing.discount", 0] } },
            },
          },
        ]),
        // Collection from Money Receipts
        MoneyReceipt.aggregate([
          { $match: { ...baseMatch, ...dateMatch("paymentDate") } },
          { $group: { _id: null, collection: { $sum: "$amount" }, discount: { $sum: "$discount" } } },
        ]),
        // Expenses
        Expense.aggregate([
          { $match: { ...baseMatch, ...dateMatch("date") } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        // AIT from Vendor Payments
        VendorPayment.aggregate([
          { $match: { ...baseMatch, ...dateMatch("paymentDate") } },
          { $group: { _id: null, ait: { $sum: { $ifNull: ["$vendorAit", 0] } } } },
        ]),
        // Non-Invoice Income
        NonInvoiceIncome.aggregate([
          { $match: { ...baseMatch, ...dateMatch("date") } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        // Refund Profit
        AirticketRefund.aggregate([
          { $match: { ...baseMatch, isDeleted: { $ne: true }, ...dateMatch("refundDate") } },
          { $group: { _id: null, profit: { $sum: { $ifNull: ["$refundProfit", 0] } } } },
        ]),
        // Transaction Charges from Advance Returns
        AdvanceReturn.aggregate([
          { $match: { ...baseMatch, ...dateMatch("returnDate") } },
          { $group: { _id: null, charges: { $sum: { $ifNull: ["$transactionCharge", 0] } } } },
        ])
      ])

      const inv = invoiceData[0] ?? { sales: 0, purchase: 0, serviceCharge: 0, discount: 0 }
      const rec = receiptData[0] ?? { collection: 0, discount: 0 }
      const exp = expenseData[0] ?? { total: 0 }
      const vp = vendorPaymentData[0] ?? { ait: 0 }
      const nii = nonInvoiceIncomeData[0] ?? { total: 0 }
      const ref = refundData[0] ?? { profit: 0 }
      const adr = advanceReturnData[0] ?? { charges: 0 }

      const totalIncome = inv.sales + inv.serviceCharge + nii.total + ref.profit
      const totalExpense = inv.purchase + exp.total + inv.discount + rec.discount + vp.ait + adr.charges
      const profit = totalIncome - totalExpense

      return {
        quarter: `Q${index + 1}`,
        Sales: Math.round(inv.sales),
        Purchases: Math.round(inv.purchase),
        Collection: Math.round(rec.collection),
        Profit: Math.round(inv.sales - inv.purchase),
      }
    })
  )

  return stats
}
