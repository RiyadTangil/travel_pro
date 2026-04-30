import { startOfYear, endOfYear, eachQuarterOfInterval, format, startOfQuarter, endOfQuarter } from "date-fns"
import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Invoice } from "@/models/invoice"
import { MoneyReceipt } from "@/models/money-receipt"
import { Expense } from "@/models/expense"
import { VendorPayment } from "@/models/vendor-payment"
import { NonInvoiceIncome } from "@/models/non-invoice-income"
import { AirticketRefund } from "@/models/airticket-refund"
import { AdvanceReturn } from "@/models/advance-return"

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
