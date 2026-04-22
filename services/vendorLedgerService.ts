import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { ClientTransaction } from "@/models/client-transaction"
import { AppError } from "@/errors/AppError"

export async function getVendorLedger(
  vendorId: string,
  dateFrom?: string | null,
  dateTo?: string | null
) {
  await connectMongoose()

  if (!vendorId || !Types.ObjectId.isValid(vendorId)) {
    throw new AppError("Valid Vendor ID is required", 400)
  }

  const matchStage: Record<string, unknown> = {
    vendorId: new Types.ObjectId(vendorId),
  }

  if (dateFrom || dateTo) {
    const dateFilter: Record<string, string> = {}
    if (dateFrom) dateFilter.$gte = dateFrom
    if (dateTo)   dateFilter.$lte = dateTo
    matchStage.date = dateFilter
  }

  const transactions = await ClientTransaction.aggregate([
    { $match: matchStage },
    // Convert invoiceId ObjectId → string for lookup (invoice_items/tickets may store as string)
    {
      $addFields: {
        invoiceIdStr: {
          $cond: {
            if: { $gt: ["$invoiceId", null] },
            then: { $toString: "$invoiceId" },
            else: null,
          },
        },
      },
    },
    {
      $lookup: {
        from: "invoice_items",
        localField: "invoiceIdStr",
        foreignField: "invoiceId",
        as: "invoiceItems",
      },
    },
    {
      $lookup: {
        from: "invoice_tickets",
        localField: "invoiceIdStr",
        foreignField: "invoiceId",
        as: "invoiceTickets",
      },
    },
    { $sort: { date: 1, createdAt: 1 } },
  ])

  let runningBalance = 0

  const entries = transactions.map((txn: any) => {
    const items: any[]   = txn.invoiceItems   || []
    const tickets: any[] = txn.invoiceTickets || []

    const paxNames = Array.from(
      new Set(
        [
          ...items.map((i) => i.paxName),
          ...tickets.map((t) => t.passengerName || t.paxName),
        ].filter(Boolean)
      )
    ).join(", ")

    const ticketNos = tickets.map((t) => t.ticketNo).filter(Boolean).join(", ")
    const pnrs      = tickets.map((t) => t.pnr).filter(Boolean).join(", ")
    const routes    = tickets.map((t) => t.route).filter(Boolean).join(", ")

    // Vendor ledger perspective:
    // payout = we paid vendor = debit (decreases our liability)
    // receiv = vendor returned money = credit (was an advance, now returned)
    const isPayout = txn.direction === "payout"
    const debit  = isPayout ? Number(txn.amount || 0) : 0
    const credit = isPayout ? 0 : Number(txn.amount || 0)
    runningBalance += credit - debit

    const particulars =
      txn.invoiceType === "VENDOR_PAYMENT"   ? "Vendor Payment"
      : txn.invoiceType === "ADVANCE_RETURN" ? "Advance Return"
      : txn.invoiceType === "INVOICE"        ? "Invoice Cost"
      : txn.invoiceType === "EXPENSE"        ? "Expense"
      : "Transaction"

    return {
      id:         String(txn._id),
      date:       txn.date       || "",
      particulars,
      voucherNo:  txn.voucherNo  || "",
      paxName:    paxNames,
      pnr:        pnrs,
      ticketNo:   ticketNos,
      route:      routes,
      payType:    txn.payType
        ? `${txn.payType}${txn.accountName ? ` (${txn.accountName})` : ""}`
        : "",
      debit,
      credit,
      balance:    runningBalance,
      note:       txn.note || "",
    }
  })

  const totalDebit  = entries.reduce((s, e) => s + e.debit,  0)
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0)

  return {
    entries,
    totalDebit,
    totalCredit,
    closingBalance: runningBalance,
  }
}
