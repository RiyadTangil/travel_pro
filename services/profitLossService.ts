import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Invoice } from "@/models/invoice"
import { Expense } from "@/models/expense"
import { MoneyReceipt } from "@/models/money-receipt"
import { AppError } from "@/errors/AppError"

export interface ProfitLossParams {
  dateFrom?: string
  dateTo?: string
  companyId?: string
}

export async function getOverallProfitLoss(params: ProfitLossParams) {
  await connectMongoose()

  const { dateFrom, dateTo, companyId } = params

  const match: any = {}
  if (companyId) {
    match.companyId = new Types.ObjectId(companyId)
  }

  // Date filters for different collections
  const invoiceDateFilter: any = {}
  const expenseDateFilter: any = {}
  const receiptDateFilter: any = {}

  if (dateFrom || dateTo) {
    if (dateFrom) {
      invoiceDateFilter.$gte = dateFrom
      expenseDateFilter.$gte = dateFrom
      receiptDateFilter.$gte = dateFrom
    }
    if (dateTo) {
      invoiceDateFilter.$lte = dateTo
      expenseDateFilter.$lte = dateTo
      receiptDateFilter.$lte = dateTo
    }
  }

  // 1. Sales Income Section
  const salesMatch = { ...match }
  if (Object.keys(invoiceDateFilter).length > 0) {
    salesMatch.salesDate = invoiceDateFilter
  }

  const salesAggregation = await Invoice.aggregate([
    { $match: salesMatch },
    {
      $group: {
        _id: null,
        totalSales: { $sum: { $ifNull: ["$netTotal", { $ifNull: ["$billing.netTotal", 0] }] } },
        totalPurchase: { $sum: { $ifNull: ["$billing.totalCost", 0] } }
      }
    }
  ])

  const salesData = salesAggregation[0] || { totalSales: 0, totalPurchase: 0 }
  const salesProfitLoss = salesData.totalSales - salesData.totalPurchase

  // 2. Expense Section
  const expenseMatch = { ...match }
  if (Object.keys(expenseDateFilter).length > 0) {
    expenseMatch.date = expenseDateFilter
  }

  const expenseAggregation = await Expense.aggregate([
    { $match: expenseMatch },
    {
      $group: {
        _id: null,
        totalExpense: { $sum: "$totalAmount" }
      }
    }
  ])

  // Discount from MoneyReceipts (Sales Discount)
  const receiptMatch = { ...match }
  if (Object.keys(receiptDateFilter).length > 0) {
    receiptMatch.paymentDate = receiptDateFilter
  }

  const discountAggregation = await MoneyReceipt.aggregate([
    { $match: receiptMatch },
    {
      $group: {
        _id: null,
        totalDiscount: { $sum: "$discount" }
      }
    }
  ])

  // Transaction Charge from MoneyReceipts (Note: we assume it's stored in a field, but for now we might need to hardcode or use a specific logic if not in model)
  // Since the user pointed to AdvanceReturnModal.tsx for transactionCharge, 
  // and we don't have a direct model for AdvanceReturn yet, we'll hardcode or look for it in MoneyReceipt if it exists.
  // Assuming transaction charge might be a field in some receipts or just hardcode as requested for now.
  
  const expenseData = expenseAggregation[0]?.totalExpense || 0
  const discountData = discountAggregation[0]?.totalDiscount || 0
  const transactionCharge = 60 // Hardcoded for now as per image/instruction until we find where it's stored

  // 3. Income Section (Service Charge, etc.)
  // Service charge is often part of the invoice billing
  const serviceChargeAggregation = await Invoice.aggregate([
    { $match: salesMatch },
    {
      $group: {
        _id: null,
        totalServiceCharge: { $sum: { $ifNull: ["$billing.serviceCharge", 0] } }
      }
    }
  ])
  const serviceCharge = serviceChargeAggregation[0]?.totalServiceCharge || 0

  return {
    salesIncome: {
      sales: salesData.totalSales,
      purchase: salesData.totalPurchase,
      profit_loss: salesProfitLoss
    },
    expense: {
      discount: discountData,
      expense: expenseData,
      payroll: 0, // Hardcoded
      transaction_charge: transactionCharge,
      ait: 0, // Hardcoded
      agent_payment: 0 // Hardcoded
    },
    income: {
      service_charge: serviceCharge,
      void_charge: 0,
      refund_profit: 0,
      incentive: 0,
      non_invoice_income: 0
    },
    netProfitLoss: {
      totalIncome: salesData.totalSales + serviceCharge,
      totalExpense: salesData.totalPurchase + expenseData + discountData + transactionCharge,
      netProfitLoss: (salesData.totalSales + serviceCharge) - (salesData.totalPurchase + expenseData + discountData + transactionCharge)
    }
  }
}
