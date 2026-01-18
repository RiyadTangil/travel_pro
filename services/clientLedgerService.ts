import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Invoice } from "@/models/invoice"
import { ClientTransaction } from "@/models/client-transaction"
import { Client } from "@/models/client"
import { AppError } from "@/errors/AppError"

export async function getClientLedger(clientId: string, dateFrom?: string | null, dateTo?: string | null) {
  await connectMongoose()

  if (!clientId || !Types.ObjectId.isValid(clientId)) {
    throw new AppError("Valid Client ID is required", 400)
  }

  const clientObjectId = new Types.ObjectId(clientId)

  // 1. Fetch Client Info
  const client = await Client.findById(clientId).lean()
  if (!client) {
    throw new AppError("Client not found", 404)
  }

  // Initial Opening Balance
  let openingBalance = 0
  if (client.openingBalanceType === "Due") {
    openingBalance = Number(client.openingBalanceAmount || 0)
  } else if (client.openingBalanceType === "Advance") {
    openingBalance = -Number(client.openingBalanceAmount || 0)
  }

  // 2. Fetch Invoices (Using Facet)
  const invoiceFacet = await Invoice.aggregate([
    { $match: { clientId: clientObjectId } },
    {
      $facet: {
        pre: [
          { $match: { salesDate: { $lt: dateFrom || "0000-00-00" } } },
          { $group: { _id: null, total: { $sum: "$netTotal" } } }
        ],
        curr: [
          { 
            $match: { 
              salesDate: { 
                $gte: dateFrom || "0000-00-00", 
                $lte: dateTo || "9999-12-31" 
              } 
            } 
          },
          { $addFields: { invoiceIdStr: { $toString: "$_id" } } },
          {
            $lookup: {
              from: "invoice_tickets",
              localField: "invoiceIdStr",
              foreignField: "invoiceId",
              as: "tickets"
            }
          },
          {
            $lookup: {
              from: "invoice_items",
              localField: "invoiceIdStr",
              foreignField: "invoiceId",
              as: "items"
            }
          }
        ]
      }
    }
  ])

  const preInvoiceTotal = invoiceFacet[0].pre[0]?.total || 0
  const currentInvoices = invoiceFacet[0].curr || []

  // 3. Fetch ClientTransactions (Using Facet)
  const txnFacet = await ClientTransaction.aggregate([
    { $match: { clientId: clientObjectId } },
    {
      $facet: {
        pre: [
          { $match: { date: { $lt: dateFrom || "0000-00-00" } } },
          { 
            $group: { 
              _id: "$direction", 
              total: { $sum: "$amount" } 
            } 
          }
        ],
        curr: [
          { 
            $match: { 
              date: { 
                $gte: dateFrom || "0000-00-00", 
                $lte: dateTo || "9999-12-31" 
              } 
            } 
          }
        ]
      }
    }
  ])

  let preTxnDebit = 0  // payout
  let preTxnCredit = 0 // receiv
  
  txnFacet[0].pre.forEach((g: any) => {
    if (g._id === "payout") preTxnDebit += g.total
    if (g._id === "receiv") preTxnCredit += g.total
  })

  const currentTransactions = txnFacet[0].curr || []

  // 4. Calculate Brought Forward
  let broughtForward = openingBalance
  if (dateFrom) {
    broughtForward = openingBalance + (preInvoiceTotal + preTxnDebit) - preTxnCredit
  } else {
    broughtForward = openingBalance
  }

  // 5. Map to Ledger Entries
  const ledgerEntries: any[] = []

  // Map Invoices
  currentInvoices.forEach((inv: any) => {
    const invTickets = inv.tickets || []
    const invItems = inv.items || []

    const paxNames = Array.from(new Set([
      ...invTickets.map((t: any) => t.paxName),
      ...invItems.map((i: any) => i.paxName)
    ].filter(Boolean))).join(", ")

    const ticketNos = invTickets.map((t: any) => t.ticketNo).filter(Boolean).join(", ")
    const routes = invTickets.map((t: any) => t.route).filter(Boolean).join(", ")
    const pnrs = invTickets.map((t: any) => t.pnr).filter(Boolean).join(", ")

    ledgerEntries.push({
      id: String(inv._id),
      date: inv.salesDate,
      particulars: `Invoice ${inv.invoiceNo}`,
      voucherNo: inv.invoiceNo,
      paxName: paxNames,
      pnr: pnrs,
      ticketNo: ticketNos,
      route: routes,
      payType: "",
      debit: Number(inv.netTotal || 0),
      credit: 0,
      type: "INVOICE",
      createdAt: inv.createdAt
    })
  })

  // Map ClientTransactions
  currentTransactions.forEach((txn: any) => {
    const isCredit = txn.direction === "receiv"
    ledgerEntries.push({
      id: String(txn._id),
      date: txn.date,
      particulars: txn.invoiceType === "INVOICE" ? "Payment (Invoice)" : 
                   txn.invoiceType === "EXPENSE" ? "Expense" :
                   txn.invoiceType === "BALANCE_TRANSFER" ? "Balance Transfer" : 
                   "Money Receipt",
      voucherNo: txn.voucherNo,
      paxName: "",
      pnr: "",
      ticketNo: "",
      route: "",
      payType: txn.payType ? `${txn.payType}${txn.accountName ? `(${txn.accountName})` : ''}` : "",
      debit: isCredit ? 0 : Number(txn.amount || 0),
      credit: isCredit ? Number(txn.amount || 0) : 0,
      type: txn.invoiceType || "TRANSACTION",
      note: txn.note,
      createdAt: txn.createdAt
    })
  })

  // 6. Sort by Date
  ledgerEntries.sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return dateA - dateB || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  // 7. Calculate Running Balance
  let currentBalance = broughtForward
  const finalLedger = ledgerEntries.map(entry => {
    currentBalance += (entry.debit - entry.credit)
    return { ...entry, balance: currentBalance }
  })

  return {
    client: { 
      name: client.name, 
      mobile: client.phone, 
      email: client.email, 
      address: client.address 
    },
    broughtForward,
    entries: finalLedger,
    totalDebit: finalLedger.reduce((sum, e) => sum + e.debit, 0),
    totalCredit: finalLedger.reduce((sum, e) => sum + e.credit, 0),
    closingBalance: currentBalance
  }
}