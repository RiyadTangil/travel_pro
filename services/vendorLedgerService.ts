import { startOfDay, endOfDay, parseISO } from "date-fns"
import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { InvoiceItem } from "@/models/invoice-item"
import { ClientTransaction } from "@/models/client-transaction"
import { Vendor } from "@/models/vendor"
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

  const vendorOid = new Types.ObjectId(vendorId)

  const vendorDoc = await Vendor.findById(vendorOid).lean() as any

  // Build optional date filter (used for both queries)
  const dateFilter: Record<string, any> = {}
  if (dateFrom) dateFilter.$gte = startOfDay(parseISO(dateFrom))
  if (dateTo)   dateFilter.$lte = endOfDay(parseISO(dateTo))
  const hasDateFilter = Object.keys(dateFilter).length > 0

  // ── 1. Invoice cost entries ────────────────────────────────────────────────
  // Source: InvoiceItem (grouped per invoice) → joined with Invoice for date/voucherNo
  // and InvoiceTicket for paxName/PNR/ticketNo/route.
  const invoiceCostRows: any[] = await InvoiceItem.aggregate([
    { $match: { vendorId: vendorOid, isDeleted: { $ne: true } } },

    // Join Invoice to get salesDate and invoiceNo
    {
      $lookup: {
        from: "invoices",
        localField: "invoiceId",
        foreignField: "_id",
        as: "inv",
      },
    },
    { $unwind: { path: "$inv", preserveNullAndEmptyArrays: false } },

    // Apply optional date filter on the invoice's sales date
    ...(hasDateFilter ? [{ $match: { "inv.salesDate": dateFilter } }] : []),

    // Group per invoice: sum all line costs, collect pax names
    {
      $group: {
        _id: "$invoiceId",
        date: { $first: "$inv.salesDate" },
        voucherNo: { $first: "$inv.invoiceNo" },
        invoiceCreatedAt: { $first: "$inv.createdAt" },
        invoiceType: { $first: "$inv.invoiceType" },
        totalCost: { $sum: "$totalCost" },
        paxNames: { $addToSet: "$paxName" },
        ticketMetadataList: { $push: "$ticketMetadata" },
      },
    },

    // Join InvoiceTicket for PNR / ticketNo / route
    {
      $lookup: {
        from: "invoice_tickets",
        localField: "_id",
        foreignField: "invoiceId",
        as: "tickets",
      },
    },

    { $sort: { date: 1, invoiceCreatedAt: 1 } },
  ])

  // ── 2. Payment / advance-return entries ────────────────────────────────────
  // Source: ClientTransaction (vendorId match, excluding any stale invoice-type rows)
  const txnMatch: Record<string, any> = {
    vendorId: vendorOid,
    // Exclude any residual invoice-direction rows that might exist from before the refactor
    direction: { $ne: "invoice" },
  }
  if (hasDateFilter) txnMatch.date = dateFilter

  const paymentRows: any[] = await ClientTransaction.find(txnMatch)
    .sort({ date: 1, createdAt: 1 })
    .lean()

  // ── 3. Shape invoice cost rows ─────────────────────────────────────────────
  type LedgerRow = {
    id: string
    _sortKey: string
    date: string
    particulars: string
    voucherNo: string
    paxName: string
    pnr: string
    ticketNo: string
    route: string
    payType: string
    debit: number
    credit: number
    note: string
  }

  const costEntries: LedgerRow[] = invoiceCostRows.map((row) => {
    const isNonCommission = row.invoiceType === "non_commission"
    const tickets: any[] = row.tickets || []
    const ticketMetadataList = (row.ticketMetadataList || []).filter((tm: any) => tm && tm.ticketNo)
    
    // For non-commission, use the metadata from InvoiceItem. 
    // For commission, use the joined InvoiceTicket records.
    const displayTickets = isNonCommission ? ticketMetadataList : tickets

    const paxNames = Array.from(
      new Set([
        ...((row.paxNames as string[]) || []).filter(Boolean),
        ...displayTickets.map((t: any) => t.passengerName || t.paxName).filter(Boolean),
      ])
    ).join(", ")

    const ticketNos = displayTickets.map((t: any) => t.ticketNo).filter(Boolean).join(", ")
    const pnrs      = displayTickets.map((t: any) => t.pnr).filter(Boolean).join(", ")
    const routes    = displayTickets.map((t: any) => t.route).filter(Boolean).join(", ")

    return {
      id:          String(row._id),
      _sortKey:    `${row.date || ""}|${row.invoiceCreatedAt || ""}`,
      date:        row.date        || "",
      particulars: `Invoice Cost`,
      voucherNo:   row.voucherNo   || "",
      paxName:     paxNames,
      pnr:         pnrs,
      ticketNo:    ticketNos,
      route:       routes,
      payType:     "",
      debit:       0,
      credit:      Number(row.totalCost || 0),
      note:        "",
    }
  })

  // ── 4. Shape payment / return rows ─────────────────────────────────────────
  const paymentEntries: LedgerRow[] = paymentRows.map((txn) => {
    // payout = we paid vendor = debit (reduces our liability)
    // receiv = vendor returned advance = credit (increases our liability)
    const isPayout = txn.direction === "payout"
    const debit  = isPayout ? Number(txn.amount || 0) : 0
    const credit = isPayout ? 0 : Number(txn.amount || 0)

    const particulars =
      txn.invoiceType === "VENDOR_PAYMENT"  ? "Vendor Payment"
      : txn.invoiceType === "ADVANCE_RETURN" ? "Advance Return"
      : txn.invoiceType === "INVOICE"        ? "Invoice Cost"
      : txn.invoiceType === "EXPENSE"        ? "Expense"
      : "Transaction"

    return {
      id:          String(txn._id),
      _sortKey:    `${txn.date || ""}|${txn.createdAt || ""}`,
      date:        txn.date      || "",
      particulars,
      voucherNo:   txn.voucherNo || "",
      paxName:     "",
      pnr:         "",
      ticketNo:    "",
      route:       "",
      payType:     txn.payType
        ? `${txn.payType}${txn.accountName ? ` (${txn.accountName})` : ""}`
        : "",
      debit,
      credit,
      note:        txn.note      || "",
    }
  })

  // ── 5. Merge and sort chronologically ─────────────────────────────────────
  const allRows = [...costEntries, ...paymentEntries].sort((a, b) =>
    a._sortKey < b._sortKey ? -1 : a._sortKey > b._sortKey ? 1 : 0
  )

  // ── 6. Running balance (credit = we owe vendor, debit = we paid) ───────────
  let runningBalance = 0
  const entries = allRows.map(({ _sortKey: _s, ...row }) => {
    runningBalance += row.credit - row.debit
    return { ...row, balance: runningBalance }
  })

  const totalDebit  = entries.reduce((s, e) => s + e.debit,  0)
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0)

  return {
    entries,
    totalDebit,
    totalCredit,
    closingBalance: runningBalance,
    entity: vendorDoc
      ? {
          name:    vendorDoc.name    || "",
          mobile:  `${vendorDoc.mobilePrefix || ""}${vendorDoc.mobile || ""}`.trim(),
          email:   vendorDoc.email   || "",
          address: vendorDoc.address || "",
        }
      : null,
  }
}
