import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import mongoose from "mongoose"
import { Invoice } from "@/models/invoice"
import { InvoiceItem } from "@/models/invoice-item"
import { InvoiceTicket } from "@/models/invoice-ticket"
import { InvoiceHotel } from "@/models/invoice-hotel"
import { InvoiceTransport } from "@/models/invoice-transport"
import { InvoicePassport } from "@/models/invoice-passport"
import { Vendor } from "@/models/vendor"
import { Employee } from "@/models/employee"
import { Client } from "@/models/client"
import { MoneyReceipt } from "@/models/money-receipt"
import { MoneyReceiptAllocation } from "@/models/money-receipt-allocation"
import { ClientTransaction } from "@/models/client-transaction"
import { AppError } from "@/errors/AppError"
import { createMoneyReceipt } from "./moneyReceiptService"

function parseNumber(val: any, fallback = 0) {
  const n = parseFloat(val)
  return isNaN(n) ? fallback : n
}

/** Cost attributed to vendor for balance (stored totalCost, else cost × qty). */
function effectiveVendorLineCost(item: any): number {
  const tc = parseNumber(item?.totalCost, 0)
  if (tc > 0) return tc
  const q = parseNumber(item?.quantity, 1)
  const cp = parseNumber(item?.costPrice, 0)
  return q * cp
}

function normalizeVendorObjectId(raw: any): Types.ObjectId | null {
  if (raw == null || raw === "") return null
  const s = String(raw).trim()
  if (!Types.ObjectId.isValid(s)) return null
  return new Types.ObjectId(s)
}

/**
 * Adjust vendor invoice-cost balance. Positive delta = new cost (sets type due like legacy).
 * Negative delta = revert; only $inc + updatedAt so type is not overwritten.
 */
async function adjustVendorInvoiceCostBalance(
  vendorId: Types.ObjectId,
  delta: number,
  now: string,
  session: mongoose.ClientSession
) {
  if (!delta) return
  if (delta > 0) {
    await Vendor.updateOne(
      { _id: vendorId },
      { $inc: { "presentBalance.amount": delta }, $set: { "presentBalance.type": "due", updatedAt: now } },
      { session }
    )
  } else {
    await Vendor.updateOne(
      { _id: vendorId },
      { $inc: { "presentBalance.amount": delta }, $set: { updatedAt: now } },
      { session }
    )
  }
}

// ---------------------------------------------------------------------------
// Vendor-cost aggregation helpers  (prevent N+1 DB round-trips)
// ---------------------------------------------------------------------------

/** Aggregate totalCost per unique vendorId across a list of billing items. */
function buildVendorCostMap(items: any[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of items) {
    const vOid = normalizeVendorObjectId(item.vendorId ?? item.vendor)
    if (!vOid) continue
    const cost = effectiveVendorLineCost(item)
    if (cost <= 0) continue
    const key = vOid.toString()
    map.set(key, (map.get(key) ?? 0) + cost)
  }
  return map
}

/**
 * Apply (or revert) vendor balance changes in parallel — one DB call per UNIQUE vendor.
 * multiplier +1 = apply new cost, -1 = revert old cost
 */
async function applyVendorCostMap(
  map: Map<string, number>,
  multiplier: 1 | -1,
  now: string,
  session: mongoose.ClientSession
) {
  if (map.size === 0) return
  await Promise.all(
    Array.from(map.entries()).map(([vid, cost]) =>
      Types.ObjectId.isValid(vid)
        ? adjustVendorInvoiceCostBalance(new Types.ObjectId(vid), cost * multiplier, now, session)
        : Promise.resolve()
    )
  )
}

// ---------------------------------------------------------------------------
// Advance payment auto-apply helper
// ---------------------------------------------------------------------------

/**
 * When a new invoice is created, find any advance MoneyReceipt records with
 * remainingAmount > 0 for this client and automatically allocate them against
 * the new invoice.  This is the source-of-truth check: we look at the actual
 * advance MR records, NOT the client's running presentBalance (which is a net
 * figure affected by many things and is unreliable as an advance-availability
 * signal).
 *
 * Returns the total amount auto-applied (0 if no advance MRs exist).
 */
async function autoApplyClientAdvanceToInvoice(opts: {
  netTotal: number
  invoiceId: Types.ObjectId
  clientId: Types.ObjectId
  companyId: Types.ObjectId
  now: string
  session: mongoose.ClientSession
}): Promise<number> {
  const { netTotal, invoiceId, clientId, companyId, now, session } = opts

  // Source of truth: find advance MRs that still have unallocated balance
  const advanceMRs = await MoneyReceipt.find({
    clientId,
    companyId,
    paymentTo: "advance",
    remainingAmount: { $gt: 0 },
  }).sort({ createdAt: 1 }).session(session).lean()

  if (!advanceMRs.length) return 0   // no advance to apply

  // Calculate how much we can auto-apply (limited by invoice netTotal)
  const totalAvailable = (advanceMRs as any[]).reduce((s: number, mr: any) => s + parseNumber(mr.remainingAmount, 0), 0)
  const autoApply = Math.min(totalAvailable, netTotal)
  if (autoApply <= 0) return 0

  // Update the invoice to reflect the applied amount
  const newStatus = autoApply >= netTotal ? "paid" : "partial"
  await Invoice.updateOne(
    { _id: invoiceId },
    { $set: { receivedAmount: autoApply, status: newStatus, updatedAt: now } },
    { session }
  )

  // Drain advance MRs (oldest first), creating allocation records so MR
  // voucher numbers appear on the invoice list
  let remaining = autoApply
  for (const mr of advanceMRs as any[]) {
    if (remaining <= 0) break
    const mrRemaining = parseNumber(mr.remainingAmount, 0)
    const toApply = Math.min(remaining, mrRemaining)

    await MoneyReceiptAllocation.create([{
      moneyReceiptId: mr._id,
      invoiceId,
      clientId,
      companyId,
      voucherNo: mr.voucherNo,
      appliedAmount: toApply,
      paymentDate: now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    }], { session })

    const newAllocated = parseNumber(mr.allocatedAmount, 0) + toApply
    const newRemaining = Math.max(0, parseNumber(mr.amount, 0) - parseNumber(mr.discount, 0) - newAllocated)
    await MoneyReceipt.updateOne(
      { _id: mr._id },
      { $set: { allocatedAmount: newAllocated, remainingAmount: newRemaining, updatedAt: now } },
      { session }
    )

    remaining -= toApply
  }

  return autoApply
}

// ---------------------------------------------------------------------------
// Invoice ledger helpers — ClientTransaction audit trail (isMonetoryTranseciton: false)
// ---------------------------------------------------------------------------

/**
 * Create a single ClientTransaction row for an invoice (non-monetary, accounting entry):
 *   • One DEBIT for the client (invoice raised → client owes us, direction "invoice")
 * Vendor costs are NOT stored here — they are derived directly from InvoiceItem records.
 * voucherNo = invoiceNo so it is human-readable and unique per invoice.
 */
async function createInvoiceLedgerTxns(opts: {
  invoiceId: Types.ObjectId
  invoiceNo: string
  salesDate: string
  clientId: Types.ObjectId
  clientName: string
  netTotal: number
  companyId: Types.ObjectId
  now: string
  session: mongoose.ClientSession
}) {
  const { invoiceId, invoiceNo, salesDate, clientId, clientName, netTotal, companyId, now, session } = opts
  if (netTotal <= 0) return

  await ClientTransaction.insertMany([{
    date: salesDate,
    voucherNo: invoiceNo,
    clientId,
    invoiceId,
    clientName,
    companyId,
    invoiceType: "INVOICE",
    amount: netTotal,
    direction: "invoice",
    transactionType: "invoice",
    isMonetoryTranseciton: false,
    note: `Invoice ${invoiceNo}`,
    createdAt: now,
    updatedAt: now,
  }], { session })
}

/** Delete invoice-originated ClientTransaction rows (call on update / delete). */
async function deleteInvoiceLedgerTxns(
  invoiceId: Types.ObjectId | string,
  companyId: Types.ObjectId,
  session: mongoose.ClientSession
) {
  const oid = typeof invoiceId === "string" ? new Types.ObjectId(invoiceId) : invoiceId
  await ClientTransaction.deleteMany(
    { invoiceId: oid, transactionType: "invoice", companyId },
    { session }
  )
}


function pickVendorIdFromItem(i: any): any {
  const raw = i.vendor ?? i.billing_comvendor ?? i.vendorId
  if (raw && typeof raw === "object" && "_id" in raw) return String((raw as any)._id)
  return raw
}

function normalizePayload(body: any) {
  const invoiceType = body.invoiceType || "standard"
  const general = body.general || body
  const now = new Date().toISOString()

  // 1. Normalize Summary Totals 
  const billing = body.billing || {}
  const itemsRaw = Array.isArray(body.items) ? body.items : (Array.isArray(billing.items) ? billing.items : (Array.isArray(body.billing_information) ? body.billing_information : []))

  const subtotal = parseNumber(billing.subtotal ?? body.invoice_sub_total ?? itemsRaw.reduce((s: number, i: any) => s + parseNumber(i.billing_subtotal ?? i.totalSales ?? 0), 0))
  const totalCost = parseNumber(billing.totalCost ?? itemsRaw.reduce((s: number, i: any) => s + parseNumber(i.totalCost ?? 0), 0))
  const discount = parseNumber(billing.discount ?? body.billing_discount ?? body.discount ?? 0)
  const serviceCharge = parseNumber(billing.serviceCharge ?? body.service_charge ?? 0)
  const vatTax = parseNumber(billing.vatTax ?? body.vat_tax ?? 0)
  const netTotal = parseNumber(body.invoice_net_total ?? billing.netTotal ?? (subtotal - discount + serviceCharge + vatTax))

  // 2. Normalize Line Items 
  let normalizedItems: any[] = []

  if (invoiceType === "visa") {
    // Visa: Billing rows + Passport list 
    normalizedItems = itemsRaw.map((i: any) => ({
      itemType: "visa",
      product: i.product || i.billing_product_id || "Visa Service",
      paxName: i.paxName || i.pax_name || "",
      description: i.description || i.billing_description || "",
      quantity: parseNumber(i.quantity ?? i.billing_quantity ?? 1),
      unitPrice: parseNumber(i.unitPrice ?? i.billing_unit_price ?? 0),
      costPrice: parseNumber(i.costPrice ?? i.billing_cost_price ?? 0),
      totalSales: parseNumber(i.totalSales ?? i.billing_total_sales ?? i.billing_subtotal ?? 0),
      totalCost: parseNumber(i.totalCost ?? 0),
      profit: parseNumber(i.profit ?? i.billing_profit ?? 0),
      vendorId: pickVendorIdFromItem(i),
      // Visa specific fields flattened directly for saving 
      country: i.country,
      visaType: i.visaType,
      visaDuration: i.visaDuration,
      token: i.token,
      delivery: i.delivery,
      visaNo: i.visaNo,
      mofaNo: i.mofaNo,
      okalaNo: i.okalaNo,
    }))
  } else {
    // Standard: Mixed rows 
    normalizedItems = itemsRaw.map((i: any) => {
      const type = i.itemType || (i.hotelName ? "hotel" : (i.ticketNo ? "ticket" : (i.transportType ? "transport" : "product")))
      return {
        itemType: type,
        product: i.product || i.billing_product_id || i.hotelName || i.ticketNo || i.transportType || "Service",
        paxName: i.paxName || i.pax_name || "",
        description: i.description || i.billing_description || "",
        quantity: parseNumber(i.quantity ?? i.billing_quantity ?? 1),
        unitPrice: parseNumber(i.unitPrice ?? i.billing_unit_price ?? 0),
        costPrice: parseNumber(i.costPrice ?? i.billing_cost_price ?? 0),
        totalSales: parseNumber(i.totalSales ?? i.billing_total_sales ?? i.billing_subtotal ?? 0),
        totalCost: parseNumber(i.totalCost ?? 0),
        profit: parseNumber(i.profit ?? i.billing_profit ?? 0),
        vendorId: pickVendorIdFromItem(i),
      }
    })
  }

  return {
    invoiceType,
    general: {
      invoiceNo: String(general.invoiceNo || "").trim(),
      salesDate: String(general.salesDate || now),
      dueDate: general.dueDate || "",
      clientId: general.clientId,
      employeeId: general.employeeId,
      agentId: general.agentId,
    },
    items: normalizedItems,
    summary: {
      subtotal,
      totalCost,
      discount,
      serviceCharge,
      vatTax,
      netTotal,
      note: String(billing.note || body.billing_note || ''),
      reference: String(billing.reference || body.billing_reference || ''),
    },
    globalDetails: {
      tickets: body.ticket || body.ticketInfo || [],
      hotels: body.hotel || body.hotel_information || [],
      transports: body.transport || body.transport_information || [],
      passports: body.passport || body.passport_information || [],
    },
    moneyReceipt: body.moneyReceipt,
    showPrevDue: !!(general.invoice_show_prev_due || body.showPrevDue),
    showDiscount: !!(general.invoice_show_discount || body.showDiscount),
    agentCommission: parseNumber(body.invoice_agent_com_amount ?? 0),
    clientPreviousDue: parseNumber(body.invoice_client_previous_due ?? 0),
  }
}

export async function getInvoiceById(id: string, companyId: string) {
  await connectMongoose()
  if (!companyId) throw new AppError("Company ID is required", 401)
  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid ID", 400)
  
  const companyIdObj = new Types.ObjectId(companyId)
  const inv = await Invoice.findOne({ _id: new Types.ObjectId(id), companyId: companyIdObj }).lean()
  if (!inv) throw new AppError("Not found", 404)
  
  const invId = inv._id
  // Fetch children with compatibility for existing String invoiceId
  const [items, tickets, hotels, transports, passports] = await Promise.all([
    InvoiceItem.find({ invoiceId: invId, companyId: companyIdObj, isDeleted: { $ne: true } }).lean(),
    InvoiceTicket.find({ invoiceId: invId, companyId: companyIdObj, isDeleted: { $ne: true } }).lean(),
    InvoiceHotel.find({ invoiceId: invId, companyId: companyIdObj, isDeleted: { $ne: true } }).lean(),
    InvoiceTransport.find({ invoiceId: invId, companyId: companyIdObj, isDeleted: { $ne: true } }).lean(),
    InvoicePassport.find({ invoiceId: invId, companyId: companyIdObj, isDeleted: { $ne: true } }).lean(),
  ])

  // Collect vendor references
  const vendorIds = Array.from(new Set((items || []).map(i => String(i.vendorId || "")).filter(Boolean)))
  const vendorObjectIds = vendorIds.filter(Types.ObjectId.isValid).map((s) => new Types.ObjectId(s))
  const vendorDocs = vendorObjectIds.length ? await Vendor.find({ _id: { $in: vendorObjectIds }, companyId: companyIdObj }).lean() : []
  const vendors = vendorDocs.map(v => ({ id: String(v._id), name: v.name || "", email: v.email || "", mobile: v.mobile || "" }))

  // Collect product names for items
  const productIds = Array.from(new Set((items || []).map(i => String(i.product || "")).filter(p => Types.ObjectId.isValid(p))))
  const productDocs = productIds.length ? await mongoose.connection?.db?.collection("products").find({ _id: { $in: productIds.map(pid => new Types.ObjectId(pid)) } }).toArray() : []
  const productMap = new Map<string, string>()
  productDocs?.forEach((p: any) => productMap.set(String(p._id), p.product_name))

  const normalizedItems = (items || []).map((i: any) => ({
    ...i,
    productName: productMap.get(String(i.product)) || i.product
  }))

  // Include employee detail for the selected salesBy
  let employees: any[] = []
  if (inv.employeeId && Types.ObjectId.isValid(String(inv.employeeId))) {
    const e = await Employee.findOne({ _id: inv.employeeId, companyId: companyIdObj }).lean()
    if (e) {
      employees = [{ id: String(e._id), name: e.name || "", department: e.department || "", designation: e.designation || "", mobile: e.mobile || "", email: e.email || "" }]
    }
  }

  // Normalize child collections to UI-aligned shapes for edit prefill
  const mapTickets = (tickets || []).map((t: any, idx: number) => ({
    id: t.id || String(t._id || Date.now() + idx),
    ticketNo: t.ticketNo || "",
    pnr: t.pnr || "",
    route: t.route || ((t.fromAirport && t.toAirport) ? `${t.fromAirport}->${t.toAirport}` : ""),
    referenceNo: t.referenceNo || "",
    journeyDate: t.journeyDate || t.flightDate || "",
    returnDate: t.returnDate || "",
    airline: t.airline || "",
  }))
  const mapHotels = (hotels || []).map((h: any, idx: number) => ({
    id: h.id || String(h._id || Date.now() + idx),
    hotelName: h.hotelName || "",
    referenceNo: h.referenceNo || "",
    checkInDate: h.checkInDate || h.checkIn || "",
    checkOutDate: h.checkOutDate || h.checkOut || "",
    roomType: h.roomType || "",
  }))
  const mapTransports = (transports || []).map((tr: any, idx: number) => ({
    id: tr.id || String(tr._id || Date.now() + idx),
    transportType: tr.transportType || "",
    referenceNo: tr.referenceNo || "",
    pickupPlace: tr.pickupPlace || "",
    pickupTime: tr.pickupTime || "",
    dropOffPlace: tr.dropOffPlace || "",
    dropoffTime: tr.dropoffTime || "",
  }))

  const billingWithItems = { ...(inv.billing || {}), items: normalizedItems }
  
  // Fetch client details for prefill
  let clients: any[] = []
  if (inv.clientId && Types.ObjectId.isValid(String(inv.clientId))) {
    const c = await Client.findOne({ _id: inv.clientId, companyId: companyIdObj }).lean()
    if (c) {
      clients = [{ id: String(c._id), name: c.name || "", phone: c.phone || "", email: c.email || "" }]
    }
  }

  // Fetch agent details for prefill
  let agents: any[] = []
  if (inv.agentId && Types.ObjectId.isValid(String(inv.agentId))) {
    const db = mongoose.connection?.db
    if (db) {
      const a = await db.collection("agents").findOne({ _id: new Types.ObjectId(String(inv.agentId)), companyId: companyIdObj })
      if (a) {
        agents = [{ id: String(a._id), name: a.name || "", email: a.email || "", mobile: a.mobile || a.phone || "" }]
      }
    }
  }

  return {
    invoice: { ...inv, id: String(invId), billing: billingWithItems, tickets: mapTickets, hotels: mapHotels, transports: mapTransports, passports },
    vendors,
    employees,
    clients,
    agents
  }
}


export async function listInvoices(params: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  invoiceType?: string
  dateFrom?: string
  dateTo?: string
  clientId?: string
  companyId: string
}) {
  await connectMongoose()
  if (!params.companyId) throw new AppError("Company ID is required", 401)
  
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.max(1, Math.min(100, Number(params.pageSize) || 20))
  const skip = (page - 1) * pageSize

  const companyIdObj = new Types.ObjectId(params.companyId)
  const filter: any = { isDeleted: { $ne: true }, companyId: companyIdObj }
  if (params.clientId) filter.clientId = new Types.ObjectId(params.clientId)
  if (params.status) filter.status = params.status
  if (params.invoiceType) {
    filter.invoiceType = params.invoiceType
  } 
  
  console.log("Filter:", filter)
  
  if (params.search) {
    filter.$or = [
      { invoiceNo: { $regex: params.search, $options: "i" } },
      { clientName: { $regex: params.search, $options: "i" } },
      { salesByName: { $regex: params.search, $options: "i" } },
    ]
  }
  if (params.dateFrom || params.dateTo) {
    filter.salesDate = {}
    if (params.dateFrom) filter.salesDate.$gte = params.dateFrom
    if (params.dateTo) filter.salesDate.$lte = params.dateTo
  }

  const result = await Invoice.aggregate([
    { $match: filter },
    { $sort: { salesDate: -1, createdAt: -1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: pageSize },
          // Lookup passports
          {
            $lookup: {
              from: "invoice_passports",
              let: { invoiceId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$invoiceId", "$$invoiceId"] },
                        { $ne: ["$isDeleted", true] }
                      ]
                    }
                  }
                },
                { $project: { passportNo: 1, _id: 0 } }
              ],
              as: "passports"
            }
          },
          // Lookup MRs via allocations (covers both "invoice" and "overall" payment types)
          {
            $lookup: {
              from: "money_receipt_allocations",
              let: { invoiceId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$invoiceId", "$$invoiceId"] }
                  }
                },
                { $project: { voucherNo: 1, _id: 0 } }
              ],
              as: "moneyReceipts"
            }
          },
          // Projection
          {
            $project: {
              id: { $toString: "$_id" },
              clientId: { $toString: { $ifNull: ["$clientId", ""] } },
              invoiceNo: 1,
              clientName: { $ifNull: ["$clientName", ""] },
              clientPhone: { $ifNull: ["$clientPhone", ""] },
              salesDate: 1,
              dueDate: { $ifNull: ["$dueDate", ""] },
              salesPrice: { $ifNull: ["$netTotal", 0] },
              totalCost: { $ifNull: ["$billing.totalCost", 0] },
              receivedAmount: { $ifNull: ["$receivedAmount", 0] },
              dueAmount: {
                $max: [
                  0,
                  {
                    $subtract: [
                      { $ifNull: ["$netTotal", 0] },
                      { $ifNull: ["$receivedAmount", 0] }
                    ]
                  }
                ]
              },
              mrNo: {
                $reduce: {
                  input: "$moneyReceipts.voucherNo",
                  initialValue: "",
                  in: {
                    $cond: [
                      { $eq: ["$$value", ""] },
                      "$$this",
                      { $concat: ["$$value", ", ", "$$this"] }
                    ]
                  }
                }
              },
              passportNo: {
                $reduce: {
                  input: {
                    $filter: {
                      input: "$passports.passportNo",
                      as: "p",
                      cond: { $and: [{ $ne: ["$$p", null] }, { $ne: ["$$p", ""] }] }
                    }
                  },
                  initialValue: "",
                  in: {
                    $cond: [
                      { $eq: ["$$value", ""] },
                      "$$this",
                      { $concat: ["$$value", ", ", "$$this"] }
                    ]
                  }
                }
              },
              salesBy: { $ifNull: ["$salesByName", ""] },
              status: { $ifNull: ["$status", "due"] },
              invoiceType: { $ifNull: ["$invoiceType", "standard"] },
              createdAt: { $ifNull: ["$createdAt", { $toString: "$$NOW" }] },
              updatedAt: { $ifNull: ["$updatedAt", { $toString: "$$NOW" }] },
              country: {
                $cond: {
                  if: { $eq: ["$invoiceType", "visa"] },
                  then: { $arrayElemAt: ["$billing.items.country", 0] },
                  else: "$$REMOVE"
                }
              },
              visaType: {
                $cond: {
                  if: { $eq: ["$invoiceType", "visa"] },
                  then: { $arrayElemAt: ["$billing.items.visaType", 0] },
                  else: "$$REMOVE"
                }
              },
              visaNo: {
                $cond: {
                  if: { $eq: ["$invoiceType", "visa"] },
                  then: { $arrayElemAt: ["$billing.items.visaNo", 0] },
                  else: "$$REMOVE"
                }
              }
            }
          }
        ]
      }
    }
  ])

  const invoices = result[0]?.data || []
  const total = result[0]?.metadata?.[0]?.total || 0

  return {
    items: invoices,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }
}

export async function listNonCommissionInvoices(params: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  clientId?: string
  companyId: string
}) {
  await connectMongoose()
  if (!params.companyId) throw new AppError("Company ID is required", 401)

  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.max(1, Math.min(100, Number(params.pageSize) || 20))
  const skip = (page - 1) * pageSize

  const companyIdObj = new Types.ObjectId(params.companyId)
  const filter: any = { isDeleted: { $ne: true }, invoiceType: "non_commission", companyId: companyIdObj }
  if (params.clientId) filter.clientId = new Types.ObjectId(params.clientId)
  if (params.status) filter.status = params.status
  
  if (params.search) {
    filter.$or = [
      { invoiceNo: { $regex: params.search, $options: "i" } },
      { clientName: { $regex: params.search, $options: "i" } },
      { salesByName: { $regex: params.search, $options: "i" } },
    ]
  }
  if (params.dateFrom || params.dateTo) {
    filter.salesDate = {}
    if (params.dateFrom) filter.salesDate.$gte = params.dateFrom
    if (params.dateTo) filter.salesDate.$lte = params.dateTo
  }

  const total = await Invoice.countDocuments(filter)
  const docs = await Invoice.find(filter)
    .sort({ salesDate: -1, createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean()

  // Fetch all tickets for these invoices to get issue dates
  const invIds = docs.map((d: any) => d._id)
  const [allTickets, allAllocations] = await Promise.all([
    InvoiceTicket.find({ invoiceId: { $in: invIds }, isDeleted: { $ne: true } }).lean(),
    // Use allocations (not money_receipts.invoiceId) so "overall" MRs also appear
    MoneyReceiptAllocation.find({ invoiceId: { $in: invIds } }).lean(),
  ])

  const invoices = docs.map((d: any) => {
    const invId = d._id
    const invTickets = allTickets.filter((t: any) => String(t.invoiceId) === String(invId))
    const issueDates = Array.from(new Set(invTickets.map((t: any) => t.issueDate || t.createdAt))).filter(Boolean)

    // Collect distinct voucher numbers via allocations (covers overall + invoice + tickets payment types)
    const invAllocs = allAllocations.filter((a: any) => String(a.invoiceId) === String(invId))
    const mrNos = Array.from(new Set(invAllocs.map((a: any) => a.voucherNo).filter(Boolean))).join(", ")

    return {
      id: String(invId),
      clientId: String(d.clientId || ""),
      invoiceNo: d.invoiceNo,
      clientName: d.clientName || "",
      clientPhone: d.clientPhone || "",
      salesDate: d.salesDate,
      dueDate: d.dueDate || "",
      issueDate: issueDates[0] || d.salesDate, // Fallback
      issueDates: issueDates,
      salesPrice: parseNumber(d.netTotal, 0),
      totalCost: parseNumber(d.billing?.totalCost || 0, 0),
      receivedAmount: parseNumber(d.receivedAmount, 0),
      dueAmount: Math.max(0, parseNumber(d.netTotal, 0) - parseNumber(d.receivedAmount, 0)),
      mrNo: mrNos,
      passportNo: "", 
      salesBy: d.salesByName || "",
      status: d.status || "due",
      invoiceType: d.invoiceType || "non_commission",
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: d.updatedAt || new Date().toISOString(),
    }
  })

  return {
    items: invoices,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }
}


export async function createNonCommissionInvoice(body: any, companyId: string) {
  await connectMongoose()
  if (!companyId) throw new AppError("Company ID is required", 401)
  
  const { general, items: invoiceItems, billing } = body
  const now = new Date().toISOString()
  const companyIdObj = new Types.ObjectId(companyId)

  // 1. Validation
  if (!general.clientId) throw new AppError("Client is required", 400)
  if (!general.employeeId) throw new AppError("Sales person is required", 400)
  if (!general.salesDate) throw new AppError("Sales date is required", 400)
  if (!invoiceItems || invoiceItems.length === 0) throw new AppError("At least one item is required", 400)

  // 2. Resolve Client & Check Credit Limit
  const clientDoc = await Client.findOne({ _id: new Types.ObjectId(general.clientId), companyId: companyIdObj }).lean()
  if (!clientDoc) throw new AppError("Client not found", 404)
  
  const netTotal = parseNumber(billing.netTotal, 0)
  const creditLimit = parseNumber(clientDoc.creditLimit || 0)
  const presentBalance = parseNumber(clientDoc.presentBalance || 0)
  if (creditLimit > 0 && presentBalance + netTotal > creditLimit) {
    throw new AppError("Credit limit exceeded", 400, "credit_limit_exceeded")
  }

  // 3. Denormalize Names
  const names: any = { clientName: clientDoc.name || "", clientPhone: clientDoc.phone || "" }
  const employeeId = Types.ObjectId.isValid(general.employeeId) ? new Types.ObjectId(general.employeeId) : undefined
  if (employeeId) {
    const e = await Employee.findOne({ _id: employeeId, companyId: companyIdObj }).lean()
    if (e) names.salesByName = e.name || (e as any).fullName || ""
  }

  // 4. Header Document
  const headerDoc: any = {
    invoiceNo: general.invoiceNo,
    salesDate: String(general.salesDate),
    dueDate: general.dueDate || "",
    clientId: new Types.ObjectId(clientDoc._id),
    employeeId,
    agentId: general.agentId ? new Types.ObjectId(general.agentId) : undefined,
    companyId: companyIdObj,
    ...names,
    invoiceType: "non_commission",
    billing: {
      subtotal: invoiceItems.reduce((s: number, i: any) => s + parseNumber(i.ticketDetails.clientPrice), 0),
      totalCost: invoiceItems.reduce((s: number, i: any) => s + parseNumber(i.ticketDetails.purchasePrice), 0),
      discount: parseNumber(billing.discount, 0),
      serviceCharge: parseNumber(billing.serviceCharge, 0),
      vatTax: parseNumber(billing.vatTax, 0),
      netTotal,
      note: billing.note || "",
      reference: billing.reference || "",
    },
    showPrevDue: billing.showPrevDue === "Yes",
    showDiscount: billing.showDiscount === "Yes",
    agentCommission: parseNumber(billing.agentCommission, 0),
    netTotal,
    receivedAmount: 0,
    status: "due",
    createdAt: now,
    updatedAt: now,
  }

  // Look up "Air Ticket(Non-commission)" product for productId linkage
  let nonCommProductId: Types.ObjectId | undefined
  try {
    const prodCol = mongoose.connection?.db?.collection("products")
    if (prodCol) {
      const prodDoc = await prodCol.findOne({ nameLower: "air ticket(non-commission)", deleted: { $ne: true } })
      if (prodDoc) nonCommProductId = new Types.ObjectId(prodDoc._id)
    }
  } catch { /* ignore — productId is optional */ }

  const session = await mongoose.startSession()
  try {
    let resultOk = false
    let createdId = ""
    await session.withTransaction(async () => {
      const result = await Invoice.create([headerDoc], { session })
      const invoiceId = result[0]._id
      createdId = String(invoiceId)

      // 5. Create Child Records — collect vendor costs during loop (no sequential DB calls)
      const vendorCostMap = new Map<string, number>()
      for (const item of invoiceItems) {
        const { ticketDetails, paxEntries, flightEntries } = item
        
        // a. Create InvoiceTicket (Main Reference)
        const ticketResult = await InvoiceTicket.create([{
          invoiceId,
          ticketNo: ticketDetails.ticketNo,
          pnr: ticketDetails.pnr,
          gdsPnr: ticketDetails.gdsPnr,
          route: ticketDetails.route,
          journeyDate: ticketDetails.journeyDate,
          returnDate: ticketDetails.returnDate,
          airline: ticketDetails.airline,
          ticketType: ticketDetails.ticketType,
          airbusClass: ticketDetails.airbusClass,
          issueDate: ticketDetails.issueDate,
          companyId: companyIdObj,
          createdAt: now,
          updatedAt: now
        }], { session })
        const ticketId = ticketResult[0]._id

        // b. Create InvoiceItem (Financial Row) - Linked to Ticket
        await InvoiceItem.create([{
          invoiceId,
          referenceId: ticketId,
          itemType: "ticket",
          product: "non_commission_ticket",
          productId: nonCommProductId,
          paxName: ticketDetails.paxName || "",
          description: `Ticket: ${ticketDetails.ticketNo} | Route: ${ticketDetails.route}`,
          quantity: 1,
          unitPrice: parseNumber(ticketDetails.clientPrice, 0),
          costPrice: parseNumber(ticketDetails.purchasePrice, 0),
          totalSales: parseNumber(ticketDetails.clientPrice, 0),
          totalCost: parseNumber(ticketDetails.purchasePrice, 0),
          profit: parseNumber(item.profit, 0),
          vendorId: ticketDetails.vendor ? new Types.ObjectId(ticketDetails.vendor) : null,
          companyId: companyIdObj,
          createdAt: now,
          updatedAt: now
        }], { session })

        // c. Create InvoicePassports - Linked to Ticket
        if (paxEntries.length > 0) {
          await InvoicePassport.insertMany(paxEntries.map((p: any) => ({
            invoiceId,
            ticketId,
            passportNo: p.passportId || "",
            name: p.name,
            paxType: p.paxType,
            contactNo: p.contactNo,
            email: p.email,
            dateOfBirth: p.dob,
            dateOfIssue: p.dateOfIssue,
            dateOfExpire: p.dateOfExpire,
            companyId: companyIdObj,
            createdAt: now,
            updatedAt: now
          })), { session })
        }

        // d. Create InvoiceTransports - Linked to Ticket
        if (flightEntries.length > 0) {
          await InvoiceTransport.insertMany(flightEntries.map((f: any) => ({
            invoiceId,
            ticketId,
            transportType: `Flight: ${f.flightNo}`,
            referenceNo: f.airline,
            pickupPlace: f.from,
            dropOffPlace: f.to,
            pickupTime: f.departureTime,
            dropoffTime: f.arrivalTime,
            pickupDate: f.flyDate,
            companyId: companyIdObj,
            createdAt: now,
            updatedAt: now
          })), { session })
        }

        // e. Accumulate vendor cost (no DB call inside loop)
        const purchaseCost = parseNumber(ticketDetails.purchasePrice, 0)
        if (ticketDetails.vendor && purchaseCost > 0) {
          const vOid = normalizeVendorObjectId(ticketDetails.vendor)
          if (vOid) {
            const key = vOid.toString()
            vendorCostMap.set(key, (vendorCostMap.get(key) ?? 0) + purchaseCost)
          }
        }
      }

      // 5b. Apply all vendor balance updates in parallel (one call per unique vendor)
      await applyVendorCostMap(vendorCostMap, 1, now, session)

      // 6. Update Client Balance
      await Client.updateOne(
        { _id: clientDoc._id, companyId: companyIdObj },
        { $inc: { presentBalance: -netTotal }, $set: { updatedAt: now } },
        { session }
      )

      // 6b. Auto-apply any existing advance MRs (remainingAmount > 0) to this invoice
      await autoApplyClientAdvanceToInvoice({
        netTotal,
        invoiceId: new Types.ObjectId(createdId),
        clientId: new Types.ObjectId(clientDoc._id),
        companyId: companyIdObj,
        now,
        session,
      })

      // 7. Create invoice ledger transactions (audit trail — client debit only)
      await createInvoiceLedgerTxns({
        invoiceId,
        invoiceNo: headerDoc.invoiceNo,
        salesDate: headerDoc.salesDate,
        clientId: new Types.ObjectId(clientDoc._id),
        clientName: names.clientName || "",
        netTotal,
        companyId: companyIdObj,
        now,
        session,
      })

      resultOk = true
    })
    return { ok: true, id: createdId }
  } catch (err: any) {
    console.error("createNonCommissionInvoice error:", err)
    throw err
  } finally {
    session.endSession()
  }
}

export async function getNonCommissionInvoiceById(id: string, companyId: string) {
  await connectMongoose()
  if (!companyId) throw new AppError("Company ID is required", 401)
  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid ID", 400)
  
  const companyIdObj = new Types.ObjectId(companyId)
  const inv = await Invoice.findOne({ _id: new Types.ObjectId(id), invoiceType: "non_commission", companyId: companyIdObj }).lean()
  if (!inv) throw new AppError("Not found", 404)

  const invId = inv._id
  // Fetch children
  const [items, tickets, transports, passports] = await Promise.all([
    InvoiceItem.find({ invoiceId: invId, companyId: companyIdObj, isDeleted: { $ne: true } }).lean(),
    InvoiceTicket.find({ invoiceId: invId, companyId: companyIdObj, isDeleted: { $ne: true } }).lean(),
    InvoiceTransport.find({ invoiceId: invId, companyId: companyIdObj, isDeleted: { $ne: true } }).lean(),
    InvoicePassport.find({ invoiceId: invId, companyId: companyIdObj, isDeleted: { $ne: true } }).lean(),
  ])

  // Map to the shape expected by the frontend Edit modal
  // Non-Commission modal stores items in a list, each having ticketDetails, paxEntries, flightEntries
  // We need to reconstruct those items. Since we store them as separate records, 
  // and each InvoiceItem record represents one ticket in the UI list.
  
  const reconstructedItems = items.map((ii: any) => {
    // 1. Find matching ticket for this item using referenceId (preferred) or paxName/description (fallback)
    // IMPORTANT: MongoDB .lean() returns _id as an ObjectId, so we use .toString() to compare.
    const ticket = tickets.find((t: any) => 
      (ii.referenceId && String(t._id) === String(ii.referenceId)) || 
      (ii.ticketId && String(t._id) === String(ii.ticketId)) || 
      (!ii.referenceId && (t.ticketNo === ii.paxName || t.route === ii.description.split('|')[1]?.split(':')[1]?.trim()))
    ) || tickets[0]
    
    const ticketIdStr = ticket ? String(ticket._id) : null

    // 2. Filter paxEntries and flightEntries that belong ONLY to this ticket using ticketId
    const itemPaxEntries = passports
      .filter((p: any) => 
        (ticketIdStr && String(p.ticketId) === ticketIdStr) || 
        (!p.ticketId && String(p.invoiceId) === String(invId))
      )
      .map((p: any) => ({
        id: p.id || String(p._id),
        passportId: p.passportNo,
        name: p.name,
        paxType: p.paxType,
        contactNo: p.contactNo,
        email: p.email,
        dob: p.dateOfBirth ? new Date(p.dateOfBirth) : undefined,
        dateOfIssue: p.dateOfIssue ? new Date(p.dateOfIssue) : undefined,
        dateOfExpire: p.dateOfExpire ? new Date(p.dateOfExpire) : undefined
      }))

    const itemFlightEntries = transports
      .filter((tr: any) => 
        (ticketIdStr && String(tr.ticketId) === ticketIdStr) || 
        (!tr.ticketId && String(tr.invoiceId) === String(invId))
      )
      .map((tr: any) => ({
        id: tr.id || String(tr._id),
        from: tr.pickupPlace,
        to: tr.dropOffPlace,
        airline: tr.referenceNo,
        flightNo: tr.transportType?.replace("Flight: ", ""),
        flyDate: tr.pickupDate ? new Date(tr.pickupDate) : undefined,
        departureTime: tr.pickupTime,
        arrivalTime: tr.dropoffTime
      }))

    return {
      id: ii.referenceId || ii.ticketId || ii.id || String(ii._id),
      ticketDetails: {
        ticketNo: ticket?.ticketNo || "",
        clientPrice: ii.totalSales || 0,
        purchasePrice: ii.totalCost || 0,
        extraFee: 0,
        vendor: String(ii.vendorId || ""),
        airline: ticket?.airline || "",
        ticketType: ticket?.ticketType || "",
        route: ticket?.route || "",
        pnr: ticket?.pnr || "",
        gdsPnr: ticket?.gdsPnr || "",
        paxName: ii.paxName || "",
        issueDate: ticket?.issueDate ? new Date(ticket.issueDate) : (ticket?.createdAt ? new Date(ticket.createdAt) : new Date()),
        journeyDate: ticket?.journeyDate ? new Date(ticket.journeyDate) : undefined,
        returnDate: ticket?.returnDate ? new Date(ticket.returnDate) : undefined,
        airbusClass: ticket?.airbusClass || ""
      },
      paxEntries: itemPaxEntries,
      flightEntries: itemFlightEntries,
      profit: ii.profit || 0
    }
  })

  return {
    ...inv,
    id: String(invId),
    items: reconstructedItems
  }
}

export async function updateNonCommissionInvoice(id: string, body: any, companyId: string) {
  await connectMongoose()
  if (!companyId) throw new AppError("Company ID is required", 401)
  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid ID", 400)
  
  const companyIdObj = new Types.ObjectId(companyId)

  // Look up "Air Ticket(Non-commission)" product for productId linkage
  let nonCommProductId: Types.ObjectId | undefined
  try {
    const prodCol = mongoose.connection?.db?.collection("products")
    if (prodCol) {
      const prodDoc = await prodCol.findOne({ nameLower: "air ticket(non-commission)", deleted: { $ne: true } })
      if (prodDoc) nonCommProductId = new Types.ObjectId(prodDoc._id)
    }
  } catch { /* ignore — productId is optional */ }

  const session = await mongoose.startSession()
  try {
    let resultOk = false
    await session.withTransaction(async () => {
      // 1. Fetch existing records before deletion (need for vendor cost revert)
      const invId = new Types.ObjectId(id)
      const oldInv = await Invoice.findOne({ _id: invId, companyId: companyIdObj }).session(session)
      if (!oldInv) throw new AppError("Invoice not found", 404)

      // 1a. Build old vendor cost map before deleting child records
      const now = new Date().toISOString()
      const oldItems = await InvoiceItem.find({ invoiceId: invId, companyId: companyIdObj }).session(session)
      const oldVendorCostMap = buildVendorCostMap(oldItems)

      await Promise.all([
        InvoiceItem.deleteMany({ invoiceId: invId, companyId: companyIdObj }).session(session),
        InvoiceTicket.deleteMany({ invoiceId: invId, companyId: companyIdObj }).session(session),
        InvoicePassport.deleteMany({ invoiceId: invId, companyId: companyIdObj }).session(session),
        InvoiceTransport.deleteMany({ invoiceId: invId, companyId: companyIdObj }).session(session),
      ])

      // 1b. Revert old vendor balances + delete old ledger txns
      await Promise.all([
        applyVendorCostMap(oldVendorCostMap, -1, now, session),
        deleteInvoiceLedgerTxns(invId, companyIdObj, session),
      ])

      // 2. Re-create header and children using existing create logic adapted for Update
      const { general, items: invoiceItems, billing } = body

      const clientDoc = await Client.findOne({ _id: new Types.ObjectId(general.clientId), companyId: companyIdObj }).lean()
      if (!clientDoc) throw new AppError("Client not found", 404)
      
      const netTotal = parseNumber(billing.netTotal, 0)
      const oldNetTotal = parseNumber(oldInv.netTotal, 0)
      const delta = netTotal - oldNetTotal

      const names: any = { clientName: clientDoc.name || "", clientPhone: clientDoc.phone || "" }
      const employeeId = Types.ObjectId.isValid(general.employeeId) ? new Types.ObjectId(general.employeeId) : undefined
      if (employeeId) {
        const e = await Employee.findOne({ _id: employeeId, companyId: companyIdObj }).lean()
        if (e) names.salesByName = e.name || (e as any).fullName || ""
      }

      const headerUpdates: any = {
        invoiceNo: general.invoiceNo,
        salesDate: String(general.salesDate),
        dueDate: general.dueDate || "",
        clientId: new Types.ObjectId(clientDoc._id),
        employeeId,
        agentId: general.agentId ? new Types.ObjectId(general.agentId) : undefined,
        invoiceType: "non_commission",
        ...names,
        billing: {
          subtotal: invoiceItems.reduce((s: number, i: any) => s + parseNumber(i.ticketDetails.clientPrice), 0),
          totalCost: invoiceItems.reduce((s: number, i: any) => s + parseNumber(i.ticketDetails.purchasePrice), 0),
          discount: parseNumber(billing.discount, 0),
          serviceCharge: parseNumber(billing.serviceCharge, 0),
          vatTax: parseNumber(billing.vatTax, 0),
          netTotal,
          note: billing.note || "",
          reference: billing.reference || "",
        },
        showPrevDue: billing.showPrevDue === "Yes",
        showDiscount: billing.showDiscount === "Yes",
        agentCommission: parseNumber(billing.agentCommission, 0),
        netTotal,
        updatedAt: now,
      }

      await Invoice.updateOne({ _id: id, companyId: companyIdObj }, { $set: headerUpdates }, { session })

      // 3. Create Child Records — accumulate new vendor costs during loop
      const newVendorCostMap = new Map<string, number>()
      for (const item of invoiceItems) {
        const { ticketDetails, paxEntries, flightEntries } = item

        // a. Create InvoiceTicket (Main Reference)
        const ticketResult = await InvoiceTicket.create([{
          invoiceId: invId,
          ticketNo: ticketDetails.ticketNo,
          pnr: ticketDetails.pnr,
          gdsPnr: ticketDetails.gdsPnr,
          route: ticketDetails.route,
          journeyDate: ticketDetails.journeyDate,
          returnDate: ticketDetails.returnDate,
          airline: ticketDetails.airline,
          ticketType: ticketDetails.ticketType,
          airbusClass: ticketDetails.airbusClass,
          issueDate: ticketDetails.issueDate,
          companyId: companyIdObj,
          createdAt: now,
          updatedAt: now
        }], { session })
        const ticketId = ticketResult[0]._id

        // b. Create InvoiceItem (Financial Row) - Linked to Ticket
        await InvoiceItem.create([{
          invoiceId: invId,
          referenceId: ticketId,
          itemType: "ticket",
          product: "non_commission_ticket",
          productId: nonCommProductId,
          paxName: ticketDetails.paxName || "",
          description: `Ticket: ${ticketDetails.ticketNo} | Route: ${ticketDetails.route}`,
          quantity: 1,
          unitPrice: parseNumber(ticketDetails.clientPrice, 0),
          costPrice: parseNumber(ticketDetails.purchasePrice, 0),
          totalSales: parseNumber(ticketDetails.clientPrice, 0),
          totalCost: parseNumber(ticketDetails.purchasePrice, 0),
          profit: parseNumber(item.profit, 0),
          vendorId: ticketDetails.vendor ? new Types.ObjectId(ticketDetails.vendor) : null,
          companyId: companyIdObj,
          createdAt: now,
          updatedAt: now
        }], { session })

        // c. Create InvoicePassports - Linked to Ticket
        if (paxEntries.length > 0) {
          await InvoicePassport.insertMany(paxEntries.map((p: any) => ({
            invoiceId: invId,
            ticketId,
            passportNo: p.passportId || "",
            name: p.name,
            paxType: p.paxType,
            contactNo: p.contactNo,
            email: p.email,
            dateOfBirth: p.dob,
            dateOfIssue: p.dateOfIssue,
            dateOfExpire: p.dateOfExpire,
            companyId: companyIdObj,
            createdAt: now,
            updatedAt: now
          })), { session })
        }

        // d. Create InvoiceTransports - Linked to Ticket
        if (flightEntries.length > 0) {
          await InvoiceTransport.insertMany(flightEntries.map((f: any) => ({
            invoiceId: invId,
            ticketId,
            transportType: `Flight: ${f.flightNo}`,
            referenceNo: f.airline,
            pickupPlace: f.from,
            dropOffPlace: f.to,
            pickupTime: f.departureTime,
            dropoffTime: f.arrivalTime,
            pickupDate: f.flyDate,
            companyId: companyIdObj,
            createdAt: now,
            updatedAt: now
          })), { session })
        }

        // e. Accumulate new vendor cost (no DB call inside loop)
        const purchaseCost = parseNumber(ticketDetails.purchasePrice, 0)
        if (ticketDetails.vendor && purchaseCost > 0) {
          const vOid = normalizeVendorObjectId(ticketDetails.vendor)
          if (vOid) {
            const key = vOid.toString()
            newVendorCostMap.set(key, (newVendorCostMap.get(key) ?? 0) + purchaseCost)
          }
        }
      }

      // 3b. Apply new vendor balances in parallel
      await applyVendorCostMap(newVendorCostMap, 1, now, session)

      // 4. Update Client Balance (Adjust by delta)
      if (delta !== 0) {
        await Client.updateOne(
          { _id: clientDoc._id, companyId: companyIdObj },
          { $inc: { presentBalance: -delta }, $set: { updatedAt: now } },
          { session }
        )
      }

      // 5. Re-create invoice ledger transactions (client debit only)
      await createInvoiceLedgerTxns({
        invoiceId: invId,
        invoiceNo: headerUpdates.invoiceNo,
        salesDate: headerUpdates.salesDate,
        clientId: new Types.ObjectId(clientDoc._id),
        clientName: names.clientName || "",
        netTotal,
        companyId: companyIdObj,
        now,
        session,
      })

      resultOk = true
    })
    return { ok: true }
  } catch (err: any) {
    console.error("updateNonCommissionInvoice error:", err)
    throw err
  } finally {
    session.endSession()
  }
}

export async function deleteInvoiceById(id: string, companyId: string) {
  await connectMongoose()
  if (!companyId) throw new AppError("Company ID is required", 401)
  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid ID", 400)

  const companyIdObj = new Types.ObjectId(companyId)
  const session = await mongoose.startSession()
  try {
    let resultOk = false
    await session.withTransaction(async () => {
      const inv = await Invoice.findOne({ _id: new Types.ObjectId(id), companyId: companyIdObj }).session(session)
      if (!inv) throw new AppError("Not found", 404)

      const invoiceId = inv._id
      const now = new Date().toISOString()

      // 1. Fetch items, revert vendor balances in parallel + delete ledger txns
      const existingItems = await InvoiceItem.find({ invoiceId, companyId: companyIdObj }).session(session)
      const vendorCostsMap = buildVendorCostMap(existingItems)

      await Promise.all([
        applyVendorCostMap(vendorCostsMap, -1, now, session),
        deleteInvoiceLedgerTxns(invoiceId, companyIdObj, session),
      ])

      // 2. Adjust Client Balance (reverting the invoice net total impact)
      const net = Number(inv.netTotal || inv.billing?.netTotal || 0)
      if (net !== 0 && inv.clientId) {
        // Invoice increases client due (negative impact on balance), so we add it back
        await Client.updateOne(
          { _id: inv.clientId, companyId: companyIdObj }, 
          { $inc: { presentBalance: net }, $set: { updatedAt: now } }, 
          { session }
        )
      }

      // 3. Cascading Soft Delete for all related tables
      const softDeleteFilter = { invoiceId, companyId: companyIdObj }
      const softDeleteUpdate = { $set: { isDeleted: true, updatedAt: now } }
      
      await Promise.all([
        InvoiceItem.updateMany(softDeleteFilter, softDeleteUpdate, { session }),
        InvoiceTicket.updateMany(softDeleteFilter, softDeleteUpdate, { session }),
        InvoiceHotel.updateMany(softDeleteFilter, softDeleteUpdate, { session }),
        InvoiceTransport.updateMany(softDeleteFilter, softDeleteUpdate, { session }),
        InvoicePassport.updateMany(softDeleteFilter, softDeleteUpdate, { session }),
        // Soft delete the invoice itself
        Invoice.updateOne({ _id: inv._id, companyId: companyIdObj }, softDeleteUpdate, { session })
      ])

      resultOk = true
    })
    return { ok: resultOk }
  } catch (err: any) {
    console.error("deleteInvoiceById error:", err)
    throw err
  } finally {
    session.endSession()
  }
}


export async function createInvoice(body: any, companyId: string) {
  await connectMongoose()
  if (!companyId) throw new AppError("Company ID is required", 401)
  
  const now = new Date().toISOString()
  const companyIdObj = new Types.ObjectId(companyId)

  // 1. Normalize & Validate
  const payload = normalizePayload(body)
  const { general, items: billingItems, summary, globalDetails } = payload

  if (!general.clientId) throw new AppError("Client is required", 400)
  if (!general.employeeId) throw new AppError("Sales person is required", 400)
  if (!general.salesDate) throw new AppError("Sales date is required", 400)
  if (billingItems.length === 0) throw new AppError("At least one billing item is required", 400)

  // 2. Resolve Client & Check Credit Limit
  const clientIdRaw = String(general.clientId || "").trim()
  let clientDoc: any = null
  if (Types.ObjectId.isValid(clientIdRaw)) {
    clientDoc = await Client.findOne({ _id: new Types.ObjectId(clientIdRaw), companyId: companyIdObj }).lean()
  } else if (clientIdRaw.startsWith("client-")) {
    const uniqueId = Number(clientIdRaw.replace("client-", ""))
    clientDoc = await Client.findOne({ uniqueId, companyId: companyIdObj }).lean()
  }
  if (!clientDoc) throw new AppError("Client not found", 404)

  const creditLimit = parseNumber(clientDoc.creditLimit || 0)
  const presentBalance = parseNumber(clientDoc.presentBalance || 0)
  if (creditLimit > 0 && presentBalance + summary.netTotal > creditLimit) {
    throw new AppError("Credit limit exceeded", 400, "credit_limit_exceeded")
  }

  // 3. Denormalize Names
  const names: any = { clientName: clientDoc.name || "", clientPhone: clientDoc.phone || "" }
  const employeeId = Types.ObjectId.isValid(general.employeeId) ? new Types.ObjectId(general.employeeId) : undefined
  if (employeeId) {
    const e = await Employee.findOne({ _id: employeeId, companyId: companyIdObj }).lean()
    if (e) names.salesByName = e.name || (e as any).fullName || ""
  }
  const agentId = Types.ObjectId.isValid(general.agentId) ? new Types.ObjectId(general.agentId) : undefined

  // 4. Header Document
  const headerDoc: any = {
    invoiceNo: general.invoiceNo,
    salesDate: general.salesDate,
    dueDate: general.dueDate,
    clientId: new Types.ObjectId(clientDoc._id),
    employeeId,
    agentId,
    companyId: companyIdObj,
    ...names,
    invoiceType: payload.invoiceType,
    billing: summary,
    showPrevDue: payload.showPrevDue,
    showDiscount: payload.showDiscount,
    agentCommission: payload.agentCommission,
    clientPreviousDue: payload.clientPreviousDue,
    netTotal: summary.netTotal,
    receivedAmount: 0,
    status: "due",
    createdAt: now,
    updatedAt: now,
  }

  const session = await mongoose.startSession()
  try {
    let createdId = ""
    let response: any = null
    await session.withTransaction(async () => {
      // a. Create Invoice Header
      const result = await Invoice.create([headerDoc], { session })
      const invoiceId = result[0]._id
      createdId = String(invoiceId)

      // b. Create Child Records + vendor balance (grouped, parallel)
      const vendorCostMap = buildVendorCostMap(billingItems)
      if (billingItems.length) {
        await InvoiceItem.insertMany(billingItems.map(i => ({ 
          ...i, 
          invoiceId, 
          companyId: companyIdObj,
          vendorId: (i.vendorId && Types.ObjectId.isValid(i.vendorId)) ? new Types.ObjectId(i.vendorId) : null,
          productId: (i.product && Types.ObjectId.isValid(i.product)) ? new Types.ObjectId(i.product) : undefined,
          createdAt: now, 
          updatedAt: now 
        })), { session })

        // One DB call per unique vendor, all parallel — no N+1
        await applyVendorCostMap(vendorCostMap, 1, now, session)
      }

      const { tickets, hotels, transports, passports } = globalDetails
      if (tickets.length) await InvoiceTicket.insertMany(tickets.map((t: any) => ({ ...t, invoiceId, companyId: companyIdObj, createdAt: now, updatedAt: now })), { session })
      if (hotels.length) await InvoiceHotel.insertMany(hotels.map((h: any) => ({ ...h, invoiceId, companyId: companyIdObj, createdAt: now, updatedAt: now })), { session })
      if (transports.length) await InvoiceTransport.insertMany(transports.map((tr: any) => ({ ...tr, invoiceId, companyId: companyIdObj, createdAt: now, updatedAt: now })), { session })
      if (passports.length) {
        const col = mongoose.connection?.db?.collection("invoice_passports")
        if (col) await col.insertMany(passports.map((p: any, idx: number) => ({
          ...p,
          id: p.id || String(Date.now() + idx), 
          invoiceId, 
          companyId: companyIdObj,
          passportNo: p.passportNo || p.passport_no || "", 
          name: p.name || "", 
          email: p.email || "",
          dateOfIssue: p.dateOfIssue || p.date_of_issue || "", 
          dateOfExpire: p.dateOfExpire || p.date_of_expire || "",
          paxType: p.paxType || p.pax_type || "", 
          contactNo: p.contactNo || p.mobile || "",
          dateOfBirth: p.dateOfBirth || p.dob || "", 
          passportId: p.passportId || p.passport_id || "",
          createdAt: now, 
          updatedAt: now
        })), { session })
      }

      // c. Update Client Balance
      await Client.updateOne({ _id: clientDoc._id, companyId: companyIdObj }, { $inc: { presentBalance: -summary.netTotal }, $set: { updatedAt: now } }, { session })

      // c2. Auto-apply any existing advance MRs (remainingAmount > 0) to this invoice
      const advanceApplied = await autoApplyClientAdvanceToInvoice({
        netTotal: summary.netTotal,
        invoiceId: new Types.ObjectId(createdId),
        clientId: new Types.ObjectId(clientDoc._id),
        companyId: companyIdObj,
        now,
        session,
      })

      // d. Money Receipt Logic
      let moneyReceiptNo = ""
      let receivedSoFar = advanceApplied
      const moneyReceipt = payload.moneyReceipt
      if (moneyReceipt?.paymentMethod && moneyReceipt?.amount > 0) {
        const mrResult = await createMoneyReceipt({
          clientId: clientDoc._id, invoiceId: createdId, paymentTo: "invoice",
          amount: moneyReceipt.amount, discount: moneyReceipt.discount || 0,
          paymentDate: moneyReceipt.paymentDate || general.salesDate || now,
          paymentMethod: moneyReceipt.paymentMethod, accountId: moneyReceipt.accountId,
          note: moneyReceipt.note, manualReceiptNo: moneyReceipt.receiptNo
        }, companyId)
        if (mrResult.ok) {
          moneyReceiptNo = mrResult.created.receipt_vouchar_no
          receivedSoFar += parseNumber(moneyReceipt.amount, 0)
        }
      }

      response = {
        invoice_id: Number(String(createdId).slice(-6)), invoice_no: headerDoc.invoiceNo, net_total: String(summary.netTotal.toFixed(2)),
        invoice_client_id: clientDoc.uniqueId || null, client_name: names.clientName || "", mobile: names.clientPhone || null,
        invclientpayment_amount: String(receivedSoFar.toFixed(2)), money_receipt_num: moneyReceiptNo, sales_by: names.salesByName || "",
        invoice_total_profit: String(billingItems.reduce((s: number, i: any) => s + i.profit, 0).toFixed(2)),
        invoice_total_vendor_price: String(billingItems.reduce((s: number, i: any) => s + i.totalCost, 0).toFixed(2)),
        invoice_sales_date: headerDoc.salesDate, invoice_date: headerDoc.salesDate, invoice_due_date: headerDoc.dueDate || null,
      }

      // e. Create invoice ledger transactions (audit trail — client debit only)
      await createInvoiceLedgerTxns({
        invoiceId,
        invoiceNo: headerDoc.invoiceNo,
        salesDate: headerDoc.salesDate,
        clientId: new Types.ObjectId(clientDoc._id),
        clientName: names.clientName || "",
        netTotal: summary.netTotal,
        companyId: companyIdObj,
        now,
        session,
      })
    })
    return { ok: true, id: createdId, created: response }
  } catch (err: any) {
    console.error("createInvoice error:", err)
    throw err
  } finally {
    session.endSession()
  }
}

export async function updateInvoiceById(id: string, body: any, companyId: string) {
  await connectMongoose()
  if (!companyId) throw new AppError("Company ID is required", 401)
  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid ID", 400)
  
  const companyIdObj = new Types.ObjectId(companyId)
  const inv = await Invoice.findOne({ _id: new Types.ObjectId(id), companyId: companyIdObj })
  if (!inv) throw new AppError("Not found", 404)

  const now = new Date().toISOString()
  const payload = normalizePayload(body)
  const { general, items: billingItems, summary, globalDetails } = payload

  const oldNet = parseNumber(inv.netTotal || inv.billing?.netTotal, 0)
  const clientDelta = summary.netTotal - oldNet

  const names: any = { clientName: inv.clientName, clientPhone: inv.clientPhone }
  const employeeId = Types.ObjectId.isValid(general.employeeId) ? new Types.ObjectId(general.employeeId) : inv.employeeId
  if (employeeId && String(employeeId) !== String(inv.employeeId)) {
    const e = await Employee.findOne({ _id: employeeId, companyId: companyIdObj }).lean()
    if (e) names.salesByName = e.name || (e as any).fullName || ""
  }

  const headerUpdates: any = {
    invoiceNo: general.invoiceNo || inv.invoiceNo,
    salesDate: general.salesDate || inv.salesDate,
    dueDate: general.dueDate || inv.dueDate || "",
    employeeId,
    agentId: Types.ObjectId.isValid(general.agentId) ? new Types.ObjectId(general.agentId) : inv.agentId,
    ...names,
    invoiceType: payload.invoiceType || inv.invoiceType || "standard",
    billing: summary,
    showPrevDue: payload.showPrevDue,
    showDiscount: payload.showDiscount,
    agentCommission: payload.agentCommission,
    clientPreviousDue: payload.clientPreviousDue,
    netTotal: summary.netTotal,
    updatedAt: now,
  }

  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const idObj = new Types.ObjectId(id)

      // 2. Build old vendor cost map, then revert old balances + delete old ledger txns (parallel)
      const oldItems = await InvoiceItem.find({ invoiceId: id, companyId: companyIdObj }).session(session)
      const oldVendorCostMap = buildVendorCostMap(oldItems)

      await Promise.all([
        applyVendorCostMap(oldVendorCostMap, -1, now, session),
        deleteInvoiceLedgerTxns(idObj, companyIdObj, session),
      ])

      // 3. Update Header & Replace Children
      await Invoice.updateOne({ _id: id, companyId: companyIdObj }, { $set: headerUpdates }, { session })
      await Promise.all([
        InvoiceItem.deleteMany({ invoiceId: idObj, companyId: companyIdObj }).session(session),
        InvoiceTicket.deleteMany({ invoiceId: idObj, companyId: companyIdObj }).session(session),
        InvoiceHotel.deleteMany({ invoiceId: idObj, companyId: companyIdObj }).session(session),
        InvoiceTransport.deleteMany({ invoiceId: idObj, companyId: companyIdObj }).session(session),
        InvoicePassport.deleteMany({ invoiceId: idObj, companyId: companyIdObj }).session(session),
      ])

      // Build new vendor cost map + apply in parallel
      const newVendorCostMap = buildVendorCostMap(billingItems)
      if (billingItems.length) {
        await InvoiceItem.insertMany(billingItems.map(i => ({ 
          ...i, 
          invoiceId: idObj, 
          companyId: companyIdObj,
          vendorId: (i.vendorId && Types.ObjectId.isValid(i.vendorId)) ? new Types.ObjectId(i.vendorId) : null,
          productId: (i.product && Types.ObjectId.isValid(i.product)) ? new Types.ObjectId(i.product) : undefined,
          createdAt: now, 
          updatedAt: now 
        })), { session })

        // One DB call per unique vendor, all parallel — no N+1
        await applyVendorCostMap(newVendorCostMap, 1, now, session)
      }

      const { tickets, hotels, transports, passports } = globalDetails
      if (tickets.length) await InvoiceTicket.insertMany(tickets.map((t: any) => ({ ...t, invoiceId: idObj, companyId: companyIdObj, createdAt: now, updatedAt: now })), { session })
      if (hotels.length) await InvoiceHotel.insertMany(hotels.map((h: any) => ({ ...h, invoiceId: idObj, companyId: companyIdObj, createdAt: now, updatedAt: now })), { session })
      if (transports.length) await InvoiceTransport.insertMany(transports.map((tr: any) => ({ ...tr, invoiceId: idObj, companyId: companyIdObj, createdAt: now, updatedAt: now })), { session })
      if (passports.length) {
        const col = mongoose.connection?.db?.collection("invoice_passports")
        if (col) await col.insertMany(passports.map((p: any, idx: number) => ({
          ...p,
          id: p.id || String(Date.now() + idx), 
          invoiceId: idObj, 
          companyId: companyIdObj,
          passportNo: p.passportNo || p.passport_no || "", 
          name: p.name || "", 
          email: p.email || "",
          dateOfIssue: p.dateOfIssue || p.date_of_issue || "", 
          dateOfExpire: p.dateOfExpire || p.date_of_expire || "",
          paxType: p.paxType || p.pax_type || "", 
          contactNo: p.contactNo || p.mobile || "",
          dateOfBirth: p.dateOfBirth || p.dob || "", 
          passportId: p.passportId || p.passport_id || "",
          createdAt: now, 
          updatedAt: now
        })), { session })
      }

      // 4. Update Client Balance
      if (clientDelta !== 0 && inv.clientId) {
        await Client.updateOne({ _id: inv.clientId, companyId: companyIdObj }, { $inc: { presentBalance: -clientDelta }, $set: { updatedAt: now } }, { session })
      }

      // 5. Re-create invoice ledger transactions (client debit only)
      await createInvoiceLedgerTxns({
        invoiceId: idObj,
        invoiceNo: headerUpdates.invoiceNo,
        salesDate: headerUpdates.salesDate,
        clientId: new Types.ObjectId(inv.clientId),
        clientName: names.clientName || "",
        netTotal: summary.netTotal,
        companyId: companyIdObj,
        now,
        session,
      })
    })
    return { ok: true }
  } catch (err: any) {
    console.error("updateInvoiceById error:", err)
    throw err
  } finally {
    session.endSession()
  }
}
