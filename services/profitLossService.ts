import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Invoice } from "@/models/invoice"
import { Expense } from "@/models/expense"
import { MoneyReceipt } from "@/models/money-receipt"
import { NonInvoiceIncome } from "@/models/non-invoice-income"
import { VendorPayment } from "@/models/vendor-payment"
import { AppError } from "@/errors/AppError"

export interface ProfitLossParams {
  dateFrom?: string
  dateTo?: string
  companyId?: string
}

export async function getOverallProfitLoss(params: ProfitLossParams) {
  await connectMongoose()

  const { dateFrom, dateTo, companyId } = params

  const baseMatch: any = {}
  if (companyId) baseMatch.companyId = new Types.ObjectId(companyId)

  // Build date filters per collection (each uses a different field name)
  function makeDateFilter(field: string, from?: string, to?: string) {
    if (!from && !to) return {}
    const range: any = {}
    if (from) range.$gte = from
    if (to) range.$lte = to
    return { [field]: range }
  }

  const invoiceMatch = { ...baseMatch, isDeleted: { $ne: true }, ...makeDateFilter("salesDate", dateFrom, dateTo) }
  const expenseMatch = { ...baseMatch, ...makeDateFilter("date", dateFrom, dateTo) }
  const receiptMatch = { ...baseMatch, ...makeDateFilter("paymentDate", dateFrom, dateTo) }
  const nonInvIncomeMatch = { ...baseMatch, ...makeDateFilter("date", dateFrom, dateTo) }
  const vendorPaymentMatch = { ...baseMatch, ...makeDateFilter("paymentDate", dateFrom, dateTo) }

  // Run all aggregations in parallel — single DB round-trip per collection
  const [
    invoiceResult,
    expenseResult,
    discountResult,
    nonInvoiceIncomeResult,
    aitResult,
  ] = await Promise.all([
    // 1. Invoice: sales, purchase cost, service charge, agent commission — all in one $group
    Invoice.aggregate([
      { $match: invoiceMatch },
      {
        $group: {
          _id: null,
          totalSales: { $sum: { $ifNull: ["$netTotal", { $ifNull: ["$billing.netTotal", 0] }] } },
          totalPurchase: { $sum: { $ifNull: ["$billing.totalCost", 0] } },
          totalServiceCharge: { $sum: { $ifNull: ["$billing.serviceCharge", 0] } },
          totalAgentCommission: { $sum: { $ifNull: ["$agentCommission", 0] } },
        }
      }
    ]),

    // 2. Operating expenses
    Expense.aggregate([
      { $match: expenseMatch },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]),

    // 3. Sales discount given (recorded on money receipts)
    MoneyReceipt.aggregate([
      { $match: receiptMatch },
      { $group: { _id: null, total: { $sum: "$discount" } } }
    ]),

    // 4. Non-invoice income (direct income not linked to an invoice)
    NonInvoiceIncome.aggregate([
      { $match: nonInvIncomeMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),

    // 5. AIT (Air Income Tax) deducted from vendor payments
    VendorPayment.aggregate([
      { $match: vendorPaymentMatch },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$vendorAit", 0] } } } }
    ]),
  ])

  const inv = invoiceResult[0] ?? { totalSales: 0, totalPurchase: 0, totalServiceCharge: 0, totalAgentCommission: 0 }
  const totalSales = Number(inv.totalSales) || 0
  const totalPurchase = Number(inv.totalPurchase) || 0
  const serviceCharge = Number(inv.totalServiceCharge) || 0
  const agentCommission = Number(inv.totalAgentCommission) || 0

  const totalExpense = Number(expenseResult[0]?.total) || 0
  const totalDiscount = Number(discountResult[0]?.total) || 0
  const nonInvoiceIncome = Number(nonInvoiceIncomeResult[0]?.total) || 0
  const ait = Number(aitResult[0]?.total) || 0

  const salesProfitLoss = totalSales - totalPurchase

  // Total income = all revenue streams
  const totalIncome = totalSales + serviceCharge + nonInvoiceIncome
  // Total expense = cost of goods + all operating costs
  const totalCost = totalPurchase + totalExpense + totalDiscount + ait + agentCommission
  const netProfitLoss = totalIncome - totalCost

  return {
    salesIncome: {
      sales: totalSales,
      purchase: totalPurchase,
      profit_loss: salesProfitLoss,
    },
    expense: {
      discount: totalDiscount,
      expense: totalExpense,
      payroll: 0,           // No payroll model yet
      transaction_charge: 0, // No transaction charge model yet
      ait,
      agent_payment: agentCommission,
    },
    income: {
      service_charge: serviceCharge,
      void_charge: 0,        // No void charge model yet
      refund_profit: 0,      // No refund profit model yet
      incentive: 0,          // No incentive model yet
      non_invoice_income: nonInvoiceIncome,
    },
    netProfitLoss: {
      totalIncome,
      totalExpense: totalCost,
      netProfitLoss,
    },
  }
}
