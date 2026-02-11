
import connectMongoose from "@/lib/mongoose"
import { Vendor } from "@/models/vendor"
import { InvoiceItem } from "@/models/invoice-item"
import { ClientTransaction } from "@/models/client-transaction"
import { Types } from "mongoose"

export async function getVendorsTotalDueAdvance(date: string, vendorId?: string) {
  await connectMongoose()

  const matchStage: any = { }
  // Check if vendors have deleted flag
  // Based on invoice-lookups, vendors don't seem to have isDeleted check in snippet, but standard practice.
  // We'll proceed without it unless we see it in model.
  
  if (vendorId && Types.ObjectId.isValid(vendorId)) {
    matchStage._id = new Types.ObjectId(vendorId)
  }

  const targetDate = date || new Date().toISOString().slice(0, 10)

  const pipeline: any[] = [
    { $match: matchStage },
    {
      $lookup: {
        from: "invoice_items",
        let: { vid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$vendorId", "$$vid"] },
                  { $lte: ["$createdAt", targetDate] }
                ]
              }
            }
          },
          { $group: { _id: null, total: { $sum: "$totalCost" } } }
        ],
        as: "invStats"
      }
    },
    {
      $lookup: {
        from: "client_transactions",
        let: { vid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { 
                    $or: [
                      { $eq: ["$vendorId", "$$vid"] },
                      // { $eq: ["$clientId", "$$vid"] } // if needed
                    ] 
                  },
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
        mobile: 1,
        email: 1,
        presentBalance: 1, // Current DB Balance
        openingBalance: 1,
        openingBalanceType: 1,
        costTotal: { $ifNull: [{ $arrayElemAt: ["$invStats.total", 0] }, 0] },
        txnStats: 1
      }
    }
  ]

  const results = await Vendor.aggregate(pipeline)

  const processed = results.map(doc => {
    // 1. Calculate Opening Balance
    let opening = Number(doc.openingBalance || 0)
    if (doc.openingBalanceType === "advance") {
      opening = -Math.abs(opening)
    } else {
      opening = Math.abs(opening)
    }

    // 2. Invoice Costs (Credit -> Increases Liability/Due)
    const costs = Number(doc.costTotal || 0)

    // 3. Transactions
    let txnDebit = 0  // Payout (We paid vendor -> Reduces Liability)
    let txnCredit = 0 // Receiv (Vendor returned -> Increases Liability/Reduces Advance)

    if (Array.isArray(doc.txnStats)) {
      doc.txnStats.forEach((s: any) => {
        if (s._id === "payout") txnDebit += s.total
        if (s._id === "receiv") txnCredit += s.total
      })
    }

    // 4. Calculate Balance up to Date
    // Balance = Opening + Costs + Receiv - Payout
    const calculatedBalance = opening + costs + txnCredit - txnDebit

    // Current DB Balance parsing
    let lastBalance = 0
    if (doc.presentBalance) {
        if (typeof doc.presentBalance === 'object') {
            const amt = Number(doc.presentBalance.amount || 0)
            lastBalance = doc.presentBalance.type === 'advance' ? -amt : amt
        } else {
            lastBalance = Number(doc.presentBalance || 0)
        }
    }

    return {
      vendorId: String(doc._id),
      name: doc.name,
      mobile: doc.mobile || "",
      email: doc.email || "N/A",
      presentDue: calculatedBalance > 0 ? calculatedBalance : 0,
      presentAdvance: calculatedBalance < 0 ? Math.abs(calculatedBalance) : 0,
      lastBalance: lastBalance 
    }
  })

  return processed
}
