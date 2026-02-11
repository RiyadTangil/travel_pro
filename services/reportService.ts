
import connectMongoose from "@/lib/mongoose"
import { Client } from "@/models/client"
import { Invoice } from "@/models/invoice"
import { ClientTransaction } from "@/models/client-transaction"
import { Types } from "mongoose"

type ClientBalanceStats = {
  clientId: string
  name: string
  mobile: string
  email: string
  presentDue: number
  presentAdvance: number
  lastBalance: number // Current balance from DB
  creditLimit: number
}

export async function getClientsTotalDueAdvance(date: string, clientId?: string) {
  await connectMongoose()

  // Ensure models are registered
  // accessing them triggers registration if not already done
  const _c = Client
  const _i = Invoice
  const _t = ClientTransaction

  const matchStage: any = { active: true }
  // Check if isDeleted exists in schema or usage? safely ignore for now or check usage
  // Based on invoice-lookups, it uses isDeleted: { $ne: true }
  // But Client model snippet didn't show it. We'll add it to be safe if it exists in DB
  // matchStage.isDeleted = { $ne: true } 
  
  if (clientId && Types.ObjectId.isValid(clientId)) {
    matchStage._id = new Types.ObjectId(clientId)
  }

  const targetDate = date || new Date().toISOString().slice(0, 10)

  const pipeline: any[] = [
    { $match: matchStage },
    {
      $lookup: {
        from: "invoices",
        let: { cid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$clientId", "$$cid"] },
                  { $lte: ["$salesDate", targetDate] }
                ]
              }
            }
          },
          { $group: { _id: null, total: { $sum: "$netTotal" } } }
        ],
        as: "invStats"
      }
    },
    {
      $lookup: {
        from: "client_transactions",
        let: { cid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$clientId", "$$cid"] },
                  { $lte: ["$date", targetDate] }
                ]
              }
            }
          },
          { $group: { _id: "$direction", total: { $sum: "$amount" } } }
        ],
        as: "txnStats"
      }
    },
    {
      $project: {
        name: 1,
        phone: 1,
        email: 1,
        presentBalance: 1, // This is "Last Balance" (Current)
        creditLimit: 1,
        openingBalanceType: 1,
        openingBalanceAmount: 1,
        invTotal: { $ifNull: [{ $arrayElemAt: ["$invStats.total", 0] }, 0] },
        txnStats: 1
      }
    }
  ]

  const results = await Client.aggregate(pipeline)

  // Process results in JS to avoid complex Mongo logic for array reducing
  const processed = results.map(doc => {
    // 1. Calculate Opening Balance
    let opening = 0
    if (doc.openingBalanceType === "Due") opening = Number(doc.openingBalanceAmount || 0)
    else if (doc.openingBalanceType === "Advance") opening = -Number(doc.openingBalanceAmount || 0)

    // 2. Invoice Total (Debit)
    const invTotal = Number(doc.invTotal || 0)

    // 3. Transaction Totals
    let txnDebit = 0 // Payout (giving money to client? No, usually payout means expense... wait)
    // In clientLedgerService:
    // payout = preTxnDebit (increases balance? No.)
    // Brought Forward = Opening + (PreInvoice + PreTxnDebit) - PreTxnCredit
    // So Debit adds to balance (Due), Credit subtracts (Advance).
    // Invoice = Debit.
    // Payment (Receiv) = Credit.
    // What is Payout? If we give money back to client? -> Debit.
    
    let txnCredit = 0

    if (Array.isArray(doc.txnStats)) {
      doc.txnStats.forEach((s: any) => {
        if (s._id === "payout") txnDebit += s.total
        if (s._id === "receiv") txnCredit += s.total
      })
    }

    // 4. Calculate Balance up to Date
    const calculatedBalance = opening + invTotal + txnDebit - txnCredit

    return {
      clientId: String(doc._id),
      name: doc.name,
      mobile: doc.phone || "",
      email: doc.email || "N/A",
      presentDue: calculatedBalance > 0 ? calculatedBalance : 0,
      presentAdvance: calculatedBalance < 0 ? Math.abs(calculatedBalance) : 0,
      lastBalance: Number(doc.presentBalance || 0), // The DB current balance
      creditLimit: doc.creditLimit || 0
    }
  })

  // Filter out zero balances? The image shows rows with 0 due/advance.
  // We keep all active clients or maybe only those with activity?
  // User image shows "You have total: Results".
  // I will return all active clients.

  return processed
}
