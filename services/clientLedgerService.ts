import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { ClientTransaction } from "@/models/client-transaction"
import { Client } from "@/models/client"
import { AppError } from "@/errors/AppError"

export async function getClientLedger(
  clientId: string,
  dateFrom?: string | null,
  dateTo?: string | null
) {
  await connectMongoose()

  if (!clientId || !Types.ObjectId.isValid(clientId)) {
    throw new AppError("Valid Client ID is required", 400)
  }

  const clientDoc = await Client.findById(new Types.ObjectId(clientId)).lean() as any

  const matchStage: Record<string, unknown> = {
    clientId: new Types.ObjectId(clientId),
  }

  if (dateFrom || dateTo) {
    const dateFilter: Record<string, string> = {}
    if (dateFrom) dateFilter.$gte = dateFrom
    if (dateTo) dateFilter.$lte = dateTo
    matchStage.date = dateFilter
  }

  const transactions = await ClientTransaction.aggregate([
    { $match: matchStage },
    // Convert invoiceId ObjectId → string so it can match invoice_items/tickets
    // where invoiceId may be stored as a plain string.
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

    const isCredit = txn.direction === "receiv"
    const debit  = isCredit ? 0 : Number(txn.amount || 0)
    const credit = isCredit ? Number(txn.amount || 0) : 0
    runningBalance += debit - credit

    // Invoice debit entries (direction:"invoice") have transactionType:"invoice"
    // Payment credit entries (direction:"receiv") have other transactionTypes
    const particulars =
      txn.transactionType === "invoice"        ? `Invoice ${txn.voucherNo || ""}`.trim()
      : txn.invoiceType === "INVOICE"          ? "Payment (Invoice)"
      : txn.invoiceType === "EXPENSE"          ? "Expense"
      : txn.invoiceType === "BALANCE_TRANSFER" ? "Balance Transfer"
      : "Money Receipt"

    return {
      id:         String(txn._id),
      date:       txn.date        || "",
      particulars,
      voucherNo:  txn.voucherNo   || "",
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
    entity: clientDoc
      ? {
          name:    clientDoc.name    || "",
          phone:   clientDoc.phone   || "",
          email:   clientDoc.email   || "",
          address: clientDoc.address || "",
        }
      : null,
  }
}
