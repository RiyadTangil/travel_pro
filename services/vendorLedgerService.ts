import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { InvoiceItem } from "@/models/invoice-item"
import { VendorPayment } from "@/models/vendor-payment"
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
  if (vendor.openingBalanceType === "advance") {
    openingBalance = -Math.abs(openingBalance)
  } else {
    // Default to Due (Positive)
    openingBalance = Math.abs(openingBalance)
  }
  
  // Logic check: usually opening balance is "Due" (Payable) positive? or "Advance" negative?
  // Let's assume standard: Positive = Due/Payable to Vendor. Negative = Advance/Receivable from Vendor.
  
  // 2. Fetch Invoices (COSTS -> CREDIT for Vendor, DEBIT for Us? No, Vendor Ledger usually: 
  // Credit = We owe them (Invoice Cost)
  // Debit = We paid them (Payment)
  // Balance = Credit - Debit (Amount we owe)
  
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

  // 3. Fetch Vendor Payments (PAYMENTS -> DEBIT for Vendor)
  const paymentFacet = await VendorPayment.aggregate([
    { 
      $match: { 
        $or: [
          { vendorId: vendorObjectId },
          { "invoiceVendors.vendorId": vendorObjectId }
        ]
      } 
    },
    {
      $facet: {
        pre: [
          { $match: { paymentDate: { $lt: dateFrom || "0000-00-00" } } },
          // Unwind to filter specific vendor amount in invoiceVendors array
          { $unwind: { path: "$invoiceVendors", preserveNullAndEmptyArrays: true } },
          { 
            $match: { 
              $or: [
                { vendorId: vendorObjectId },
                { "invoiceVendors.vendorId": vendorObjectId }
              ]
            } 
          },
          { 
            $group: { 
              _id: null, 
              // If paymentTo is invoice, sum invoiceVendors.amount. Else sum main amount.
              total: { 
                $sum: { 
                  $cond: [
                    { $eq: ["$paymentTo", "invoice"] }, 
                    "$invoiceVendors.amount", 
                    "$amount" 
                  ] 
                } 
              } 
            } 
          }
        ],
        curr: [
          { 
            $match: { 
              paymentDate: { 
                $gte: dateFrom || "0000-00-00", 
                $lte: dateTo || "9999-12-31" 
              } 
            } 
          }
        ]
      }
    }
  ])

  const prePaymentTotal = paymentFacet[0].pre[0]?.total || 0
  const currentPayments = paymentFacet[0].curr || []

  // 4. Calculate Brought Forward
  // Balance = Opening + Costs - Payments
  let broughtForward = openingBalance
  if (dateFrom) {
    broughtForward = openingBalance + preCostTotal - prePaymentTotal
  } else {
    broughtForward = openingBalance
  }

  // 5. Map to Ledger Entries
  const ledgerEntries: any[] = []

  // Map Costs (Debit)
  currentCosts.forEach((item: any) => {
    ledgerEntries.push({
      id: String(item._id),
      date: item.createdAt, // Or Invoice Sales Date? Usually Item Created Date is fine
      particulars: `Invoice Cost: ${item.product || 'Service'}`,
      voucherNo: item.invoice?.invoiceNo || item.invoiceId,
      paxName: item.paxName,
      debit: Number(item.totalCost || 0),
      credit: 0,
      type: "INVOICE_COST",
      note: item.description,
      createdAt: item.createdAt
    })
  })

  // Map Payments (Credit)
  currentPayments.forEach((pay: any) => {
    // Determine amount for this vendor
    let amount = 0
    if (pay.paymentTo === "invoice") {
      const vItem = pay.invoiceVendors?.find((v: any) => String(v.vendorId) === vendorId)
      amount = vItem ? Number(vItem.amount) : 0
    } else {
      amount = Number(pay.amount || 0)
    }

    if (amount > 0) {
      ledgerEntries.push({
        id: String(pay._id),
        date: pay.paymentDate,
        particulars: "Vendor Payment",
        voucherNo: pay.voucherNo,
        paxName: "",
        debit: 0,
        credit: amount,
        type: "PAYMENT",
        payType: pay.paymentMethod,
        note: pay.note,
        createdAt: pay.createdAt || pay.paymentDate // Fallback
      })
    }
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
    currentBalance += (entry.debit - entry.credit) // Debit increases Due, Credit decreases
    return { ...entry, balance: currentBalance }
  })

  return {
    vendor: { 
      name: vendor.name, 
      mobile: vendor.mobile, 
      email: vendor.email, 
      address: vendor.address 
    },
    broughtForward,
    entries: finalLedger,
    totalDebit: finalLedger.reduce((sum, e) => sum + e.debit, 0),
    totalCredit: finalLedger.reduce((sum, e) => sum + e.credit, 0),
    closingBalance: currentBalance
  }
}