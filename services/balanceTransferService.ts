import { Types } from "mongoose"
import mongoose from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { BalanceTransfer } from "@/models/balance-transfer"
import { Account } from "@/models/account"
import { Counter } from "@/models/counter"
import { AppError } from "@/errors/AppError"

async function nextVoucher(prefix: string) {
  const key = `voucher_${prefix.toLowerCase()}`
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 }, $set: { updatedAt: new Date().toISOString() } },
    { new: true, upsert: true }
  ).lean()
  const seq = Number(doc?.seq || 1)
  const pad = (n: number) => n.toString().padStart(4, "0")
  return `${prefix}-${pad(seq)}`
}

export async function listBalanceTransfers({
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
      { note: { $regex: search, $options: "i" } }
    ]
  }

  if (dateFrom || dateTo) {
    filter.date = {}
    if (dateFrom) filter.date.$gte = dateFrom
    if (dateTo) filter.date.$lte = dateTo
  }

  const total = await BalanceTransfer.countDocuments(filter)
  const items = await BalanceTransfer.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .populate("transferFromId", "name")
    .populate("transferToId", "name")
    .lean()

  const mappedItems = items.map((i: any) => ({
    id: String(i._id),
    date: i.date,
    voucherNo: i.voucherNo,
    transferFromId: String(i.transferFromId?._id || i.transferFromId),
    transferFromName: i.transferFromId?.name || "Unknown",
    transferToId: String(i.transferToId?._id || i.transferToId),
    transferToName: i.transferToId?.name || "Unknown",
    amount: i.amount,
    transferCharge: i.transferCharge,
    totalAmount: (i.amount || 0) + (i.transferCharge || 0),
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

import { ClientTransaction } from "@/models/client-transaction"

// ... existing imports

export async function createBalanceTransfer(body: any, companyId?: string) {
  await connectMongoose()
  if (!companyId) throw new Error("Company ID required")

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const voucherNo = await nextVoucher("BT")
    
    const fromAcc = await Account.findById(body.transferFromId).session(session)
    const toAcc = await Account.findById(body.transferToId).session(session)

    if (!fromAcc) throw new AppError("Transfer From Account not found", 404)
    if (!toAcc) throw new AppError("Transfer To Account not found", 404)

    const amount = Number(body.amount)
    const charge = Number(body.transferCharge || 0)
    const totalAmount = amount + charge

    // Deduct from sender
    const updatedFrom = await Account.findByIdAndUpdate(
      body.transferFromId,
      { $inc: { lastBalance: -totalAmount }, $set: { updatedAt: new Date().toISOString() } },
      { session, new: true }
    )

    // Add to receiver (only amount, charge is consumed)
    const updatedTo = await Account.findByIdAndUpdate(
      body.transferToId,
      { $inc: { lastBalance: amount }, $set: { updatedAt: new Date().toISOString() } },
      { session, new: true }
    )

    const newItem = await BalanceTransfer.create([{
      ...body,
      companyId: new Types.ObjectId(companyId),
      // Removed name saving
      voucherNo,
      amount,
      transferCharge: charge,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }], { session })

    // Create Sender Transaction (Debit)
    await ClientTransaction.create([{
      date: body.date,
      voucherNo,
      companyId: new Types.ObjectId(companyId),
      invoiceType: "BALANCE_TRANSFER",
      paymentTypeId: new Types.ObjectId(body.transferFromId),
      accountName: fromAcc.name,
      amount: totalAmount,
      direction: "payout",
      lastTotalAmount: updatedFrom.lastBalance,
      note: body.note || "Balance Transfer (Out)",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }], { session })

    // Create Receiver Transaction (Credit)
    await ClientTransaction.create([{
      date: body.date,
      voucherNo,
      companyId: new Types.ObjectId(companyId),
      invoiceType: "BALANCE_TRANSFER",
      paymentTypeId: new Types.ObjectId(body.transferToId),
      accountName: toAcc.name,
      amount: amount,
      direction: "receiv",
      lastTotalAmount: updatedTo.lastBalance,
      note: body.note || "Balance Transfer (In)",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }], { session })

    await session.commitTransaction()
    return newItem[0]
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export async function updateBalanceTransfer(id: string, body: any, companyId?: string) {
  await connectMongoose()
  if (!companyId) throw new Error("Company ID required")

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const existing = await BalanceTransfer.findOne({ _id: id, companyId: new Types.ObjectId(companyId) }).session(session)
    if (!existing) throw new AppError("Balance Transfer not found", 404)

    // Revert old balances
    const oldAmount = existing.amount
    const oldCharge = existing.transferCharge || 0
    const oldTotal = oldAmount + oldCharge

    // Add back to old sender
    await Account.findByIdAndUpdate(
      existing.transferFromId,
      { $inc: { lastBalance: oldTotal } },
      { session }
    )

    // Deduct from old receiver
    await Account.findByIdAndUpdate(
      existing.transferToId,
      { $inc: { lastBalance: -oldAmount } },
      { session }
    )
    
    // Delete old transactions
    await ClientTransaction.deleteMany({ voucherNo: existing.voucherNo, companyId: new Types.ObjectId(companyId) }, { session })

    // Validate new accounts
    const fromAcc = await Account.findById(body.transferFromId).session(session)
    const toAcc = await Account.findById(body.transferToId).session(session)

    if (!fromAcc) throw new AppError("Transfer From Account not found", 404)
    if (!toAcc) throw new AppError("Transfer To Account not found", 404)

    // Apply new balances
    const newAmount = Number(body.amount)
    const newCharge = Number(body.transferCharge || 0)
    const newTotal = newAmount + newCharge

    // Deduct from new sender
    const updatedFrom = await Account.findByIdAndUpdate(
      body.transferFromId,
      { $inc: { lastBalance: -newTotal }, $set: { updatedAt: new Date().toISOString() } },
      { session, new: true }
    )

    // Add to new receiver
    const updatedTo = await Account.findByIdAndUpdate(
      body.transferToId,
      { $inc: { lastBalance: newAmount }, $set: { updatedAt: new Date().toISOString() } },
      { session, new: true }
    )

    // Update document
    existing.transferFromId = new Types.ObjectId(body.transferFromId)
    existing.transferToId = new Types.ObjectId(body.transferToId)
    // Removed name updates
    existing.amount = newAmount
    existing.transferCharge = newCharge
    existing.date = body.date
    existing.note = body.note
    existing.updatedAt = new Date().toISOString()

    await existing.save({ session })

    // Create Sender Transaction (Debit)
    await ClientTransaction.create([{
      date: body.date,
      voucherNo: existing.voucherNo,
      companyId: new Types.ObjectId(companyId),
      invoiceType: "BALANCE_TRANSFER",
      paymentTypeId: new Types.ObjectId(body.transferFromId),
      accountName: fromAcc.name,
      amount: newTotal,
      direction: "payout",
      lastTotalAmount: updatedFrom.lastBalance,
      note: body.note || "Balance Transfer (Out)",
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    }], { session })

    // Create Receiver Transaction (Credit)
    await ClientTransaction.create([{
      date: body.date,
      voucherNo: existing.voucherNo,
      companyId: new Types.ObjectId(companyId),
      invoiceType: "BALANCE_TRANSFER",
      paymentTypeId: new Types.ObjectId(body.transferToId),
      accountName: toAcc.name,
      amount: newAmount,
      direction: "receiv",
      lastTotalAmount: updatedTo.lastBalance,
      note: body.note || "Balance Transfer (In)",
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

export async function deleteBalanceTransfer(id: string, companyId?: string) {
  await connectMongoose()
  if (!companyId) throw new Error("Company ID required")

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const existing = await BalanceTransfer.findOne({ _id: id, companyId: new Types.ObjectId(companyId) }).session(session)
    if (!existing) throw new AppError("Balance Transfer not found", 404)

    // Revert balances
    const amount = existing.amount
    const charge = existing.transferCharge || 0
    const total = amount + charge

    // Add back to sender
    await Account.findByIdAndUpdate(
      existing.transferFromId,
      { $inc: { lastBalance: total } },
      { session }
    )

    // Deduct from receiver
    await Account.findByIdAndUpdate(
      existing.transferToId,
      { $inc: { lastBalance: -amount } },
      { session }
    )

    // Delete transactions
    const deletedTrx = await ClientTransaction.deleteMany({ voucherNo: existing.voucherNo, companyId: new Types.ObjectId(companyId) }, { session })
    if (deletedTrx.deletedCount === 0) {
       // Optional: Log warning or handle as needed, but strictly speaking, if we enforce data integrity,
       // we might expect transactions to exist. However, deleteMany returning 0 is not an error in Mongo.
       // If you explicitly want to FAIL if no transaction is found (strict mode), uncomment below:
       // throw new AppError("Associated transaction records not found", 404)
    }

    await BalanceTransfer.findByIdAndDelete(id, { session })

    await session.commitTransaction()
    return { success: true }
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}
