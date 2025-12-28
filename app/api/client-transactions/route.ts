import { NextRequest, NextResponse } from "next/server"
import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { ClientTransaction } from "@/models/client-transaction"

function parseNumber(n: any, def = 0): number { const x = Number(n); return isFinite(x) ? x : def }

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const page = parseNumber(searchParams.get("page"), 1)
    const pageSize = parseNumber(searchParams.get("pageSize"), 20)
    const clientIdRaw = (searchParams.get("clientId") || "").trim()
    const dateFrom = searchParams.get("dateFrom") || undefined
    const dateTo = searchParams.get("dateTo") || undefined
    const openingBalance = parseNumber(searchParams.get("openingBalance"), 0)

    const filter: any = {}
    if (clientIdRaw && Types.ObjectId.isValid(clientIdRaw)) filter.clientId = new Types.ObjectId(clientIdRaw)
    if (dateFrom || dateTo) {
      const range: any = {}
      if (dateFrom) range.$gte = dateFrom
      if (dateTo) range.$lte = dateTo
      filter.date = range
    }

    const total = await ClientTransaction.countDocuments(filter)
    const docs = await ClientTransaction.find(filter)
      .sort({ date: 1, createdAt: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()

    let runningBalance = openingBalance
    const items = docs.map((t: any) => {
      const isReceive = String(t.direction) === "receiv"
      const acctrxn_type = isReceive ? "CREDIT" : "DEBIT"
      const amount = parseNumber(t.amount, 0)
      runningBalance = runningBalance + (isReceive ? amount : -amount)
      const voucher = String(t.voucherNo || "")
      const particular = voucher.startsWith("MR") ? "Money receipt" : voucher.startsWith("EX") ? "Expense" : "Transaction"
      const trxntype_name = voucher.startsWith("MR") ? "Sales Collection" : particular === "Expense" ? "Expense" : "Transaction"

      return {
        acctrxn_id: Number(String(t._id).slice(-6)),
        acctrxn_ac_id: t.paymentTypeId || null,
        account_name: t.accountName || null,
        acctrxn_pay_type: t.payType || null,
        acctrxn_particular_type: particular,
        acctrxn_type,
        acctrxn_voucher: voucher,
        acctrxn_amount: amount.toFixed(2),
        acctrxn_lbalance: runningBalance.toFixed(2),
        acctrxn_note: t.note || "",
        acctrxn_created_at: t.date || t.createdAt,
        acctrxn_created_date: t.createdAt,
        trxntype_name,
        user_name: null,
      }
    })

    return NextResponse.json({ items, pagination: { page, pageSize, total } })
  } catch (error) {
    console.error("Error listing client transactions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
