import { NextRequest, NextResponse } from "next/server"
import { Types } from "mongoose"
import mongoose from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { NonInvoiceIncome } from "@/models/non-invoice-income"
import { Account } from "@/models/account"
import { ClientTransaction } from "@/models/client-transaction"
import { NonInvoiceCompany } from "@/models/non-invoice-company"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongoose()
    const body = await request.json()
    const companyId = request.headers.get("x-company-id")
    const { id } = params

    if (!companyId) return NextResponse.json({ error: "Company ID required" }, { status: 400 })

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const existing = await NonInvoiceIncome.findOne({ _id: id, companyId: new Types.ObjectId(companyId) }).session(session)
      if (!existing) throw new Error("Record not found")

      // Revert old effects
      await Account.updateOne(
        { _id: existing.accountId },
        { $inc: { lastBalance: -existing.amount } },
        { session }
      )

      await ClientTransaction.deleteOne({ voucherNo: existing.voucherNo }, { session })

      // Apply new effects
      const nic = await NonInvoiceCompany.findById(body.nonInvoiceCompanyId).session(session)
      const acc = await Account.findById(body.accountId).session(session)

      if (!nic) throw new Error("Non Invoice Company not found")
      if (!acc) throw new Error("Account not found")

      const amount = Number(body.amount)

      // Update Account Balance (Increase for Income)
      const updatedAcc = await Account.findOneAndUpdate(
        { _id: body.accountId },
        { $inc: { lastBalance: amount }, $set: { updatedAt: new Date().toISOString() } },
        { new: true, session }
      )

      // Update NonInvoiceIncome
      existing.nonInvoiceCompanyId = new Types.ObjectId(body.nonInvoiceCompanyId)
      existing.nonInvoiceCompanyName = nic.name
      existing.accountId = new Types.ObjectId(body.accountId)
      existing.accountName = acc.name
      existing.paymentMethod = body.paymentMethod
      existing.amount = amount
      existing.date = body.date
      existing.note = body.note
      existing.updatedAt = new Date().toISOString()
      await existing.save({ session })

      // Create new Transaction (simpler than update)
      await ClientTransaction.create([{
        date: body.date,
        voucherNo: existing.voucherNo,
        companyId: new Types.ObjectId(companyId),
        invoiceType: "NON_INVOICE_INCOME",
        paymentTypeId: new Types.ObjectId(body.accountId),
        accountName: acc.name,
        payType: body.paymentMethod,
        amount,
        direction: "receiv",
        lastTotalAmount: updatedAcc.lastBalance,
        note: body.note || "Non-Invoice Income",
        createdAt: existing.createdAt, // Preserve creation time
        updatedAt: new Date().toISOString()
      }], { session })

      await session.commitTransaction()
      return NextResponse.json(existing)
    } catch (error: any) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongoose()
    const companyId = request.headers.get("x-company-id")
    const { id } = params

    if (!companyId) return NextResponse.json({ error: "Company ID required" }, { status: 400 })

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const existing = await NonInvoiceIncome.findOne({ _id: id, companyId: new Types.ObjectId(companyId) }).session(session)
      if (!existing) throw new Error("Record not found")

      // Revert Account Balance
      await Account.updateOne(
        { _id: existing.accountId },
        { $inc: { lastBalance: -existing.amount } },
        { session }
      )

      // Delete Transaction
      await ClientTransaction.deleteOne({ voucherNo: existing.voucherNo }, { session })

      // Delete Record
      await NonInvoiceIncome.deleteOne({ _id: id }, { session })

      await session.commitTransaction()
      return NextResponse.json({ success: true })
    } catch (error: any) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
