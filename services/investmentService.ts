import { Types } from "mongoose"
import mongoose from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Investment } from "@/models/investment"
import { Account } from "@/models/account"
import { Counter } from "@/models/counter"
import { ClientTransaction } from "@/models/client-transaction"
import { NonInvoiceCompany } from "@/models/non-invoice-company"

async function nextVoucher(companyId: string) {
  const key = `voucher_investment_${companyId}`
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 }, $set: { updatedAt: new Date().toISOString() } },
    { new: true, upsert: true }
  ).lean()
  const seq = Number(doc?.seq || 1)
  const pad = (n: number) => n.toString().padStart(4, "0")
  return `IVT-${pad(seq)}`
}

export async function listInvestments({
  page = 1,
  pageSize = 20,
  search = "",
  dateFrom,
  dateTo,
  companyId
}: {
  page?: number
  pageSize?: number
  search?: string
  dateFrom?: string
  dateTo?: string
  companyId?: string
}) {
  await connectMongoose()

  if (!companyId) throw new Error("Company ID required")

  const filter: any = { companyId: new Types.ObjectId(companyId) }

  if (search) {
    filter.$or = [
      { voucherNo: { $regex: search, $options: "i" } },
      { targetCompanyName: { $regex: search, $options: "i" } },
      { accountName: { $regex: search, $options: "i" } },
      { note: { $regex: search, $options: "i" } }
    ]
  }

  if (dateFrom || dateTo) {
    filter.date = {}
    if (dateFrom) filter.date.$gte = dateFrom
    if (dateTo) filter.date.$lte = dateTo
  }

  const total = await Investment.countDocuments(filter)
  const items = await Investment.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean()

  const mappedItems = items.map((i: any) => ({
    id: String(i._id),
    date: i.date,
    voucherNo: i.voucherNo,
    companyName: i.targetCompanyName,
    companyId: String(i.targetCompanyId),
    accountId: String(i.accountId),
    accountName: i.accountName,
    paymentMethod: i.paymentMethod,
    amount: i.amount,
    note: i.note,
    createdAt: i.createdAt
  }))

  return {
    items: mappedItems,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  }
}

export async function createInvestment(body: any, companyId?: string) {
  await connectMongoose()
  if (!companyId) throw new Error("Company ID required")

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const voucherNo = await nextVoucher(companyId)
    
    // Validate Account
    const acc = await Account.findById(body.accountId).session(session)
    if (!acc) throw new Error("Account not found")

    // Validate Target Company (NonInvoiceCompany as per example usage)
    // Assuming "Company" dropdown fetches from non-invoice-companies or similar
    // Based on frontend code, it fetches from /api/configuration/companies
    // which maps to NonInvoiceCompany in previous examples
    const nic = await NonInvoiceCompany.findById(body.companyId).session(session)
    const targetCompanyName = nic ? nic.name : "Unknown"

    const amount = Number(body.amount)

    // Update Account Balance (Increase for Investment?? Or Decrease?)
    // "Investment" typically means money going OUT from our account into an investment vehicle.
    // However, if it's "Income", it comes IN. 
    // The user compared it to "Non Invoice Income". 
    // BUT the image shows "Investment".
    // Usually Investment = Asset. Money goes OUT of Bank, INTO Investment.
    // Let's assume Payout (Debit) from Bank Account.
    
    const updatedAcc = await Account.findByIdAndUpdate(
      body.accountId,
      { $inc: { lastBalance: amount }, $set: { updatedAt: new Date().toISOString() } },
      { session, new: true }
    )

    // Create Investment Record
    const newItem = await Investment.create([{
      companyId: new Types.ObjectId(companyId),
      targetCompanyId: new Types.ObjectId(body.companyId),
      targetCompanyName,
      accountId: new Types.ObjectId(body.accountId),
      accountName: acc.name,
      paymentMethod: body.paymentMethod,
      amount,
      date: body.date,
      note: body.note,
      voucherNo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }], { session })

    // Create Client Transaction
    await ClientTransaction.create([{
      date: body.date,
      voucherNo,
      companyId: new Types.ObjectId(companyId),
      invoiceType: "INVESTMENT",
      paymentTypeId: new Types.ObjectId(body.accountId),
      accountName: acc.name,
      payType: body.paymentMethod,
      amount,
      direction: "receiv", // Money coming IN to the business as investment?? Or going OUT?
                           // If I am "Investing", money leaves my account. 
                           // But if I am "Receiving Investment", money comes in.
                           // Given the UI is similar to "Income", and user said "similar of non-invoice-income",
                           // I will assume it is RECEIVING money (Credit).
                           // Also `amount` was added to Account balance above.
      lastTotalAmount: updatedAcc.lastBalance,
      note: body.note || "Investment",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }], { session })

    await session.commitTransaction()
    return newItem[0]
  } catch (error: any) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export async function deleteInvestment(id: string, companyId?: string) {
  await connectMongoose()
  if (!companyId) throw new Error("Company ID required")

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const existing = await Investment.findOne({ _id: id, companyId: new Types.ObjectId(companyId) }).session(session)
    if (!existing) throw new Error("Investment not found")

    // Revert Account Balance
    await Account.findByIdAndUpdate(
      existing.accountId,
      { $inc: { lastBalance: -existing.amount } }, // Decrease if we increased before
      { session }
    )

    // Delete Transaction
    await ClientTransaction.deleteMany({ voucherNo: existing.voucherNo, companyId: new Types.ObjectId(companyId) }, { session })

    // Delete Investment
    await Investment.findByIdAndDelete(id, { session })

    await session.commitTransaction()
    return { success: true }
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export async function updateInvestment(id: string, body: any, companyId?: string) {
  await connectMongoose()
  if (!companyId) throw new Error("Company ID required")

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const existing = await Investment.findOne({ _id: id, companyId: new Types.ObjectId(companyId) }).session(session)
    if (!existing) throw new Error("Investment not found")

    // Revert old balance
    await Account.findByIdAndUpdate(
      existing.accountId,
      { $inc: { lastBalance: -existing.amount } },
      { session }
    )

    // Validate new data
    const acc = await Account.findById(body.accountId).session(session)
    if (!acc) throw new Error("Account not found")
    
    const nic = await NonInvoiceCompany.findById(body.companyId).session(session)
    const targetCompanyName = nic ? nic.name : "Unknown"
    const amount = Number(body.amount)

    // Apply new balance
    const updatedAcc = await Account.findByIdAndUpdate(
      body.accountId,
      { $inc: { lastBalance: amount }, $set: { updatedAt: new Date().toISOString() } },
      { session, new: true }
    )

    // Update Investment
    existing.targetCompanyId = new Types.ObjectId(body.companyId)
    existing.targetCompanyName = targetCompanyName
    existing.accountId = new Types.ObjectId(body.accountId)
    existing.accountName = acc.name
    existing.paymentMethod = body.paymentMethod
    existing.amount = amount
    existing.date = body.date
    existing.note = body.note
    existing.updatedAt = new Date().toISOString()
    await existing.save({ session })

    // Update Transaction (Delete & Create is safer/easier)
    await ClientTransaction.deleteMany({ voucherNo: existing.voucherNo, companyId: new Types.ObjectId(companyId) }, { session })

    await ClientTransaction.create([{
      date: body.date,
      voucherNo: existing.voucherNo,
      companyId: new Types.ObjectId(companyId),
      invoiceType: "INVESTMENT",
      paymentTypeId: new Types.ObjectId(body.accountId),
      accountName: acc.name,
      payType: body.paymentMethod,
      amount,
      direction: "receiv",
      lastTotalAmount: updatedAcc.lastBalance,
      note: body.note || "Investment",
      createdAt: existing.createdAt, 
      updatedAt: new Date().toISOString()
    }], { session })

    await session.commitTransaction()
    return existing
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}
