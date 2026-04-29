import { endOfDay, parseISO } from "date-fns"
import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Client } from "@/models/client"
import { ClientTransaction } from "@/models/client-transaction"

type ClientBalanceStats = {
  clientId: string
  name: string
  mobile: string
  email: string
  presentDue: number
  presentAdvance: number
  lastBalance: number
  creditLimit: number
}

/**
 * Historical client balances as of `date`.
 *
 * All balance movements (opening, invoices, receipts, adjustments) live in
 * `client_transactions`. The formula is identical to the client-ledger running
 * balance:
 *   debit  = every row whose direction is NOT "receiv"  (invoice, payout, …)
 *   credit = every row whose direction IS  "receiv"
 *   balance = debit − credit  (positive → Due, negative → Advance)
 *
 * No separate Invoice or openingBalance lookup needed.
 */
export async function getClientsTotalDueAdvance(
  date: string,
  clientId?: string
): Promise<ClientBalanceStats[]> {
  await connectMongoose()

  const targetDate = date || new Date().toISOString().slice(0, 10)

  // ── 1. Fetch matching active clients ────────────────────────────────────────
  const clientMatch: Record<string, unknown> = { active: true }
  if (clientId && Types.ObjectId.isValid(clientId)) {
    clientMatch._id = new Types.ObjectId(clientId)
  }

  const clients = await Client.find(clientMatch).lean() as any[]
  if (clients.length === 0) return []

  // ── 2. Aggregate transaction totals (debit / credit) per client ────────────
  const clientIds = clients.map((c) => c._id)

  const txnStats: { _id: { clientId: Types.ObjectId; isCredit: boolean }; total: number }[] =
    await ClientTransaction.aggregate([
      {
        $match: {
          clientId: { $in: clientIds },
          date: { $lte: endOfDay(parseISO(targetDate)) },
        },
      },
      {
        $group: {
          _id: {
            clientId: "$clientId",
            isCredit: { $eq: ["$direction", "receiv"] },
          },
          total: { $sum: "$amount" },
        },
      },
    ])

  // ── 3. Build a per-client balance map ──────────────────────────────────────
  const balanceMap = new Map<string, { debit: number; credit: number }>()
  for (const stat of txnStats) {
    const cid = String(stat._id.clientId)
    if (!balanceMap.has(cid)) balanceMap.set(cid, { debit: 0, credit: 0 })
    const entry = balanceMap.get(cid)!
    if (stat._id.isCredit) entry.credit += Number(stat.total)
    else                   entry.debit  += Number(stat.total)
  }

  // ── 4. Shape final rows ────────────────────────────────────────────────────
  return clients.map((doc) => {
    const cid = String(doc._id)
    const { debit = 0, credit = 0 } = balanceMap.get(cid) ?? {}
    const calculatedBalance = debit - credit

    return {
      clientId: cid,
      name:         doc.name || "",
      mobile:       doc.phone || "",
      email:        doc.email || "",
      presentDue:      calculatedBalance > 0 ? calculatedBalance       : 0,
      presentAdvance:  calculatedBalance < 0 ? Math.abs(calculatedBalance) : 0,
      lastBalance:  Number(doc.presentBalance || 0),
      creditLimit:  Number(doc.creditLimit    || 0),
    }
  })
}
