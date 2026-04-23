import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Vendor } from "@/models/vendor"
import { InvoiceItem } from "@/models/invoice-item"
import { ClientTransaction } from "@/models/client-transaction"

type VendorBalanceStats = {
  vendorId: string
  name: string
  mobile: string
  email: string
  presentDue: number
  presentAdvance: number
  lastBalance: number
}

/**
 * Historical vendor balances as of `date`.
 *
 * Mirrors the two-stream design of vendorLedgerService:
 *
 * Stream A — Invoice costs (InvoiceItem → Invoice for salesDate)
 *   credit += totalCost   (we owe the vendor for work done)
 *
 * Stream B — Payments & opening balance (ClientTransaction, vendorId)
 *   payout direction → debit  (we paid the vendor)
 *   receiv direction → credit (vendor returned advance / opening advance)
 *
 * balance = credit_A + credit_B − debit_B
 *   positive → Due (we owe vendor)
 *   negative → Advance (vendor owes us)
 */
export async function getVendorsTotalDueAdvance(
  date: string,
  vendorId?: string
): Promise<VendorBalanceStats[]> {
  await connectMongoose()

  const targetDate = date || new Date().toISOString().slice(0, 10)

  // ── 1. Fetch matching vendors ──────────────────────────────────────────────
  const vendorMatch: Record<string, unknown> = {}
  if (vendorId && Types.ObjectId.isValid(vendorId)) {
    vendorMatch._id = new Types.ObjectId(vendorId)
  }

  const vendors = await Vendor.find(vendorMatch).lean() as any[]
  if (vendors.length === 0) return []

  const vendorIds = vendors.map((v) => v._id)

  // ── 2. Invoice costs up to targetDate ─────────────────────────────────────
  // Join InvoiceItem → Invoice to get salesDate, then filter by salesDate.
  const costStats: { _id: Types.ObjectId; totalCost: number }[] =
    await InvoiceItem.aggregate([
      {
        $match: {
          vendorId: { $in: vendorIds },
          isDeleted: { $ne: true },
        },
      },
      {
        $lookup: {
          from: "invoices",
          localField: "invoiceId",
          foreignField: "_id",
          as: "inv",
        },
      },
      { $unwind: { path: "$inv", preserveNullAndEmptyArrays: false } },
      { $match: { "inv.salesDate": { $lte: targetDate } } },
      {
        $group: {
          _id: "$vendorId",
          totalCost: { $sum: "$totalCost" },
        },
      },
    ])

  // ── 3. ClientTransaction totals per vendor up to targetDate ───────────────
  // Includes opening balance (opening_balance type) and payment rows.
  // Excludes any stale direction:"invoice" rows from before the refactor.
  const txnStats: { _id: { vendorId: Types.ObjectId; direction: string }; total: number }[] =
    await ClientTransaction.aggregate([
      {
        $match: {
          vendorId: { $in: vendorIds },
          date: { $lte: targetDate },
          direction: { $ne: "invoice" },
        },
      },
      {
        $group: {
          _id: {
            vendorId:  "$vendorId",
            direction: "$direction",
          },
          total: { $sum: "$amount" },
        },
      },
    ])

  // ── 4. Build lookup maps ───────────────────────────────────────────────────
  const costMap = new Map<string, number>()
  for (const stat of costStats) {
    costMap.set(String(stat._id), Number(stat.totalCost))
  }

  const txnMap = new Map<string, { payout: number; receiv: number }>()
  for (const stat of txnStats) {
    const vid = String(stat._id.vendorId)
    if (!txnMap.has(vid)) txnMap.set(vid, { payout: 0, receiv: 0 })
    const entry = txnMap.get(vid)!
    if (stat._id.direction === "payout") entry.payout += Number(stat.total)
    else if (stat._id.direction === "receiv") entry.receiv += Number(stat.total)
  }

  // ── 5. Shape final rows ────────────────────────────────────────────────────
  return vendors.map((doc) => {
    const vid = String(doc._id)
    const costs                  = costMap.get(vid) ?? 0
    const { payout = 0, receiv = 0 } = txnMap.get(vid) ?? {}

    // balance = costs(credit) + receiv(credit) − payout(debit)
    const calculatedBalance = costs + receiv - payout

    // Parse current DB balance for "Last Balance" column
    let lastBalance = 0
    const pb = doc.presentBalance as any
    if (pb && typeof pb === "object") {
      const amt = Number(pb.amount || 0)
      lastBalance = pb.type === "advance" ? -amt : amt
    } else {
      lastBalance = Number(pb || 0)
    }

    return {
      vendorId:       vid,
      name:           doc.name    || "",
      mobile:         doc.mobile  || "",
      email:          doc.email   || "",
      presentDue:     calculatedBalance > 0 ? calculatedBalance          : 0,
      presentAdvance: calculatedBalance < 0 ? Math.abs(calculatedBalance) : 0,
      lastBalance,
    }
  })
}
