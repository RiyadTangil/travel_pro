import { BillAdjustment } from "@/models/bill-adjustment"
import { ClientTransaction } from "@/models/client-transaction"
import { Account } from "@/models/account"
import { Client } from "@/models/client"
import { Vendor } from "@/models/vendor"
import { Counter } from "@/models/counter"
import connectMongoose from "@/lib/mongoose"
import mongoose, { Types } from "mongoose"

async function getNextVoucherNo() {
  const counter = await Counter.findOneAndUpdate(
    { key: "bill_adjustment_voucher" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  const seq = counter.seq.toString().padStart(4, "0")
  return `BA-${new Date().getFullYear()}-${seq}`
}

export async function createBillAdjustment(data: any, companyId: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const voucherNo = await getNextVoucherNo()
    const now = new Date().toISOString()

    const adjustment = new BillAdjustment({
      ...data,
      voucherNo,
      companyId: new Types.ObjectId(companyId),
      createdAt: now,
      updatedAt: now,
    })

    await adjustment.save({ session })

    const amount = Number(data.amount)
    const isDebit = data.transactionType === "DEBIT"

    // Group 1: Accounts
    if (data.type === "Account" && data.accountId) {
      const balanceChange = isDebit ? -amount : amount
      const account = await Account.findOneAndUpdate(
        { _id: data.accountId },
        { $inc: { lastBalance: balanceChange } },
        { session, new: true }
      )
      
      if (account) {
        // Create ClientTransaction for Account history
        const tx = new ClientTransaction({
          date: data.date,
          voucherNo,
          companyId: new Types.ObjectId(companyId),
          paymentTypeId: new Types.ObjectId(data.accountId),
          accountName: data.name,
          payType: data.paymentMethod || "CASH",
          amount: amount,
          direction: isDebit ? "payout" : "receiv",
          transactionType: "bill_adjustment",
          lastTotalAmount: account.lastBalance,
          note: data.note || "Bill Adjustment",
          createdAt: now,
          updatedAt: now,
        })
        await tx.save({ session })
      }
    }

    // Group 2: Clients / Vendors
    if (data.type === "Client" && data.clientId) {
      const balanceChange = isDebit ? amount : -amount
      const client = await Client.findOneAndUpdate(
        { _id: data.clientId },
        { $inc: { presentBalance: balanceChange } },
        { session, new: true }
      )

      if (client) {
        // Create ClientTransaction for Client history
        const tx = new ClientTransaction({
          date: data.date,
          voucherNo,
          companyId: new Types.ObjectId(companyId),
          clientId: new Types.ObjectId(data.clientId),
          clientName: client.name,
          amount: amount,
          direction: isDebit ? "payout" : "receiv",
          transactionType: "bill_adjustment",
          lastTotalAmount: client.presentBalance,
          note: data.note || "Bill Adjustment",
          createdAt: now,
          updatedAt: now,
        })
        await tx.save({ session })
      }
    }

    if (data.type === "Vendor" && data.vendorId) {
      const balanceChange = isDebit ? -amount : amount
      const vendor = await Vendor.findOneAndUpdate(
        { _id: data.vendorId },
        { $inc: { presentBalance: balanceChange } },
        { session, new: true }
      )

      if (vendor) {
        // Create ClientTransaction for Vendor history
        const tx = new ClientTransaction({
          date: data.date,
          voucherNo,
          companyId: new Types.ObjectId(companyId),
          vendorId: new Types.ObjectId(data.vendorId),
          clientName: vendor.name,
          amount: amount,
          direction: isDebit ? "payout" : "receiv",
          transactionType: "bill_adjustment",
          lastTotalAmount: vendor.presentBalance,
          note: data.note || "Bill Adjustment",
          createdAt: now,
          updatedAt: now,
        })
        await tx.save({ session })
      }
    }

    await session.commitTransaction()
    return adjustment
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
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
    const adjustment = await BillAdjustment.findOne({ _id: id, companyId: new Types.ObjectId(companyId) }).session(session)
    if (!adjustment) throw new Error("Adjustment not found")

    const amount = adjustment.amount
    const isDebit = adjustment.transactionType === "DEBIT"

    // Reverse balances
    if (adjustment.type === "Account" && adjustment.accountId) {
      const balanceChange = isDebit ? amount : -amount // Reverse: was isDebit ? -amount : amount
      await Account.findOneAndUpdate(
        { _id: adjustment.accountId },
        { $inc: { lastBalance: balanceChange } },
        { session }
      )
    }

    if (adjustment.type === "Client" && adjustment.clientId) {
      const balanceChange = isDebit ? -amount : amount // Reverse: was isDebit ? amount : -amount
      await Client.findOneAndUpdate(
        { _id: adjustment.clientId },
        { $inc: { presentBalance: balanceChange } },
        { session }
      )
    }

    if (adjustment.type === "Vendor" && adjustment.vendorId) {
      const balanceChange = isDebit ? amount : -amount // Reverse: was isDebit ? -amount : amount
      await Vendor.findOneAndUpdate(
        { _id: adjustment.vendorId },
        { $inc: { presentBalance: balanceChange } },
        { session }
      )
    }

    // Delete ClientTransactions associated with this adjustment
    await ClientTransaction.deleteMany({ voucherNo: adjustment.voucherNo, companyId: new Types.ObjectId(companyId) }).session(session)

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
