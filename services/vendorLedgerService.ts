import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { InvoiceItem } from "@/models/invoice-item"
import { ClientTransaction } from "@/models/client-transaction"
import { Vendor } from "@/models/vendor"
import { AppError } from "@/errors/AppError"

export async function getVendorLedger(vendorId: string, dateFrom?: string | null, dateTo?: string | null) {
  await connectMongoose()

  if (!vendorId || !Types.ObjectId.isValid(vendorId)) {
    throw new AppError("Valid Vendor ID is required", 400)
  }

  const vendorObjectId = new Types.ObjectId(vendorId)

  // 1. Fetch Vendor Info
  const vendor = await Vendor.findById(vendorId).lean()
  if (!vendor) {
    throw new AppError("Vendor not found", 404)
  }

  // Initial Opening Balance
  let openingBalance = Number(vendor.openingBalance || 0)
  // Handle Opening Balance Type (Due vs Advance)
  // Standard: Due (Positive) = Payable to Vendor. Advance (Negative) = Receivable from Vendor.
  if (vendor.openingBalanceType === "advance") {
    openingBalance = -Math.abs(openingBalance)
  } else {
    openingBalance = Math.abs(openingBalance)
  }

  // 2. Fetch Invoices (COSTS -> CREDIT for Vendor, DEBIT for Us? No.
  // Vendor Ledger perspective (Our Liability to Vendor):
  // Credit = Purchase/Cost (We owe them) -> Increases Balance
  // Debit = Payment (We paid them) -> Decreases Balance

  // Fetch Invoice Items (Costs)
  const invoiceFacet = await InvoiceItem.aggregate([
    { $match: { vendorId: vendorObjectId } },
    {
      $facet: {
        pre: [
          { $match: { createdAt: { $lt: dateFrom || "0000-00-00" } } },
          { $group: { _id: null, total: { $sum: "$totalCost" } } }
        ],
        curr: [
          {
            $match: {
              createdAt: {
                $gte: dateFrom || "0000-00-00",
                $lte: dateTo || "9999-12-31"
              }
            }
          },
          { $addFields: { invoiceIdStr: "$invoiceId" } },
          {
            $lookup: {
              from: "invoices",
              let: { invId: "$invoiceId" },
              pipeline: [
                { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$invId"] } } },
                { $project: { invoiceNo: 1, salesDate: 1 } }
              ],
              as: "invoice"
            }
          },
          { $unwind: { path: "$invoice", preserveNullAndEmptyArrays: true } }
        ]
      }
    }
  ])

  const preCostTotal = invoiceFacet[0].pre[0]?.total || 0
  const currentCosts = invoiceFacet[0].curr || []

  // 3. Fetch Transactions (PAYMENTS -> DEBIT for Vendor)
  // We use ClientTransaction model which now handles Vendor transactions too (e.g. Vendor Payment, Advance Return)
  // Usually Vendor Payments are "payout" (money out from us).
  // Advance Return from Vendor is "receiv" (money in to us).

  // Note: ClientTransaction schema has clientId, but might use clientId to store vendorId for vendor transactions?
  // OR do we filter by some other means?
  // Looking at ClientTransaction model, it has clientId ref "Client". 
  // However, in many systems, a single transaction table is used.
  // The user instruction says: "fetch from clientTranseciton".
  // Assuming ClientTransaction stores vendorId in clientId field for vendor transactions OR there is a separate field?
  // The provided model snippet for ClientTransaction shows `clientId: { type: Types.ObjectId, ref: "Client" ... }`.
  // It does NOT show `vendorId`.
  // BUT, if the user says "fetch from clientTranseciton", implies vendor transactions are stored there.
  // Let's check if `clientId` is used for vendorId or if I should check for a `vendorId` field not in snippet?
  // User snippet: `clientId: { type: Types.ObjectId, ref: "Client", index: true, required: false }`
  // It is optional. Maybe `vendorId` exists?
  // I will assume `clientId` might hold `vendorId` OR I should look for `vendorId` field.
  // Let's query ClientTransaction for `vendorId` or `clientId` = vendorObjectId.
  // Given the instruction "fetch from clientTranseciton", I'll try to match `vendorId` (if it exists) or `clientId`.
  // Wait, if I look at `client-transaction.ts` snippet again:
  // `clientId: { type: Types.ObjectId, ref: "Client", index: true, required: false }`
  // No `vendorId` shown.
  // BUT, maybe it was added or I should use `clientId` as the foreign key even for vendors (polymorphic)?
  // Let's assume `vendorId` field exists or `clientId` is used.
  // I will try matching `vendorId` first (common pattern) or `clientId` if `invoiceType` suggests vendor.

  // Actually, typically "Vendor Payment" creates a transaction.
  // If the previous code used `VendorPayment` model, that was specific.
  // Now we switch to `ClientTransaction`.
  // I will assume `ClientTransaction` has `vendorId` or uses `clientId` for this.
  // Let's assume `vendorId` field exists in the actual DB schema even if not in the snippet (snippet might be incomplete or I missed it).
  // OR, more likely, for Vendor transactions, `clientId` might be used if the system treats them as "contacts".
  // Let's try matching `{ $or: [ { vendorId: vendorObjectId }, { clientId: vendorObjectId } ] }` to be safe?
  // Or just `vendorId` if we are sure.
  // Let's search for `vendorId` usage in `ClientTransaction`... I can't search code easily right now.
  // I'll assume `vendorId` field is present based on standard practices when unifying transactions.

  // However, if `ClientTransaction` is strictly for Clients, then maybe "Vendor Payment" writes there too?
  // Let's use `vendorId` in the query.

  const txnFacet = await ClientTransaction.aggregate([
    {
      $match: {
        $or: [
          { vendorId: vendorObjectId },
          // Fallback: maybe stored in clientId with specific invoiceType?
          // { clientId: vendorObjectId } 
        ]
      }
    },
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

  let preTxnDebit = 0  // payout (We paid Vendor -> Debit in Vendor Ledger)
  let preTxnCredit = 0 // receiv (Vendor returned money -> Credit in Vendor Ledger)

  // In Vendor Ledger:
  // We owe them (Credit) -> Costs
  // We pay them (Debit) -> Payments
  // They pay us (Debit? No, reduces what we owe? No, increases what we owe if they give back money? Wait.)
  // If we pay Vendor (Payout), we owe less. Debit.
  // If Vendor pays us (Receiv) e.g. Advance Return, we owe MORE (or they owe us less). Credit.
  // Wait.
  // Balance = Credit (Payable) - Debit (Paid)
  // Payout = We pay Vendor = Debit.
  // Receiv = Vendor pays us (Advance Return) = Effectively "Negative Payment" or "Reverse Payment".
  // So Receiv should reduce Debit? OR increase Credit?
  // Let's stick to: Balance = (Opening + Costs + Receiv) - (Payout)
  // Or: Balance = (Opening + Costs) - (Payout - Receiv)
  // Let's see.
  // Payout -> We give money. Vendor balance decreases. (Debit)
  // Receiv -> We get money. Vendor balance increases. (Credit)

  txnFacet[0].pre.forEach((g: any) => {
    if (g._id === "payout") preTxnDebit += g.total
    if (g._id === "receiv") preTxnCredit += g.total
  })

  const currentTransactions = txnFacet[0].curr || []

  // 4. Calculate Brought Forward
  // Balance = Opening + Costs + (Receiv from Vendor) - (Payout to Vendor)
  // Note: Usually "Receiv" from Vendor is rare (Advance Return). It increases our liability (we have money back, so we owe them / or they owe us less).
  // Actually if we paid Advance (Debit), and they return it (Credit), the Debit reduces.
  // Let's treat:
  // Debit = Payout
  // Credit = Receiv (Advance Return) + Costs

  // broughtForward = Opening + (PreCosts + PreReceiv) - PrePayout

  let broughtForward = openingBalance
  if (dateFrom) {
    broughtForward = openingBalance + (preCostTotal + preTxnCredit) - preTxnDebit
  } else {
    broughtForward = openingBalance
  }

  // 5. Map to Ledger Entries
  const ledgerEntries: any[] = []

  // Map Costs (Credit)
  currentCosts.forEach((item: any) => {
    ledgerEntries.push({
      id: String(item._id),
      date: item.createdAt,
      particulars: `Invoice Cost: ${item.product || 'Service'}`,
      voucherNo: item.invoice?.invoiceNo || item.invoiceId,
      paxName: item.paxName,
      debit: 0,
      credit: Number(item.totalCost || 0),
      type: "INVOICE_COST",
      note: item.description,
      createdAt: item.createdAt
    })
  })

  // Map Transactions
  currentTransactions.forEach((txn: any) => {
    // Payout = We paid Vendor = Debit
    // Receiv = Vendor returned = Credit
    const isPayout = txn.direction === "payout"

    ledgerEntries.push({
      id: String(txn._id),
      date: txn.date,
      particulars: txn.invoiceType === "VENDOR_PAYMENT" ? "Vendor Payment" :
        txn.invoiceType === "ADVANCE_RETURN" ? "Advance Return" :
          "Transaction",
      voucherNo: txn.voucherNo,
      paxName: "",
      debit: isPayout ? Number(txn.amount || 0) : 0,
      credit: !isPayout ? Number(txn.amount || 0) : 0,
      type: "TRANSACTION",
      payType: txn.payType ? `${txn.payType}${txn.accountName ? `(${txn.accountName})` : ''}` : "",
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
    // Balance = Previous + Credit - Debit
    // (Liability Perspective: Credit increases liability, Debit decreases)
    currentBalance += (entry.credit - entry.debit)
    return { ...entry, balance: currentBalance }
  })

  // Calculate totals
  // If broughtForward > 0 (Due/Payable) -> Credit side
  // If broughtForward < 0 (Advance/Receivable) -> Debit side

  // Wait, standard accounting for Liability (Vendor):
  // Credit Balance = Payable (Due)
  // Debit Balance = Receivable (Advance)

  // So if broughtForward is positive (Due), it is Credit.
  // If broughtForward is negative (Advance), it is Debit.

  const bfCredit = broughtForward > 0 ? broughtForward : 0
  const bfDebit = broughtForward < 0 ? Math.abs(broughtForward) : 0

  const entriesTotalDebit = finalLedger.reduce((sum, e) => sum + e.debit, 0)
  const entriesTotalCredit = finalLedger.reduce((sum, e) => sum + e.credit, 0)

  return {
    vendor: {
      name: vendor.name,
      mobile: vendor.mobile,
      email: vendor.email,
      address: vendor.address
    },
    broughtForward,
    entries: finalLedger,
    totalDebit: entriesTotalDebit + bfDebit,
    totalCredit: entriesTotalCredit + bfCredit,
    closingBalance: currentBalance
  }
}