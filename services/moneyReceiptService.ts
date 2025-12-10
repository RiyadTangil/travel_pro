import { Types } from "mongoose"
import mongoose from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { AppError } from "@/errors/AppError"
import { Client } from "@/models/client"
import { Invoice } from "@/models/invoice"
import { Counter } from "@/models/counter"
import { MoneyReceipt } from "@/models/money-receipt"
import { ClientTransaction } from "@/models/client-transaction"
import { Account } from "@/models/account"

function parseNumber(n: any, def = 0): number { const x = Number(n); return isFinite(x) ? x : def }

async function nextVoucher(prefix: "MR" | "EX") {
  const key = prefix === "MR" ? "voucher_mr" : "voucher_ex"
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 }, $set: { updatedAt: new Date().toISOString() } },
    { new: true, upsert: true }
  ).lean()
  const seq = Number(doc?.seq || 1)
  const pad = (n: number) => n.toString().padStart(4, "0")
  return `${prefix}-${pad(seq)}`
}

export async function createMoneyReceipt(body: any, companyId?: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  const now = new Date().toISOString()

  const clientIdRaw = String(body.clientId || body.client_id || "").trim()
  if (!Types.ObjectId.isValid(clientIdRaw)) throw new AppError("Invalid clientId", 400)
  const clientId = new Types.ObjectId(clientIdRaw)

  const paymentTo = String(body.paymentTo || body.receipt_payment_to || "").toLowerCase()
  const invoiceIdRaw = String(body.invoiceId || body.invoice_id || "").trim()
  const invoiceId = Types.ObjectId.isValid(invoiceIdRaw) ? new Types.ObjectId(invoiceIdRaw) : undefined

  const amount = parseNumber(body.amount ?? body.receipt_total_amount, 0)
  const discount = parseNumber(body.discount ?? body.receipt_discount_amount, 0)
  const paidAmount = Math.max(0, amount - discount)
  if (paidAmount <= 0) throw new AppError("Paid amount must be positive", 400)

  const paymentDate = String(body.paymentDate || body.receipt_payment_date || now)
  const manualReceiptNo = String(body.manualReceiptNo || body.receipt_money_receipt_no || "").trim() || undefined
  const paymentMethod = String(body.paymentMethod || body.acctype_name || body.receipt_payment_method || "")
  const accountIdRaw = String(body.accountId || body.receipt_account_id || body.payment_type_id || "").trim()
  if (!Types.ObjectId.isValid(accountIdRaw)) throw new AppError("Invalid accountId", 400)
  const accId = new Types.ObjectId(accountIdRaw)
  const note = String(body.note || body.receipt_note || "")
  const docOneName = String(body.docOneName || body.receipt_scan_copy || "")
  const docTwoName = String(body.docTwoName || body.receipt_scan_copy2 || "")
  const companyIdStr = companyId ? String(companyId) : (body.companyId || body.company_id || undefined)
  if (!companyIdStr || !Types.ObjectId.isValid(String(companyIdStr))) {
    throw new AppError("Company ID is required", 400)
  }
  const companyObjectId = new Types.ObjectId(String(companyIdStr))
  const accountDoc = await Account.findOne({ _id: accId, companyId: companyObjectId }).lean()
  if (!accountDoc) throw new AppError("Account not found", 404)
  const accountName = String(body.accountName || body.cheque_or_bank_name || body.account_name || accountDoc?.name || "")
  

  // Validate client
  const clientDoc = await Client.findById(clientId).lean()
  if (!clientDoc) throw new AppError("Client not found", 404)

  // If invoice selected, validate and compute constraints
  let invDoc: any = null
  if (invoiceId) {
    invDoc = await Invoice.findById(invoiceId).lean()
    if (!invDoc) throw new AppError("Invoice not found", 404)
    if (String(invDoc.clientId || "") !== String(clientId)) throw new AppError("Invoice does not belong to client", 400)
    const due = Math.max(0, parseNumber(invDoc.netTotal, 0) - parseNumber(invDoc.receivedAmount, 0))
    if (paidAmount > due + 0.0001) throw new AppError("Paid amount exceeds invoice due", 400)
  }

  const perform = async (sess?: any) => {
    const voucherNo = await nextVoucher("MR")

    // Create Money Receipt
    const mrDoc: any = {
      clientId,
      clientName: clientDoc.name || "",
      companyId: companyObjectId,
      invoiceId,
      voucherNo,
      paymentTo,
      paymentMethod,
      accountId: accId,
      accountName,
      manualReceiptNo,
      amount,
      discount,
      paymentDate,
      note,
      docOneName,
      docTwoName,
      createdAt: now,
      updatedAt: now,
    }
    // Ensure money receipt creation is part of the transaction session
    const createdMr = await new MoneyReceipt(mrDoc).save(sess ? { session: sess } : undefined)

    // Update Client presentBalance (reduce due by paid)
    await Client.updateOne(
      { _id: clientId },
      { $set: { presentBalance: parseNumber(clientDoc.presentBalance, 0) + paidAmount, updatedAt: now } },
      sess ? { session: sess } : undefined
    )

    // If invoice-specific receipt, update the invoice
    let newReceived = undefined as number | undefined
    let newStatus = undefined as string | undefined
    if (invDoc) {
      const oldReceived = parseNumber(invDoc.receivedAmount, 0)
      const net = parseNumber(invDoc.netTotal, 0)
      newReceived = oldReceived + paidAmount
      newStatus = newReceived >= net ? "paid" : newReceived > 0 ? "partial" : "due"
      await Invoice.updateOne(
        { _id: invoiceId },
        { $set: { receivedAmount: newReceived, status: newStatus, updatedAt: now } },
        sess ? { session: sess } : undefined
      )
    }

    // Create Client Transaction (receive)
    const trxnDoc: any = {
      date: paymentDate,
      voucherNo,
      clientId,
      clientName: clientDoc.name || "",
      companyId: companyObjectId,
      invoiceType: paymentTo?.toUpperCase?.() || "OVERALL",
      paymentTypeId: accId,
      accountName,
      payType: paymentMethod || undefined,
      amount: paidAmount,
      direction: "receive",
      relatedInvoiceId: invoiceId,
      note: note || undefined,
      createdAt: now,
      updatedAt: now,
    }
    // Ensure client transaction creation is part of the transaction session
    await new ClientTransaction(trxnDoc).save(sess ? { session: sess } : undefined)
    // Mark account as having transactions
    // Update account balance and mark it as having transactions
    await Account.updateOne(
      { _id: accId, companyId: companyObjectId },
      { $inc: { lastBalance: paidAmount }, $set: { hasTrxn: true, updatedAt: now } },
      sess ? { session: sess } : undefined
    )

    const response = {
      doc_id: String(createdMr._id),
      receipt_id: Number(String(createdMr._id).slice(-6)),
      receipt_account_id: String(accId),
      receipt_vouchar_no: voucherNo,
      receipt_payment_to: paymentTo?.toUpperCase?.() || (invoiceId ? "INVOICE" : "OVERALL"),
      receipt_note: note || null,
      receipt_total_amount: paidAmount.toFixed(2),
      receipt_money_receipt_no: manualReceiptNo || null,
      acctype_name: paymentMethod || null,
      receipt_payment_date: paymentDate,
      account_name: accountName || null,
      cheque_status: null,
      receipt_scan_copy: docOneName || null,
      receipt_scan_copy2: docTwoName || null,
      client_name: clientDoc.name || "",
      cheque_or_bank_name: accountName || null,
      // enrich for UI convenience
      invoice_id: invoiceId ? String(invoiceId) : undefined,
      invoice_received_amount: typeof newReceived === 'number' ? newReceived : undefined,
      invoice_status: newStatus,
      present_balance: parseNumber(clientDoc.presentBalance, 0) + paidAmount,
    }

    return response
  }

  try {
    let result: any
    await session.withTransaction(async () => {
      result = await perform(session)
    }, { writeConcern: { w: "majority" } })
    return { ok: true, created: result }
  } catch (err: any) {
    console.error("createMoneyReceipt: transaction failed", err)
    const status = typeof err?.statusCode === 'number' ? err.statusCode : (err?.name === 'ValidationError' ? 400 : 500)
    throw new AppError(err?.message || "Failed to create money receipt", status)
  } finally {
    await session.endSession()
  }
}

export async function listMoneyReceipts(params: { page?: number; pageSize?: number; clientId?: string; companyId?: string }) {
  await connectMongoose()
  const { page = 1, pageSize = 20, clientId, companyId } = params || {}
  const filter: any = {}
  if (clientId && Types.ObjectId.isValid(clientId)) filter.clientId = new Types.ObjectId(clientId)
  if (companyId) {
    const cid = String(companyId)
    filter.$or = [
      ...(Types.ObjectId.isValid(cid) ? [{ companyId: new Types.ObjectId(cid) }] as any[] : []),
      { companyId: cid },
    ]
  }
  const total = await MoneyReceipt.countDocuments(filter)
  const docs = await MoneyReceipt.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean()
  const items = docs.map((r: any) => ({
    id: String(r._id),
    receipt_id: Number(String(r._id).slice(-6)),
    receipt_account_id: r.accountId || null,
    client_id: r.clientId ? String(r.clientId) : null,
    receipt_vouchar_no: r.voucherNo,
    receipt_payment_to: String(r.paymentTo || "overall").toUpperCase(),
    receipt_note: r.note || null,
    receipt_total_amount: Number(parseNumber(r.amount, 0) - parseNumber(r.discount, 0)).toFixed(2),
    receipt_money_receipt_no: r.manualReceiptNo || null,
    acctype_name: r.paymentMethod || null,
    receipt_payment_date: r.paymentDate || r.createdAt,
    account_name: r.accountName || null,
    cheque_status: r.chequeStatus || null,
    receipt_scan_copy: r.docOneName || null,
    receipt_scan_copy2: r.docTwoName || null,
    client_name: r.clientName || "",
    cheque_or_bank_name: r.accountName || null,
  }))
  return { items, pagination: { page, pageSize, total } }
}

export async function updateMoneyReceipt(id: string, body: any, companyId?: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  const now = new Date().toISOString()
  if (!Types.ObjectId.isValid(String(id))) throw new AppError("Invalid id", 400)
  const idObj = new Types.ObjectId(String(id))
  if (!companyId || !Types.ObjectId.isValid(String(companyId))) throw new AppError("Company ID is required", 400)
  const companyObjectId = new Types.ObjectId(String(companyId))

  const perform = async (sess?: any) => {
    const mr = await MoneyReceipt.findById(idObj).lean()
    if (!mr) throw new AppError("Receipt not found", 404)
    if (String(mr.companyId || "") !== String(companyObjectId)) throw new AppError("Not found", 404)

    const clientId = new Types.ObjectId(String(mr.clientId))
    const clientDoc = await Client.findById(clientId).lean()
    if (!clientDoc) throw new AppError("Client not found", 404)

    const oldAmount = parseNumber(mr.amount, 0)
    const oldDiscount = parseNumber(mr.discount, 0)
    const oldPaid = Math.max(0, oldAmount - oldDiscount)

    const amount = parseNumber(body.amount ?? mr.amount, 0)
    const discount = parseNumber(body.discount ?? mr.discount, 0)
    const newPaid = Math.max(0, amount - discount)
    if (newPaid <= 0) throw new AppError("Paid amount must be positive", 400)
    const deltaPaid = newPaid - oldPaid

    const paymentDate = String(body.paymentDate ?? mr.paymentDate ?? now)
    const paymentMethod = String(body.paymentMethod ?? mr.paymentMethod ?? "")
    const accountIdRaw = String(body.accountId ?? mr.accountId ?? "").trim()
    if (!Types.ObjectId.isValid(accountIdRaw)) throw new AppError("Invalid accountId", 400)
    const accId = new Types.ObjectId(accountIdRaw)
    const accountDoc = await Account.findOne({ _id: accId, companyId: companyObjectId }).lean()
    if (!accountDoc) throw new AppError("Account not found", 404)
    const accountName = String(body.accountName ?? mr.accountName ?? accountDoc?.name ?? "")
    const note = String(body.note ?? mr.note ?? "")

    // If invoice is linked, adjust receivedAmount
    let newReceived: number | undefined = undefined
    let newStatus: string | undefined = undefined
    if (mr.invoiceId) {
      const invDoc = await Invoice.findById(mr.invoiceId).lean()
      if (!invDoc) throw new AppError("Invoice not found", 404)
      const net = parseNumber(invDoc.netTotal, 0)
      const currentReceived = parseNumber(invDoc.receivedAmount, 0)
      newReceived = currentReceived + deltaPaid
      if (newReceived > net + 0.0001) throw new AppError("Paid amount exceeds invoice due", 400)
      newStatus = newReceived >= net ? "paid" : newReceived > 0 ? "partial" : "due"
      await Invoice.updateOne({ _id: mr.invoiceId }, { $set: { receivedAmount: newReceived, status: newStatus, updatedAt: now } }, sess ? { session: sess } : undefined)
    }

    // Update Client present balance by delta
    const newClientPresent = parseNumber(clientDoc.presentBalance, 0) + deltaPaid
    await Client.updateOne({ _id: clientId }, { $set: { presentBalance: newClientPresent, updatedAt: now } }, sess ? { session: sess } : undefined)

    // Adjust account balances
    const oldAccId = new Types.ObjectId(String(mr.accountId))
    if (String(oldAccId) === String(accId)) {
      // Same account: apply delta
      await Account.updateOne(
        { _id: accId, companyId: companyObjectId },
        { $inc: { lastBalance: deltaPaid }, $set: { hasTrxn: true, updatedAt: now } },
        sess ? { session: sess } : undefined
      )
    } else {
      // Different accounts: reverse old, apply new
      await Account.updateOne(
        { _id: oldAccId, companyId: companyObjectId },
        { $inc: { lastBalance: -oldPaid }, $set: { updatedAt: now } },
        sess ? { session: sess } : undefined
      )
      await Account.updateOne(
        { _id: accId, companyId: companyObjectId },
        { $inc: { lastBalance: newPaid }, $set: { hasTrxn: true, updatedAt: now } },
        sess ? { session: sess } : undefined
      )
    }

    // Update MoneyReceipt
    await MoneyReceipt.updateOne({ _id: idObj }, {
      $set: {
        amount,
        discount,
        paymentDate,
        paymentMethod,
        accountId: accId,
        accountName,
        note,
        updatedAt: now,
      }
    }, sess ? { session: sess } : undefined)

    // Update ClientTransaction by voucherNo
    await ClientTransaction.updateOne({ voucherNo: String(mr.voucherNo), clientId }, {
      $set: {
        date: paymentDate,
        paymentTypeId: accId,
        accountName,
        payType: paymentMethod || undefined,
        amount: newPaid,
        note: note || undefined,
        updatedAt: now,
      }
    }, sess ? { session: sess } : undefined)

    return {
      updated_id: String(idObj),
      receipt_vouchar_no: String(mr.voucherNo),
      receipt_total_amount: newPaid.toFixed(2),
      receipt_payment_date: paymentDate,
      account_name: accountName,
      acctype_name: paymentMethod,
      invoice_id: mr.invoiceId ? String(mr.invoiceId) : undefined,
      invoice_received_amount: typeof newReceived === 'number' ? newReceived : undefined,
      invoice_status: newStatus,
      present_balance: newClientPresent,
    }
  }

  try {
    let result: any
    await session.withTransaction(async () => { result = await perform(session) }, { writeConcern: { w: "majority" } })
    return { ok: true, updated: result }
  } catch (err: any) {
    const status = typeof err?.statusCode === 'number' ? err.statusCode : 500
    throw new AppError(err?.message || "Failed to update money receipt", status)
  } finally {
    await session.endSession()
  }
}

export async function deleteMoneyReceipt(id: string, companyId?: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  const now = new Date().toISOString()
  if (!Types.ObjectId.isValid(String(id))) throw new AppError("Invalid id", 400)
  const idObj = new Types.ObjectId(String(id))
  if (!companyId || !Types.ObjectId.isValid(String(companyId))) throw new AppError("Company ID is required", 400)
  const companyObjectId = new Types.ObjectId(String(companyId))

  const perform = async (sess?: any) => {
    const mr = await MoneyReceipt.findById(idObj).lean()
    if (!mr) throw new AppError("Receipt not found", 404)
    if (String(mr.companyId || "") !== String(companyObjectId)) throw new AppError("Not found", 404)

    const clientId = new Types.ObjectId(String(mr.clientId))
    const clientDoc = await Client.findById(clientId).lean()
    if (!clientDoc) throw new AppError("Client not found", 404)

    const paid = Math.max(0, parseNumber(mr.amount, 0) - parseNumber(mr.discount, 0))

    // Reverse client present balance
    const newClientPresent = parseNumber(clientDoc.presentBalance, 0) - paid
    await Client.updateOne({ _id: clientId }, { $set: { presentBalance: newClientPresent, updatedAt: now } }, sess ? { session: sess } : undefined)

    // If invoice linked, subtract received
    if (mr.invoiceId) {
      const invDoc = await Invoice.findById(mr.invoiceId).lean()
      if (!invDoc) throw new AppError("Invoice not found", 404)
      const net = parseNumber(invDoc.netTotal, 0)
      const currentReceived = parseNumber(invDoc.receivedAmount, 0)
      const newReceived = Math.max(0, currentReceived - paid)
      const newStatus = newReceived >= net ? "paid" : newReceived > 0 ? "partial" : "due"
      await Invoice.updateOne({ _id: mr.invoiceId }, { $set: { receivedAmount: newReceived, status: newStatus, updatedAt: now } }, sess ? { session: sess } : undefined)
    }

    // Adjust account balance (reverse receipt amount)
    const accId = new Types.ObjectId(String(mr.accountId))
    await Account.updateOne(
      { _id: accId, companyId: companyObjectId },
      { $inc: { lastBalance: -paid }, $set: { updatedAt: now } },
      sess ? { session: sess } : undefined
    )

    // Delete receipt and its transaction
    await MoneyReceipt.deleteOne({ _id: idObj }, sess ? { session: sess } : undefined)
    await ClientTransaction.deleteOne({ voucherNo: String(mr.voucherNo), clientId }, sess ? { session: sess } : undefined)

    return { deleted_id: String(idObj), present_balance: newClientPresent }
  }

  try {
    let result: any
    await session.withTransaction(async () => { result = await perform(session) }, { writeConcern: { w: "majority" } })
    return { ok: true, deleted: result }
  } catch (err: any) {
    const status = typeof err?.statusCode === 'number' ? err.statusCode : 500
    throw new AppError(err?.message || "Failed to delete money receipt", status)
  } finally {
    await session.endSession()
  }
}
