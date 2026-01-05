import { NextRequest, NextResponse } from "next/server"
import { Types } from "mongoose"
import mongoose from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { NonInvoiceIncome } from "@/models/non-invoice-income"
import { Account } from "@/models/account"
import { Counter } from "@/models/counter"
import { ClientTransaction } from "@/models/client-transaction"
import { NonInvoiceCompany } from "@/models/non-invoice-company"

async function nextVoucher(prefix: "NII") {
  const key = "voucher_nii"
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 }, $set: { updatedAt: new Date().toISOString() } },
    { new: true, upsert: true }
  ).lean()
  const seq = Number(doc?.seq || 1)
  const pad = (n: number) => n.toString().padStart(4, "0")
  return `${prefix}-${pad(seq)}`
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const companyId = request.headers.get("x-company-id")
    const page = Number(searchParams.get("page") || 1)
    const pageSize = Number(searchParams.get("pageSize") || 20)
    const search = searchParams.get("search") || ""
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    if (!companyId) return NextResponse.json({ error: "Company ID required" }, { status: 400 })

    const filter: any = { companyId: new Types.ObjectId(companyId) }
    
    if (search) {
      filter.$or = [
        { voucherNo: { $regex: search, $options: "i" } },
        { nonInvoiceCompanyName: { $regex: search, $options: "i" } },
        { note: { $regex: search, $options: "i" } },
        { accountName: { $regex: search, $options: "i" } }
      ]
    }

    if (dateFrom || dateTo) {
      filter.date = {}
      if (dateFrom) filter.date.$gte = dateFrom
      if (dateTo) filter.date.$lte = dateTo
    }

    const total = await NonInvoiceIncome.countDocuments(filter)
    const items = await NonInvoiceIncome.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()

    const mappedItems = items.map((i: any) => ({
      id: String(i._id),
      date: i.date,
      voucherNo: i.voucherNo,
      companyName: i.nonInvoiceCompanyName,
      nonInvoiceCompanyId: String(i.nonInvoiceCompanyId),
      accountId: String(i.accountId),
      accountName: i.accountName,
      paymentMethod: i.paymentMethod,
      amount: i.amount,
      note: i.note,
      createdAt: i.createdAt
    }))

    return NextResponse.json({
      items: mappedItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const body = await request.json()
    const companyId = request.headers.get("x-company-id")

    if (!companyId) return NextResponse.json({ error: "Company ID required" }, { status: 400 })

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const voucherNo = await nextVoucher("NII")
      const nic = await NonInvoiceCompany.findById(body.nonInvoiceCompanyId).session(session)
      const acc = await Account.findById(body.accountId).session(session)

      if (!nic) throw new Error("Non Invoice Company not found")
      if (!acc) throw new Error("Account not found")

      const amount = Number(body.amount)
      
      const newItem = await NonInvoiceIncome.create([{
        ...body,
        companyId: new Types.ObjectId(companyId),
        nonInvoiceCompanyName: nic.name,
        accountName: acc.name,
        voucherNo,
        amount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }], { session })

      // Update Account Balance (Increase for Income)
      const updatedAcc = await Account.findOneAndUpdate(
        { _id: body.accountId },
        { $inc: { lastBalance: amount }, $set: { updatedAt: new Date().toISOString() } },
        { new: true, session }
      )

      // Create Client Transaction
      await ClientTransaction.create([{
        date: body.date,
        voucherNo,
        companyId: new Types.ObjectId(companyId),
        invoiceType: "NON_INVOICE_INCOME",
        paymentTypeId: new Types.ObjectId(body.accountId),
        accountName: acc.name,
        payType: body.paymentMethod,
        amount,
        direction: "receiv",
        lastTotalAmount: updatedAcc.lastBalance,
        note: body.note || "Non-Invoice Income",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }], { session })

      await session.commitTransaction()
      return NextResponse.json(newItem[0])
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
