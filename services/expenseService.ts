import { Types } from "mongoose"
import mongoose from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { AppError } from "@/errors/AppError"
import { Account } from "@/models/account"
import { Counter } from "@/models/counter"
import { ClientTransaction } from "@/models/client-transaction"
import { Expense } from "@/models/expense"
import { ExpenseHead } from "@/models/expense-head"

function parseNumber(n: any, def = 0): number { const x = Number(n); return isFinite(x) ? x : def }

async function nextVoucher(prefix: "EX") {
  const key = "voucher_ex"
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 }, $set: { updatedAt: new Date().toISOString() } },
    { new: true, upsert: true }
  ).lean()
  const seq = Number(doc?.seq || 1)
  const pad = (n: number) => n.toString().padStart(4, "0")
  return `${prefix}-${pad(seq)}`
}

export async function createExpense(body: any, companyId?: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  const now = new Date().toISOString()

  const companyIdStr = companyId ? String(companyId) : (body.companyId || undefined)
  if (!companyIdStr || !Types.ObjectId.isValid(String(companyIdStr))) {
    throw new AppError("Company ID is required", 400)
  }
  const companyObjectId = new Types.ObjectId(String(companyIdStr))

  const date = String(body.date || now)
  const note = String(body.note || "")
  const paymentMethod = String(body.paymentMethod || "")
  const accountIdRaw = String(body.accountId || "").trim()

  if (!Types.ObjectId.isValid(accountIdRaw)) throw new AppError("Invalid accountId", 400)
  const accountId = new Types.ObjectId(accountIdRaw)

  // Validate Account
  const accountDoc = await Account.findOne({ _id: accountId, companyId: companyObjectId }).lean()
  if (!accountDoc) throw new AppError("Account not found", 404)
  const accountName = String(accountDoc.name || "")

  // Validate Items
  const itemsRaw = Array.isArray(body.items) ? body.items : []
  if (itemsRaw.length === 0) throw new AppError("At least one expense item is required", 400)

  const items: any[] = []
  let totalAmount = 0

  for (const item of itemsRaw) {
    const headIdRaw = String(item.headId || "").trim()
    if (!Types.ObjectId.isValid(headIdRaw)) throw new AppError("Invalid headId", 400)

    // Optional: Validate Head exists
    const headDoc = await ExpenseHead.findById(headIdRaw).lean()
    const headName = headDoc?.name || item.headName || "Unknown Head"

    const amount = parseNumber(item.amount, 0)
    if (amount <= 0) throw new AppError("Item amount must be positive", 400)

    totalAmount += amount
    items.push({
      headId: new Types.ObjectId(headIdRaw),
      headName,
      amount
    })
  }

  // Check Balance? (Optional, usually expenses can't exceed balance, but let's assume allowed or check)
  // For now, let's just proceed.

  const perform = async (sess?: any) => {
    const voucherNo = await nextVoucher("EX")

    // Create Expense
    const expenseDoc = {
      companyId: companyObjectId,
      voucherNo,
      date,
      accountId,
      accountName,
      paymentMethod,
      totalAmount,
      items,
      note,
      createdAt: now,
      updatedAt: now,
    }
    const createdExpense = await new Expense(expenseDoc).save(sess ? { session: sess } : undefined)

    // Update Account Balance (Decrease)
    const newAccountBalance = parseNumber(accountDoc.lastBalance, 0) - totalAmount
    await Account.updateOne(
      { _id: accountId },
      { $inc: { lastBalance: -totalAmount }, $set: { hasTrxn: true, updatedAt: now } },
      sess ? { session: sess } : undefined
    )

    // Create ClientTransaction (Payout)
    // Since this is an Expense, it doesn't have a Client.
    // We updated ClientTransaction schema to make clientId optional.
    const trxnDoc: any = {
      date,
      voucherNo,
      // clientId: undefined, 
      // clientName: undefined,
      companyId: companyObjectId,
      invoiceType: "EXPENSE",
      paymentTypeId: accountId,
      accountName,
      payType: paymentMethod || undefined,
      amount: totalAmount,
      direction: "payout",
      lastTotalAmount: newAccountBalance,
      note: note || "Expense",
      createdAt: now,
      updatedAt: now,
    }
    await new ClientTransaction(trxnDoc).save(sess ? { session: sess } : undefined)

    return createdExpense
  }

  try {
    let result: any
    await session.withTransaction(async () => {
      result = await perform(session)
    }, { writeConcern: { w: "majority" } })
    return { ok: true, created: result }
  } catch (err: any) {
    console.error("createExpense: transaction failed", err)
    const status = typeof err?.statusCode === 'number' ? err.statusCode : (err?.name === 'ValidationError' ? 400 : 500)
    throw new AppError(err?.message || "Failed to create expense", status)
  } finally {
    await session.endSession()
  }
}

export async function updateExpense(id: string, body: any, companyId?: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  const now = new Date().toISOString()

  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid expense ID", 400)

  const companyIdStr = companyId ? String(companyId) : (body.companyId || undefined)
  if (!companyIdStr || !Types.ObjectId.isValid(String(companyIdStr))) {
    throw new AppError("Company ID is required", 400)
  }
  const companyObjectId = new Types.ObjectId(String(companyIdStr))

  const perform = async (sess?: any) => {
    // 1. Fetch existing Expense
    const existing = await Expense.findOne({ _id: id, companyId: companyObjectId }).session(sess)
    if (!existing) throw new AppError("Expense not found", 404)

    // 2. Reverse effects of existing expense
    // 2a. Revert Account Balance (Add back totalAmount)
    await Account.updateOne(
      { _id: existing.accountId },
      { $inc: { lastBalance: existing.totalAmount } },
      { session: sess }
    )

    // 2b. Delete old Transaction
    await ClientTransaction.deleteOne({ voucherNo: existing.voucherNo }, { session: sess })

    // 3. Prepare new data
    const date = String(body.date || existing.date)
    const note = String(body.note !== undefined ? body.note : existing.note)
    const paymentMethod = String(body.paymentMethod || existing.paymentMethod)

    let accountId = existing.accountId
    let accountName = existing.accountName
    if (body.accountId && Types.ObjectId.isValid(body.accountId)) {
      accountId = new Types.ObjectId(body.accountId)
      const accDoc = await Account.findOne({ _id: accountId, companyId: companyObjectId }).session(sess)
      if (!accDoc) throw new AppError("New Account not found", 404)
      accountName = accDoc.name
    } else {
      // Reload account to get current name/balance if needed
      const accDoc = await Account.findOne({ _id: accountId }).session(sess)
      accountName = accDoc?.name || accountName
    }

    let items = existing.items
    let totalAmount = existing.totalAmount
    if (body.items && Array.isArray(body.items)) {
      items = []
      totalAmount = 0
      for (const item of body.items) {
        const headIdRaw = String(item.headId || "").trim()
        if (!Types.ObjectId.isValid(headIdRaw)) throw new AppError("Invalid headId", 400)

        const headDoc = await ExpenseHead.findById(headIdRaw).session(sess)
        const headName = headDoc?.name || item.headName || "Unknown Head"

        const amount = parseNumber(item.amount, 0)
        if (amount <= 0) throw new AppError("Item amount must be positive", 400)

        totalAmount += amount
        items.push({
          headId: new Types.ObjectId(headIdRaw),
          headName,
          amount
        })
      }
    }

    // 4. Update Expense Document
    existing.date = date
    existing.accountId = accountId
    existing.accountName = accountName
    existing.paymentMethod = paymentMethod
    existing.items = items
    existing.totalAmount = totalAmount
    existing.note = note
    existing.updatedAt = now
    await existing.save({ session: sess })

    // 5. Apply new effects
    // 5a. Deduct new totalAmount from (potentially new) Account
    const accForBal = await Account.findOneAndUpdate(
      { _id: accountId },
      { $inc: { lastBalance: -totalAmount }, $set: { updatedAt: now } },
      { new: true, session: sess }
    )

    // 5b. Create new Transaction
    const trxnDoc: any = {
      date,
      voucherNo: existing.voucherNo,
      // clientId: undefined,
      companyId: companyObjectId,
      invoiceType: "EXPENSE",
      paymentTypeId: accountId,
      accountName,
      payType: paymentMethod || undefined,
      amount: totalAmount,
      direction: "payout",
      lastTotalAmount: accForBal.lastBalance,
      note: note || "Expense",
      createdAt: existing.createdAt, // keep original creation date? or new? usually transaction log keeps creation date
      updatedAt: now,
    }
    await new ClientTransaction(trxnDoc).save({ session: sess })

    return existing
  }

  try {
    let result: any
    await session.withTransaction(async () => {
      result = await perform(session)
    }, { writeConcern: { w: "majority" } })
    return { ok: true, updated: result }
  } catch (err: any) {
    console.error("updateExpense: transaction failed", err)
    const status = typeof err?.statusCode === 'number' ? err.statusCode : (err?.name === 'ValidationError' ? 400 : 500)
    throw new AppError(err?.message || "Failed to update expense", status)
  } finally {
    await session.endSession()
  }
}

export async function deleteExpense(id: string, companyId?: string) {
  await connectMongoose()
  const session = await mongoose.startSession()

  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid expense ID", 400)

  const companyIdStr = companyId
  if (!companyIdStr || !Types.ObjectId.isValid(String(companyIdStr))) {
    throw new AppError("Company ID is required", 400)
  }
  const companyObjectId = new Types.ObjectId(String(companyIdStr))

  const perform = async (sess?: any) => {
    const existing = await Expense.findOne({ _id: id, companyId: companyObjectId }).session(sess)
    if (!existing) throw new AppError("Expense not found", 404)

    // Revert Account Balance
    await Account.updateOne(
      { _id: existing.accountId },
      { $inc: { lastBalance: existing.totalAmount } },
      { session: sess }
    )

    // Delete Transaction
    await ClientTransaction.deleteOne({ voucherNo: existing.voucherNo }, { session: sess })

    // Delete Expense
    await Expense.deleteOne({ _id: id }, { session: sess })

    return true
  }

  try {
    await session.withTransaction(async () => {
      await perform(session)
    }, { writeConcern: { w: "majority" } })
    return { ok: true }
  } catch (err: any) {
    console.error("deleteExpense: transaction failed", err)
    const status = typeof err?.statusCode === 'number' ? err.statusCode : (err?.name === 'ValidationError' ? 400 : 500)
    throw new AppError(err?.message || "Failed to delete expense", status)
  } finally {
    await session.endSession()
  }
}

export async function listExpenses(params: { page?: number; pageSize?: number; companyId?: string; search?: string; dateFrom?: string; dateTo?: string }) {
  await connectMongoose()
  const { page = 1, pageSize = 20, companyId, search, dateFrom, dateTo } = params || {}

  const filter: any = {}
  if (companyId && Types.ObjectId.isValid(companyId)) {
    filter.companyId = new Types.ObjectId(companyId)
  }

  if (search) {
    const regex = { $regex: search, $options: "i" }
    filter.$or = [
      { voucherNo: regex },
      { accountName: regex },
      { note: regex },
      { "items.headName": regex }
    ]
  }

  if (dateFrom || dateTo) {
    filter.date = {}
    if (dateFrom) filter.date.$gte = dateFrom
    if (dateTo) filter.date.$lte = dateTo
  }

  const total = await Expense.countDocuments(filter)
  const docs = await Expense.find(filter)
    .populate("accountId")
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean()

  const items = docs.map((d: any) => ({
    id: String(d._id),
    voucherNo: d.voucherNo,
    date: d.date,
    accountName: d.accountId.name,
    accountInfo: d.accountId,
    accountId: String(d.accountId._id),
    totalAmount: d.totalAmount,
    paymentMethod: d.accountId.type,
    note: d.note,
    items: d.items.map((i: any) => ({
      headId: String(i.headId),
      headName: i.headName,
      amount: i.amount
    }))
  }))

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  }
}
