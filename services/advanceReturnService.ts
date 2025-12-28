import { Types } from "mongoose"
import mongoose from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { AppError } from "@/errors/AppError"
import { Client } from "@/models/client"
import { Account } from "@/models/account"
import { ClientTransaction } from "@/models/client-transaction"
import { Counter } from "@/models/counter"
import { AdvanceReturn } from "@/models/advance-return"

function parseNumber(n: any, def = 0): number { const x = Number(n); return isFinite(x) ? x : def }

async function nextVoucher() {
  const doc = await Counter.findOneAndUpdate(
    { key: "voucher_adr" },
    { $inc: { seq: 1 }, $set: { updatedAt: new Date().toISOString() } },
    { new: true, upsert: true }
  ).lean()
  const seq = Number(doc?.seq || 1)
  const pad = (n: number) => n.toString().padStart(4, "0")
  return `ADR-${pad(seq)}`
}

export async function listAdvanceReturns(params: { page?: number; pageSize?: number; search?: string; dateFrom?: string; dateTo?: string; clientId?: string; companyId?: string }) {
  await connectMongoose()
  const { page = 1, pageSize = 20, search = "", dateFrom, dateTo, clientId, companyId } = params || {}
  const filter: any = {}
  if (clientId && Types.ObjectId.isValid(clientId)) filter.clientId = new Types.ObjectId(clientId)
  if (companyId) {
    const cid = String(companyId)
    filter.$or = [
      ...(Types.ObjectId.isValid(cid) ? [{ companyId: new Types.ObjectId(cid) }] as any[] : []),
      { companyId: cid },
    ]
  }
  if (dateFrom || dateTo) {
    const d1 = dateFrom ? new Date(dateFrom).toISOString().slice(0, 10) : undefined
    const d2 = dateTo ? new Date(dateTo).toISOString().slice(0, 10) : undefined
    if (d1 && d2) filter.returnDate = { $gte: d1, $lte: d2 }
    else if (d1) filter.returnDate = { $gte: d1 }
    else if (d2) filter.returnDate = { $lte: d2 }
  }
  if (search) {
    const q = String(search).trim()
    filter.$or = [
      ...(filter.$or || []),
      { voucherNo: { $regex: q, $options: "i" } },
      { clientName: { $regex: q, $options: "i" } },
      { accountName: { $regex: q, $options: "i" } },
    ]
  }
  const total = await AdvanceReturn.countDocuments(filter)
  const docs = await AdvanceReturn.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean()
  const items = docs.map((r: any) => ({
    id: String(r._id),
    returnDate: r.returnDate || r.createdAt,
    voucherNo: r.voucherNo,
    clientName: r.clientName || "",
    paymentType: r.paymentMethod || "",
    paymentDetails: r.accountName || "",
    advanceAmount: Number(r.advanceAmount || 0),
    returnNote: r.note || "",
    transactionCharge: Number(r.transactionCharge || 0),
    receiptNo: r.receiptNo || "",

  }))
  return { items, pagination: { page, pageSize, total } }
}

export async function createAdvanceReturn(body: any, companyId?: string) {
  await connectMongoose()
  const now = new Date().toISOString()
  const session = await mongoose.startSession()
  try {
    const companyObjectId = companyId && Types.ObjectId.isValid(String(companyId)) ? new Types.ObjectId(String(companyId)) : undefined
    const perform = async (sess?: any) => {
      const clientIdStr = String(body.clientId || "").trim()
      if (!Types.ObjectId.isValid(clientIdStr)) throw new AppError("Client is required", 400)
      const clientId = new Types.ObjectId(clientIdStr)
      const clientDoc = await Client.findById(clientId).lean()
      if (!clientDoc) throw new AppError("Client not found", 404)

      const accountIdStr = String(body.accountId || "").trim()
      if (!Types.ObjectId.isValid(accountIdStr)) throw new AppError("Account is required", 400)
      const accountId = new Types.ObjectId(accountIdStr)
      const accDoc = await Account.findOne(companyObjectId ? { _id: accountId, companyId: companyObjectId } : { _id: accountId }).lean()
      if (!accDoc) throw new AppError("Account not found", 404)

      const amount = Math.max(0, parseNumber(body.advanceAmount ?? body.amount, 0))
      if (amount <= 0) throw new AppError("Amount must be positive", 400)

      const present = parseNumber(clientDoc.presentBalance, 0)
      if (present < amount - 0.0001) throw new AppError("Insufficient client advance balance", 400)

      const voucherNo = await nextVoucher()
      const paymentMethod = String(body.paymentMethod || "")
      const accountName = String(body.accountName || accDoc.name || "")
      const returnDate = String(body.returnDate || now.slice(0, 10))
      const note = String(body.returnNote || body.note || "")

      const newClientPresent = present - amount
      await Client.updateOne({ _id: clientId }, { $set: { presentBalance: newClientPresent, updatedAt: now } }, sess ? { session: sess } : undefined)

      const newAccountBalance = parseNumber(accDoc.lastBalance, 0) - amount
      await Account.updateOne({ _id: accountId }, { $set: { lastBalance: newAccountBalance, updatedAt: now, hasTrxn: true } }, sess ? { session: sess } : undefined)

      const doc: any = {
        clientId,
        clientName: clientDoc.name || "",
        companyId: companyObjectId,
        voucherNo,
        paymentMethod,
        accountId,
        accountName,
        advanceAmount: amount,
        returnDate,
        note,
        receiptNo: String(body.receiptNo || ""),
        transactionCharge: parseNumber(body.transactionCharge, 0),
        lastTotalAmount: newAccountBalance,
        createdAt: now,
        updatedAt: now,
      }
      const created = await new AdvanceReturn(doc).save(sess ? { session: sess } : undefined)

      const txn: any = {
        date: returnDate,
        voucherNo,
        clientId,
        clientName: clientDoc.name || "",
        companyId: companyObjectId,
        invoiceType: "Money Advance Return",
        paymentTypeId: accountId,
        accountName,
        payType: paymentMethod || undefined,
        amount,
        direction: "payout",
        lastTotalAmount: newAccountBalance,
        note,
        createdAt: now,
        updatedAt: now,
      }
      await new ClientTransaction(txn).save(sess ? { session: sess } : undefined)

      return {
        doc_id: String(created._id),
        receipt_vouchar_no: voucherNo,
        receipt_payment_date: returnDate,
        receipt_total_amount: amount.toFixed(2),
        present_balance: newClientPresent,
        account_name: accountName,
      }
    }
    let result: any
    await session.withTransaction(async () => { result = await perform(session) }, { writeConcern: { w: "majority" } })
    return { ok: true, created: result }
  } catch (err: any) {
    const status = typeof err?.statusCode === 'number' ? err.statusCode : (err?.name === 'ValidationError' ? 400 : 500)
    throw new AppError(err?.message || "Failed to create advance return", status)
  } finally {
    await session.endSession()
  }
}

export async function updateAdvanceReturn(id: string, body: any, companyId?: string) {
  await connectMongoose()
  const now = new Date().toISOString()
  const session = await mongoose.startSession()
  try {
    const idObj = new Types.ObjectId(String(id))
    const companyObjectId = companyId && Types.ObjectId.isValid(String(companyId)) ? new Types.ObjectId(String(companyId)) : undefined
    const perform = async (sess?: any) => {
      const doc = await AdvanceReturn.findById(idObj).lean()
      if (!doc) throw new AppError("Not found", 404)
      if (companyObjectId && String(doc.companyId || "") !== String(companyObjectId)) throw new AppError("Not found", 404)

      const clientId = new Types.ObjectId(String(doc.clientId))
      const clientDoc = await Client.findById(clientId).lean()
      if (!clientDoc) throw new AppError("Client not found", 404)

      const accountId = new Types.ObjectId(String(doc.accountId))
      const accDoc = await Account.findById(accountId).lean()
      if (!accDoc) throw new AppError("Account not found", 404)

      const oldAmount = parseNumber(doc.advanceAmount, 0)
      const newAmount = Math.max(0, parseNumber(body.advanceAmount ?? body.amount ?? oldAmount, oldAmount))
      const delta = newAmount - oldAmount
      const paymentMethod = String(body.paymentMethod ?? doc.paymentMethod ?? "")
      const accountName = String(body.accountName ?? doc.accountName ?? "")
      const returnDate = String(body.returnDate ?? doc.returnDate ?? now.slice(0, 10))
      const note = String(body.returnNote ?? body.note ?? doc.note ?? "")

      const present = parseNumber(clientDoc.presentBalance, 0)
      if (delta > 0 && present < delta - 0.0001) throw new AppError("Insufficient client advance balance", 400)

      const newClientPresent = present - delta
      await Client.updateOne({ _id: clientId }, { $set: { presentBalance: newClientPresent, updatedAt: now } }, sess ? { session: sess } : undefined)

      const newAccountBalance = parseNumber(accDoc.lastBalance, 0) - delta
      await Account.updateOne({ _id: accountId }, { $set: { lastBalance: newAccountBalance, updatedAt: now } }, sess ? { session: sess } : undefined)

      await AdvanceReturn.updateOne({ _id: idObj }, {
        $set: {
          paymentMethod,
          accountName,
          advanceAmount: newAmount,
          returnDate,
          note,
          updatedAt: now,
        }
      }, sess ? { session: sess } : undefined)

      await ClientTransaction.updateOne({ voucherNo: String(doc.voucherNo), clientId, direction: "payout" }, {
        $set: {
          date: returnDate,
          payType: paymentMethod || undefined,
          accountName,
          amount: newAmount,
          lastTotalAmount: newAccountBalance,
          note,
          updatedAt: now,
        }
      }, sess ? { session: sess } : undefined)

      return {
        receipt_vouchar_no: String(doc.voucherNo),
        receipt_total_amount: newAmount.toFixed(2),
        present_balance: newClientPresent,
        account_name: accountName,
      }
    }
    let result: any
    await session.withTransaction(async () => { result = await perform(session) }, { writeConcern: { w: "majority" } })
    return { ok: true, updated: result }
  } catch (err: any) {
    const status = typeof err?.statusCode === 'number' ? err.statusCode : 500
    throw new AppError(err?.message || "Failed to update advance return", status)
  } finally {
    await session.endSession()
  }
}

export async function deleteAdvanceReturn(id: string, companyId?: string) {
  await connectMongoose()
  const now = new Date().toISOString()
  const session = await mongoose.startSession()
  try {
    const idObj = new Types.ObjectId(String(id))
    const companyObjectId = companyId && Types.ObjectId.isValid(String(companyId)) ? new Types.ObjectId(String(companyId)) : undefined
    const perform = async (sess?: any) => {
      const doc = await AdvanceReturn.findById(idObj).lean()
      if (!doc) throw new AppError("Not found", 404)
      if (companyObjectId && String(doc.companyId || "") !== String(companyObjectId)) throw new AppError("Not found", 404)

      const clientId = new Types.ObjectId(String(doc.clientId))
      const clientDoc = await Client.findById(clientId).lean()
      if (!clientDoc) throw new AppError("Client not found", 404)
      const accountId = new Types.ObjectId(String(doc.accountId))
      const accDoc = await Account.findById(accountId).lean()
      if (!accDoc) throw new AppError("Account not found", 404)

      const amount = Math.max(0, parseNumber(doc.advanceAmount, 0))

      const newClientPresent = parseNumber(clientDoc.presentBalance, 0) + amount
      await Client.updateOne({ _id: clientId }, { $set: { presentBalance: newClientPresent, updatedAt: now } }, sess ? { session: sess } : undefined)

      const newAccountBalance = parseNumber(accDoc.lastBalance, 0) + amount
      await Account.updateOne({ _id: accountId }, { $set: { lastBalance: newAccountBalance, updatedAt: now } }, sess ? { session: sess } : undefined)

      await ClientTransaction.deleteOne({ voucherNo: String(doc.voucherNo), clientId, direction: "payout" }, sess ? { session: sess } : undefined)
      await AdvanceReturn.deleteOne({ _id: idObj }, sess ? { session: sess } : undefined)

      return { deleted_id: String(idObj), present_balance: newClientPresent }
    }
    let result: any
    await session.withTransaction(async () => { result = await perform(session) }, { writeConcern: { w: "majority" } })
    return { ok: true, deleted: result }
  } catch (err: any) {
    const status = typeof err?.statusCode === 'number' ? err.statusCode : 500
    throw new AppError(err?.message || "Failed to delete advance return", status)
  } finally {
    await session.endSession()
  }
}
