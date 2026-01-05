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
    const accountIdRaw = (searchParams.get("accountId") || "").trim()
    const clientIdRaw = (searchParams.get("clientId") || "").trim()
    const dateFrom = searchParams.get("dateFrom") || undefined
    const dateTo = searchParams.get("dateTo") || undefined
    const openingBalance = parseNumber(searchParams.get("openingBalance"), 0)

    const filter: any = {}
    if (clientIdRaw && Types.ObjectId.isValid(clientIdRaw)) filter.clientId = new Types.ObjectId(clientIdRaw)
    if (accountIdRaw && Types.ObjectId.isValid(accountIdRaw)) filter.paymentTypeId = new Types.ObjectId(accountIdRaw)
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
      const isPayout = String(t.direction) === "payout"
      
      // Image logic: Payout -> Debit (Red), Receive -> Credit (Green)
      const acctrxn_type = isReceive ? "CREDIT" : "DEBIT"
      const amount = parseNumber(t.amount, 0)
      
      // Use stored lastTotalAmount if available, otherwise calculate?
      // For now, let's use stored if we are filtering by Account, as expenseService saves it.
      // But if filtering by Client, it might be different. 
      // Let's stick to the existing logic of runningBalance if openingBalance is provided, 
      // but also provide the stored one.
      
      const storedBalance = t.lastTotalAmount !== undefined ? parseNumber(t.lastTotalAmount) : null
      
      // If filtering by Account, storedBalance is likely the Account Balance at that time.
      // But we need to be careful.
      
      const voucher = String(t.voucherNo || "")
      const particular = voucher.startsWith("MR") ? "Money receipt" : voucher.startsWith("EX") ? "Vendor Payment" : t.invoiceType === "OPENING_BALANCE" ? "Opening Balance" : "Transaction"
      
      return {
        id: String(t._id),
        date: t.date,
        voucherNo: voucher,
        accountName: t.accountName || "",
        particulars: t.note || particular, // Use note as particulars if available, or type
        trType: acctrxn_type,
        debit: isPayout ? amount : 0,
        credit: isReceive ? amount : 0,
        totalLastBalance: storedBalance, // Use stored balance
        note: t.note || "",
        
        // Keep old fields for compatibility if needed
        acctrxn_id: Number(String(t._id).slice(-6)),
        acctrxn_amount: amount.toFixed(2),
        acctrxn_type,
      }
    })

    return NextResponse.json({ items, pagination: { page, pageSize, total } })
  } catch (error) {
    console.error("Error listing client transactions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
