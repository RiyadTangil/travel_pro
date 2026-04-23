import { BillAdjustment } from "@/models/bill-adjustment"
import { ClientTransaction } from "@/models/client-transaction"
import { Account } from "@/models/account"
import { Client } from "@/models/client"
import { Vendor } from "@/models/vendor"
import { Counter } from "@/models/counter"
import connectMongoose from "@/lib/mongoose"
import mongoose, { Types } from "mongoose"
import { updateVendorBalance } from "@/services/vendorPaymentService"

function vendorNetFromDoc(v: any): number {
  if (!v?.presentBalance) return 0
  if (typeof v.presentBalance === "object") {
    const pType = v.presentBalance.type
    const pAmount = Number(v.presentBalance.amount || 0)
    return pType === "advance" ? pAmount : -pAmount
  }
  return Number(v.presentBalance || 0)
}

async function getNextBillAdjustmentVoucherNo(session?: mongoose.ClientSession) {
  const opts: any = { new: true, upsert: true }
  if (session) opts.session = session
  const counter = await Counter.findOneAndUpdate(
    { key: "bill_adjustment_voucher" },
    { $inc: { seq: 1 } },
    opts
  )
  const seqNum = (counter as { seq?: number })?.seq ?? 0
  const seq = seqNum.toString().padStart(4, "0")
  return `BA-${seq}`
}

export type BillAdjustmentLedgerOpts = {
  clientLedgerTransactionType: "bill_adjustment" | "opening_balance"
}

/**
 * One BillAdjustment always produces exactly one ClientTransaction row (when a balance target exists).
 */
async function persistBillAdjustmentLedger(
  session: mongoose.ClientSession,
  data: any,
  companyId: string,
  ledgerOpts: BillAdjustmentLedgerOpts
) {
  const voucherNo = await getNextBillAdjustmentVoucherNo(session)
  const now = new Date().toISOString()
  const adjustment = new BillAdjustment({
    ...data,
    voucherNo,
    companyId: new Types.ObjectId(companyId),
    source: data.source || "user",
    createdAt: now,
    updatedAt: now,
  })
  await adjustment.save({ session })

  const amount = Number(data.amount)
  const isDebit = data.transactionType === "DEBIT"
  const ledgerTransactionType = ledgerOpts.clientLedgerTransactionType
  const isMonetoryTranseciton = false

  // Opening-balance callers may pass an explicit ledgerDirection to override the default
  // isDebit→"payout" / !isDebit→"receiv" mapping, because for opening balances the balance
  // arithmetic (presentBalance / vendorBalance) requires the opposite isDebit polarity from
  // what the ledger display needs.
  const defaultDirection: "payout" | "receiv" = isDebit ? "payout" : "receiv"
  const ledgerDirection: "payout" | "receiv" = (data.ledgerDirection as "payout" | "receiv" | undefined) ?? defaultDirection

  if (data.type === "Account" && data.accountId) {
    const balanceChange = isDebit ? -amount : amount
    const account = await Account.findOneAndUpdate(
      { _id: data.accountId },
      { $inc: { lastBalance: balanceChange } },
      { session, new: true }
    )
    if (account) {
      const tx = new ClientTransaction({
        date: data.date,
        voucherNo,
        companyId: new Types.ObjectId(companyId),
        paymentTypeId: new Types.ObjectId(data.accountId),
        accountName: data.name,
        payType: data.paymentMethod || "CASH",
        amount,
        direction: defaultDirection, // Account ledger is not affected by the override
        transactionType: ledgerTransactionType,
        isMonetoryTranseciton,
        lastTotalAmount: account.lastBalance,
        note: data.note || "Bill Adjustment",
        createdAt: now,
        updatedAt: now,
      })
      await tx.save({ session })
    }
  }

  if (data.type === "Client" && data.clientId) {
    const balanceChange = isDebit ? amount : -amount
    const client = await Client.findOneAndUpdate(
      { _id: data.clientId },
      { $inc: { presentBalance: balanceChange } },
      { session, new: true }
    )
    if (client) {
      const tx = new ClientTransaction({
        date: data.date,
        voucherNo,
        companyId: new Types.ObjectId(companyId),
        clientId: new Types.ObjectId(data.clientId),
        clientName: client.name,
        amount,
        direction: ledgerDirection,
        transactionType: ledgerTransactionType,
        isMonetoryTranseciton,
        lastTotalAmount: client.presentBalance,
        note: data.note || (ledgerTransactionType === "opening_balance" ? "Opening balance" : "Bill Adjustment"),
        createdAt: now,
        updatedAt: now,
      })
      await tx.save({ session })
    }
  }

  if (data.type === "Vendor" && data.vendorId) {
    const netDelta = isDebit ? -amount : amount
    await updateVendorBalance(data.vendorId, netDelta, session)
    const vendor = await Vendor.findById(data.vendorId).session(session).lean()
    if (vendor) {
      const net = vendorNetFromDoc(vendor)
      const tx = new ClientTransaction({
        date: data.date,
        voucherNo,
        companyId: new Types.ObjectId(companyId),
        vendorId: new Types.ObjectId(data.vendorId),
        clientName: vendor.name,
        amount,
        direction: ledgerDirection,
        transactionType: ledgerTransactionType,
        isMonetoryTranseciton,
        lastTotalAmount: net,
        note: data.note || (ledgerTransactionType === "opening_balance" ? "Opening balance" : "Bill Adjustment"),
        createdAt: now,
        updatedAt: now,
      })
      await tx.save({ session })
    }
  }

  return adjustment
}

export async function createBillAdjustment(data: any, companyId: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const adjustment = await persistBillAdjustmentLedger(session, data, companyId, {
      clientLedgerTransactionType: "bill_adjustment",
    })
    await session.commitTransaction()
    return adjustment
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

/** Call inside an existing transaction after Account is created with lastBalance 0. */
export async function createAccountOpeningBillAdjustment(
  session: mongoose.ClientSession,
  params: {
    accountId: Types.ObjectId
    companyId: string
    accountLabel: string
    openingLastBalance: number
    date: string
  }
) {
  const L = Number(params.openingLastBalance) || 0
  if (Math.abs(L) < 1e-9) return null
  const transactionType = L >= 0 ? "CREDIT" : "DEBIT"
  const amount = Math.abs(L)

  return persistBillAdjustmentLedger(
    session,
    {
      type: "Account",
      accountId: params.accountId,
      transactionType,
      amount,
      date: params.date,
      note: "Opening balance",
      name: params.accountLabel,
      paymentMethod: "CASH",
      source: "opening_balance",
    },
    params.companyId,
    { clientLedgerTransactionType: "opening_balance" }
  )
}

/** Call inside an existing transaction after the Client document is created with presentBalance 0. */
export async function createClientOpeningBillAdjustment(
  session: mongoose.ClientSession,
  params: {
    clientId: Types.ObjectId
    companyId: string
    clientName: string
    openingBalanceType: string
    openingBalanceAmount: number
    date: string
  }
) {
  const raw = Number(params.openingBalanceAmount) || 0
  const amt = Math.abs(raw)
  if (amt === 0) return null
  if (params.openingBalanceType !== "Due" && params.openingBalanceType !== "Advance") return null

  const isDue = params.openingBalanceType === "Due"
  const transactionType = isDue ? "CREDIT" : "DEBIT"

  return persistBillAdjustmentLedger(
    session,
    {
      type: "Client",
      clientId: params.clientId,
      transactionType,
      amount: amt,
      date: params.date,
      note: "Opening balance",
      name: params.clientName,
      source: "opening_balance",
      // Due  → client owes us → DEBIT in client ledger ("payout")
      // Advance → client paid ahead → CREDIT in client ledger ("receiv")
      ledgerDirection: isDue ? "payout" : "receiv",
    },
    params.companyId,
    { clientLedgerTransactionType: "opening_balance" }
  )
}

/** Call inside an existing transaction after Vendor is inserted with presentBalance amount 0. */
export async function createVendorOpeningBillAdjustment(
  session: mongoose.ClientSession,
  params: {
    vendorId: Types.ObjectId
    companyId: string
    vendorName: string
    presentBalance: { type?: string; amount?: number }
    date: string
  }
) {
  const opening = params.presentBalance || { type: "due", amount: 0 }
  const amt = Math.abs(Number(opening.amount || 0))
  if (amt === 0) return null

  const isDue = String(opening.type || "due").toLowerCase() === "due"
  const transactionType = isDue ? "DEBIT" : "CREDIT"

  return persistBillAdjustmentLedger(
    session,
    {
      type: "Vendor",
      vendorId: params.vendorId,
      transactionType,
      amount: amt,
      date: params.date,
      note: "Opening balance",
      name: params.vendorName,
      source: "opening_balance",
      // Due  → we owe vendor → CREDIT in vendor ledger ("receiv")
      // Advance → vendor owes us → DEBIT in vendor ledger ("payout")
      ledgerDirection: isDue ? "receiv" : "payout",
    },
    params.companyId,
    { clientLedgerTransactionType: "opening_balance" }
  )
}

export async function getBillAdjustments(companyId: string, page = 1, pageSize = 20) {
  await connectMongoose()
  const filter = { companyId: new Types.ObjectId(companyId) }
  const total = await BillAdjustment.countDocuments(filter)
  const items = await BillAdjustment.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean()

  return { items, pagination: { total, page, pageSize } }
}

export async function deleteBillAdjustment(id: string, companyId: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const adjustment: any = await BillAdjustment.findOne({
      _id: id,
      companyId: new Types.ObjectId(companyId),
    }).session(session)
    if (!adjustment) throw new Error("Adjustment not found")

    const amount = adjustment.amount
    const isDebit = adjustment.transactionType === "DEBIT"

    if (adjustment.type === "Account" && adjustment.accountId) {
      const balanceChange = isDebit ? amount : -amount
      await Account.findOneAndUpdate(
        { _id: adjustment.accountId },
        { $inc: { lastBalance: balanceChange } },
        { session }
      )
    }

    if (adjustment.type === "Client" && adjustment.clientId) {
      const balanceChange = isDebit ? -amount : amount
      await Client.findOneAndUpdate(
        { _id: adjustment.clientId },
        { $inc: { presentBalance: balanceChange } },
        { session }
      )
    }

    if (adjustment.type === "Vendor" && adjustment.vendorId) {
      const netDelta = isDebit ? -amount : amount
      await updateVendorBalance(adjustment.vendorId, -netDelta, session)
    }

    await ClientTransaction.deleteOne({
      voucherNo: adjustment.voucherNo,
      companyId: new Types.ObjectId(companyId),
    }).session(session)

    await BillAdjustment.deleteOne({ _id: id }).session(session)

    await session.commitTransaction()
    return true
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}
