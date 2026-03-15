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

export async function getInvoiceById(id: string, companyId?: string) {
  await connectMongoose()
  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid ID", 400)
  const inv = await Invoice.findById(id).lean()
  if (!inv) throw new AppError("Not found", 404)
  const invIdStr = String(inv._id)
  // Fetch children with compatibility for existing String invoiceId
  const [items, tickets, hotels, transports, passports] = await Promise.all([
    InvoiceItem.find({ invoiceId: invIdStr, isDeleted: { $ne: true } }).lean(),
    InvoiceTicket.find({ invoiceId: invIdStr, isDeleted: { $ne: true } }).lean(),
    InvoiceHotel.find({ invoiceId: invIdStr, isDeleted: { $ne: true } }).lean(),
    InvoiceTransport.find({ invoiceId: invIdStr, isDeleted: { $ne: true } }).lean(),
    InvoicePassport.find({ invoiceId: invIdStr, isDeleted: { $ne: true } }).lean(),
  ])

  // Collect vendor references
  const vendorIds = Array.from(new Set((items || []).map(i => String(i.vendorId || "")).filter(Boolean)))
  const vendorObjectIds = vendorIds.filter(Types.ObjectId.isValid).map((s) => new Types.ObjectId(s))
  const vendorDocs = vendorObjectIds.length ? await Vendor.find({ _id: { $in: vendorObjectIds } }).lean() : []
  const vendors = vendorDocs.map(v => ({ id: String(v._id), name: v.name || "", email: v.email || "", mobile: v.mobile || "" }))

  // Include employee detail for the selected salesBy
  let employees: any[] = []
  if (inv.employeeId && Types.ObjectId.isValid(String(inv.employeeId))) {
    const e = await Employee.findById(inv.employeeId).lean()
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

  const billingWithItems = { ...(inv.billing || {}), items }
  return {
    invoice: { ...inv, id: invIdStr, billing: billingWithItems, tickets: mapTickets, hotels: mapHotels, transports: mapTransports, passports },
    vendors,
    employees,
  }
}

export async function updateInvoiceById(id: string, body: any, companyId?: string) {
  await connectMongoose()
  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid ID", 400)
  const now = new Date().toISOString()

  const session = await mongoose.startSession()
  try {
    let resultOk = false
    await session.withTransaction(async () => {
      const inv = await Invoice.findById(id).session(session)
      if (!inv) throw new AppError("Not found", 404)
      if (companyId && String(inv.companyId || "") !== String(companyId)) throw new AppError("Not found", 404)

      const general = body.general || {}
      const billing = body.billing || {}
      const headerUpdates: any = {
        invoiceNo: String(general.invoiceNo || general.invoice_no || '').trim() || inv.invoiceNo,
        clientId: general.client || general.invoice_combclient_id || inv.clientId,
        employeeId: general.salesBy || general.invoice_sales_man_id || inv.employeeId,
        agentId: general.agent || general.invoice_agent_id || inv.agentId,
        salesByName: typeof general.salesByName !== 'undefined' ? general.salesByName : inv.salesByName,
        salesDate: typeof general.salesDate !== 'undefined' ? general.salesDate : inv.salesDate,
        dueDate: typeof general.dueDate !== 'undefined' ? general.dueDate : inv.dueDate,
        billing: {
          subtotal: typeof billing.subtotal !== 'undefined' ? billing.subtotal : (inv.billing?.subtotal ?? 0),
          totalCost: typeof billing.totalCost !== 'undefined' ? billing.totalCost : (inv.billing?.totalCost ?? 0),
          discount: typeof billing.discount !== 'undefined' ? billing.discount : (inv.billing?.discount ?? 0),
          serviceCharge: typeof billing.serviceCharge !== 'undefined' ? billing.serviceCharge : (inv.billing?.serviceCharge ?? 0),
          vatTax: typeof billing.vatTax !== 'undefined' ? billing.vatTax : (inv.billing?.vatTax ?? 0),
          netTotal: typeof billing.netTotal !== 'undefined' ? billing.netTotal : (inv.billing?.netTotal ?? 0),
          note: typeof billing.note !== 'undefined' ? String(billing.note || '') : (inv.billing?.note ?? ''),
          reference: typeof billing.reference !== 'undefined' ? String(billing.reference || '') : (inv.billing?.reference ?? ''),
        },
        updatedAt: now,
      }

      // Compute client presentBalance delta
      const newNetCandidate = typeof billing.netTotal === 'number' ? billing.netTotal : (typeof body.netTotal === 'number' ? body.netTotal : undefined)
      const oldNet = Number(inv.netTotal || inv.billing?.netTotal || 0)
      const newNet = typeof newNetCandidate === 'number' ? Number(newNetCandidate) : oldNet
      const delta = newNet - oldNet

      // persist header
      inv.set({ ...headerUpdates, netTotal: newNet })
      await inv.save({ session })

      const invoiceId = String(inv._id)
      const companyIdStr = companyId ? String(companyId) : undefined
      const stripId = (doc: any) => { const { _id, ...rest } = doc || {}; return rest }

      const childItems = {
        billingItems: Array.isArray(body.billing?.items) ? body.billing.items : (Array.isArray(body.billingItems) ? body.billingItems : undefined),
        // Accept both singular keys (UI aligned) and plural legacy synonyms
        tickets: Array.isArray(body.ticket) ? body.ticket : (Array.isArray(body.tickets) ? body.tickets : undefined),
        hotels: Array.isArray(body.hotel) ? body.hotel : (Array.isArray(body.hotels) ? body.hotels : undefined),
        transports: Array.isArray(body.transport) ? body.transport : (Array.isArray(body.transports) ? body.transports : undefined),
        passports: Array.isArray(body.passport) ? body.passport : (Array.isArray(body.passports) ? body.passports : undefined),
      }

      if (childItems.billingItems) {
        // 1. Fetch and Revert Old Items Impact
        const existingItems = await InvoiceItem.find({ invoiceId }).session(session)
        for (const item of existingItems) {
          if (item.vendorId && (item.totalCost || 0) > 0) {
            const vendor = await Vendor.findById(item.vendorId).session(session)
            if (vendor) {
              let currentNet = 0
              if (vendor.presentBalance && typeof vendor.presentBalance === 'object') {
                const pType = vendor.presentBalance.type
                const pAmount = Number(vendor.presentBalance.amount || 0)
                currentNet = (pType === 'advance' ? pAmount : -pAmount)
              } else {
                currentNet = Number(vendor.presentBalance || 0)
              }
              // Revert: Cost was subtracted (Due increased). So we ADD it back.
              // NewNet = CurrentNet + OldCost
              const newNet = currentNet + Number(item.totalCost || 0)
              const newType = newNet >= 0 ? "advance" : "due"
              const newAmount = Math.abs(newNet)
              
              await Vendor.findByIdAndUpdate(item.vendorId, { 
                presentBalance: { type: newType, amount: newAmount } 
              }, { session })
            }
          }
        }

        await InvoiceItem.deleteMany({ invoiceId }).session(session)
        const docs = childItems.billingItems.map((i: any, idx: number) => ({
          ...stripId(i),
          // Ensure vendorId is preserved from UI 'vendor' or legacy fields
          vendorId: i.vendorId || i.vendor || i.billing_comvendor || "",
          invoiceId,
          companyId: companyIdStr,
          id: i.id || String(Date.now() + idx),
          updatedAt: now,
        }))
        if (docs.length) {
          await InvoiceItem.insertMany(docs, { session })

          // 2. Apply New Items Impact
          for (const item of docs) {
            if (item.vendorId && (item.totalCost || 0) > 0) {
              const vendor = await Vendor.findById(item.vendorId).session(session)
              if (vendor) {
                let currentNet = 0
                if (vendor.presentBalance && typeof vendor.presentBalance === 'object') {
                  const pType = vendor.presentBalance.type
                  const pAmount = Number(vendor.presentBalance.amount || 0)
                  currentNet = (pType === 'advance' ? pAmount : -pAmount)
                } else {
                  currentNet = Number(vendor.presentBalance || 0)
                }
                
                // Apply: Cost subtracts from balance (increases Due).
                const newNet = currentNet - Number(item.totalCost || 0)
                const newType = newNet >= 0 ? "advance" : "due"
                const newAmount = Math.abs(newNet)

                await Vendor.findByIdAndUpdate(item.vendorId, { 
                  presentBalance: { type: newType, amount: newAmount } 
                }, { session })
              }
            }
          }
        }
      }
      if (childItems.tickets) {
        await InvoiceTicket.deleteMany({ invoiceId }).session(session)
        const docs = childItems.tickets.map((t: any, idx: number) => ({ ...stripId(t), invoiceId, companyId: companyIdStr, id: t.id || String(Date.now() + idx), updatedAt: now }))
        if (docs.length) await InvoiceTicket.insertMany(docs, { session })
      }
      if (childItems.hotels) {
        await InvoiceHotel.deleteMany({ invoiceId }).session(session)
        const docs = childItems.hotels.map((h: any, idx: number) => ({ ...stripId(h), invoiceId, companyId: companyIdStr, id: h.id || String(Date.now() + idx), updatedAt: now }))
        if (docs.length) await InvoiceHotel.insertMany(docs, { session })
      }
      if (childItems.transports) {
        await InvoiceTransport.deleteMany({ invoiceId }).session(session)
        const docs = childItems.transports.map((tr: any, idx: number) => ({ ...stripId(tr), invoiceId, companyId: companyIdStr, id: tr.id || String(Date.now() + idx), updatedAt: now }))
        if (docs.length) await InvoiceTransport.insertMany(docs, { session })
      }
      if (childItems.passports) {
        await InvoicePassport.deleteMany({ invoiceId }).session(session)
        const docs = childItems.passports.map((p: any, idx: number) => ({
          // keep UI-provided fields
          id: p.id || String(Date.now() + idx),
          invoiceId,
          companyId: companyIdStr,
          passportNo: p.passportNo || p.passport_no || "",
          name: p.name || "",
          email: p.email || "",
          dateOfIssue: p.dateOfIssue || p.date_of_issue || "",
          dateOfExpire: p.dateOfExpire || p.date_of_expire || "",
          // new schema fields
          paxType: p.paxType || p.pax_type || "",
          contactNo: p.contactNo || p.mobile || "",
          dateOfBirth: p.dateOfBirth || p.dob || "",
          passportId: p.passportId || p.passport_id || "",
          // timestamps
          createdAt: now,
          updatedAt: now,
        }))
        if (docs.length) {
          const col = mongoose.connection?.db?.collection("invoice_passports")
          if (!col) throw new AppError("DB not available", 500)
          await col.insertMany(docs as any[], { session })
        }
      }

      // Adjust client's presentBalance (invoice increases due → subtract delta)
      if (delta !== 0 && inv.clientId && Types.ObjectId.isValid(String(inv.clientId))) {
        await Client.updateOne({ _id: inv.clientId }, { $inc: { presentBalance: -delta }, $set: { updatedAt: now } }, { session })
      }

      // Auto allocate advances to this invoice after update
      const netTotal = Number(inv.netTotal || inv.billing?.netTotal || 0)
      const currentReceived = Number(inv.receivedAmount || 0)
      let needed = Math.max(0, netTotal - currentReceived)
      if (needed > 0 && inv.clientId && Types.ObjectId.isValid(String(inv.clientId))) {
        const companyIdStr = companyId ? String(companyId) : undefined
        const filter: any = { clientId: inv.clientId, paymentTo: "advance" }
        if (companyIdStr) {
          filter.$or = [
            { companyId: new Types.ObjectId(companyIdStr) },
            { companyId: companyIdStr },
          ]
        }
        const receipts = await MoneyReceipt.find(filter).sort({ createdAt: 1 }).lean()
        let appliedSoFar = 0
        for (const r of receipts) {
          if (needed <= 0) break
          const paid = Math.max(0, parseNumber((r as any).amount, 0) - parseNumber((r as any).discount, 0))
          const existingAllocs = await MoneyReceiptAllocation.find({ moneyReceiptId: (r as any)._id }).session(session).lean()
          const appliedExisting = (existingAllocs || []).reduce((s, a: any) => s + Math.max(0, parseNumber(a.appliedAmount, 0)), 0)
          const remain = Math.max(0, paid - appliedExisting)
          if (remain <= 0) continue
          const apply = Math.min(needed, remain)
          await new MoneyReceiptAllocation({
            moneyReceiptId: (r as any)._id,
            invoiceId,
            clientId: inv.clientId,
            companyId: inv.companyId,
            voucherNo: String((r as any).voucherNo || ""),
            appliedAmount: apply,
            paymentDate: String((r as any).paymentDate || inv.salesDate || now),
            createdAt: now,
            updatedAt: now,
          }).save({ session })
          const newAllocatedTotal = appliedExisting + apply
          const newRemaining = Math.max(0, paid - newAllocatedTotal)
          await MoneyReceipt.updateOne(
            { _id: (r as any)._id },
            { $set: { allocatedAmount: newAllocatedTotal, remainingAmount: newRemaining, updatedAt: now } },
            { session }
          )
          appliedSoFar += apply
          const newRecv = currentReceived + appliedSoFar
          const status = newRecv >= netTotal ? "paid" : (newRecv > 0 ? "partial" : "due")
          await Invoice.updateOne({ _id: inv._id }, { $set: { receivedAmount: newRecv, status, updatedAt: now } }, { session })
          // Avoid creating a new ClientTransaction for Advance Allocation
          // Because the original MoneyReceipt already created a ClientTransaction (credit).
          // Allocating it to an invoice is just internal bookkeeping, not a new flow of money from client.
          // IF we create another transaction here, it duplicates the credit in the ledger.
          /*
          await new ClientTransaction({
            date: String((r as any).paymentDate || inv.salesDate || now),
            voucherNo: String((r as any).voucherNo || ""),
            clientId: inv.clientId,
            clientName: inv.clientName || "",
            companyId: inv.companyId,
            invoiceType: "INVOICE",
            paymentTypeId: (r as any).accountId,
            accountName: (r as any).accountName,
            payType: (r as any).paymentMethod || undefined,
            amount: apply,
            direction: "receiv",
            note: (r as any).note || undefined,
            createdAt: now,
            updatedAt: now,
          }).save({ session })
          */
          needed -= apply
        }
      }

      resultOk = true
    })

    if (resultOk) return { ok: true }
    // Fallback in case transaction was aborted without throw
    return { ok: false }
  } catch (err: any) {
    // If transactions are not supported (e.g., non-replica set), fallback to non-transactional path
    try {
      const inv = await Invoice.findById(id)
      if (!inv) throw new AppError("Not found", 404)
      if (companyId && String(inv.companyId || "") !== String(companyId)) throw new AppError("Not found", 404)

      const general = body.general || {}
      const billing = body.billing || {}
      const headerUpdates: any = {
        invoiceNo: String(general.invoiceNo || general.invoice_no || '').trim() || inv.invoiceNo,
        clientId: general.client || general.invoice_combclient_id || inv.clientId,
        employeeId: general.salesBy || general.invoice_sales_man_id || inv.employeeId,
        agentId: general.agent || general.invoice_agent_id || inv.agentId,
        salesByName: typeof general.salesByName !== 'undefined' ? general.salesByName : inv.salesByName,
        salesDate: typeof general.salesDate !== 'undefined' ? general.salesDate : inv.salesDate,
        dueDate: typeof general.dueDate !== 'undefined' ? general.dueDate : inv.dueDate,
        billing: {
          subtotal: typeof billing.subtotal !== 'undefined' ? billing.subtotal : (inv.billing?.subtotal ?? 0),
          totalCost: typeof billing.totalCost !== 'undefined' ? billing.totalCost : (inv.billing?.totalCost ?? 0),
          discount: typeof billing.discount !== 'undefined' ? billing.discount : (inv.billing?.discount ?? 0),
          serviceCharge: typeof billing.serviceCharge !== 'undefined' ? billing.serviceCharge : (inv.billing?.serviceCharge ?? 0),
          vatTax: typeof billing.vatTax !== 'undefined' ? billing.vatTax : (inv.billing?.vatTax ?? 0),
          netTotal: typeof billing.netTotal !== 'undefined' ? billing.netTotal : (inv.billing?.netTotal ?? 0),
          note: typeof billing.note !== 'undefined' ? String(billing.note || '') : (inv.billing?.note ?? ''),
          reference: typeof billing.reference !== 'undefined' ? String(billing.reference || '') : (inv.billing?.reference ?? ''),
        },
        updatedAt: now,
      }

      const newNetCandidate = typeof billing.netTotal === 'number' ? billing.netTotal : (typeof body.netTotal === 'number' ? body.netTotal : undefined)
      const oldNet = Number(inv.netTotal || inv.billing?.netTotal || 0)
      const newNet = typeof newNetCandidate === 'number' ? Number(newNetCandidate) : oldNet
      const delta = newNet - oldNet

      inv.set({ ...headerUpdates, netTotal: newNet })
      await inv.save()

      const invoiceId = String(inv._id)
      const companyIdStr = companyId ? String(companyId) : undefined
      const stripId = (doc: any) => { const { _id, ...rest } = doc || {}; return rest }

      const childItems = {
        billingItems: Array.isArray(body.billing?.items) ? body.billing.items : (Array.isArray(body.billingItems) ? body.billingItems : undefined),
        // Accept both singular keys (UI aligned) and plural legacy synonyms
        tickets: Array.isArray(body.ticket) ? body.ticket : (Array.isArray(body.tickets) ? body.tickets : undefined),
        hotels: Array.isArray(body.hotel) ? body.hotel : (Array.isArray(body.hotels) ? body.hotels : undefined),
        transports: Array.isArray(body.transport) ? body.transport : (Array.isArray(body.transports) ? body.transports : undefined),
        passports: Array.isArray(body.passport) ? body.passport : (Array.isArray(body.passports) ? body.passports : undefined),
      }

      if (childItems.billingItems) {
        await InvoiceItem.deleteMany({ invoiceId })
        const docs = childItems.billingItems.map((i: any, idx: number) => {
          const vId = i.vendorId || i.vendor || i.billing_comvendor
          return {
            ...stripId(i),
            vendorId: (vId && Types.ObjectId.isValid(vId)) ? new Types.ObjectId(vId) : null,
            invoiceId,
            companyId: companyIdStr,
            id: i.id || String(Date.now() + idx),
            updatedAt: now,
          }
        })
        if (docs.length) await InvoiceItem.insertMany(docs)
      }
      if (childItems.tickets) {
        await InvoiceTicket.deleteMany({ invoiceId })
        const docs = childItems.tickets.map((t: any, idx: number) => ({ ...stripId(t), invoiceId, companyId: companyIdStr, id: t.id || String(Date.now() + idx), updatedAt: now }))
        if (docs.length) await InvoiceTicket.insertMany(docs)
      }
      if (childItems.hotels) {
        await InvoiceHotel.deleteMany({ invoiceId })
        const docs = childItems.hotels.map((h: any, idx: number) => ({ ...stripId(h), invoiceId, companyId: companyIdStr, id: h.id || String(Date.now() + idx), updatedAt: now }))
        if (docs.length) await InvoiceHotel.insertMany(docs)
      }
      if (childItems.transports) {
        await InvoiceTransport.deleteMany({ invoiceId })
        const docs = childItems.transports.map((tr: any, idx: number) => ({ ...stripId(tr), invoiceId, companyId: companyIdStr, id: tr.id || String(Date.now() + idx), updatedAt: now }))
        if (docs.length) await InvoiceTransport.insertMany(docs)
      }
      if (childItems.passports) {
        await InvoicePassport.deleteMany({ invoiceId })
        const docs = childItems.passports.map((p: any, idx: number) => ({
          id: p.id || String(Date.now() + idx),
          invoiceId,
          companyId: companyIdStr,
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
          updatedAt: now,
        }))
        if (docs.length) {
          const col = mongoose.connection?.db?.collection("invoice_passports")
          if (!col) throw new AppError("DB not available", 500)
          await col.insertMany(docs as any[])
        }
      }

      if (delta !== 0 && inv.clientId && Types.ObjectId.isValid(String(inv.clientId))) {
        await Client.updateOne({ _id: inv.clientId }, { $inc: { presentBalance: -delta }, $set: { updatedAt: now } })
      }

      return { ok: true }
    } catch (fallbackErr) {
      throw fallbackErr
    }
  } finally {
    session.endSession()
  }
}

function parseNumber(n: any, def = 0): number { const x = Number(n); return isFinite(x) ? x : def }

export async function listInvoices(params: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  clientId?: string
  companyId?: string
}) {
  await connectMongoose()
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.max(1, Math.min(100, Number(params.pageSize) || 20))
  const skip = (page - 1) * pageSize

  const filter: any = { isDeleted: { $ne: true } }
  if (params.companyId) filter.companyId = new Types.ObjectId(params.companyId)
  if (params.clientId) filter.clientId = new Types.ObjectId(params.clientId)
  if (params.status) filter.status = params.status
  if (params.invoiceType) {
    filter.invoiceType = params.invoiceType
  } else {
    // If no type specified, exclude non_commission from general list if needed
    // Actually, usually the general list shows standard/visa
    filter.invoiceType = { $ne: "non_commission" }
  }
  
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

  const invoices = docs.map((d: any) => ({
    id: String(d._id),
    clientId: String(d.clientId || ""),
    invoiceNo: d.invoiceNo,
    clientName: d.clientName || "",
    clientPhone: d.clientPhone || "",
    salesDate: d.salesDate,
    dueDate: d.dueDate || "",
    salesPrice: parseNumber(d.netTotal, 0),
    totalCost: parseNumber(d.billing?.totalCost || 0, 0),
    receivedAmount: parseNumber(d.receivedAmount, 0),
    dueAmount: Math.max(0, parseNumber(d.netTotal, 0) - parseNumber(d.receivedAmount, 0)),
    mrNo: "", // We can populate this if needed, but keeping it simple for now
    passportNo: "", // We can populate this if needed
    salesBy: d.salesByName || "",
    status: d.status || "due",
    invoiceType: d.invoiceType || "standard",
    createdAt: d.createdAt || new Date().toISOString(),
    updatedAt: d.updatedAt || new Date().toISOString(),
  }))

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

export async function createNonCommissionInvoice(body: any, companyId?: string) {
  await connectMongoose()
  const { general, items: invoiceItems, billing } = body
  const now = new Date().toISOString()
  const companyIdStr = companyId ? String(companyId) : undefined

  // 1. Validation
  if (!general.clientId) throw new AppError("Client is required", 400)
  if (!general.employeeId) throw new AppError("Sales person is required", 400)
  if (!general.salesDate) throw new AppError("Sales date is required", 400)
  if (!invoiceItems || invoiceItems.length === 0) throw new AppError("At least one item is required", 400)

  // 2. Resolve Client & Check Credit Limit
  const clientDoc = await Client.findById(general.clientId).lean()
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
    const e = await Employee.findById(employeeId).lean()
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
    companyId: companyIdStr ? new Types.ObjectId(companyIdStr) : undefined,
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

  const session = await mongoose.startSession()
  try {
    let resultOk = false
    let createdId = ""
    await session.withTransaction(async () => {
      const result = await Invoice.create([headerDoc], { session })
      const invoiceId = String(result[0]._id)
      createdId = invoiceId

      // 5. Create Child Records
      for (const item of invoiceItems) {
        const { ticketDetails, paxEntries, flightEntries } = item
        
        // a. Create InvoiceItem (Financial Row)
        await InvoiceItem.create([{
          invoiceId,
          product: "Non-Commission Ticket",
          paxName: ticketDetails.paxName || "",
          description: `Ticket: ${ticketDetails.ticketNo} | Route: ${ticketDetails.route}`,
          quantity: 1,
          unitPrice: parseNumber(ticketDetails.clientPrice, 0),
          costPrice: parseNumber(ticketDetails.purchasePrice, 0),
          totalSales: parseNumber(ticketDetails.clientPrice, 0),
          totalCost: parseNumber(ticketDetails.purchasePrice, 0),
          profit: parseNumber(item.profit, 0),
          vendorId: ticketDetails.vendor ? new Types.ObjectId(ticketDetails.vendor) : null,
          companyId: companyIdStr,
          createdAt: now,
          updatedAt: now
        }], { session })

        // b. Create InvoiceTicket
        await InvoiceTicket.create([{
          invoiceId,
          ticketNo: ticketDetails.ticketNo,
          pnr: ticketDetails.pnr,
          route: ticketDetails.route,
          journeyDate: ticketDetails.journeyDate,
          returnDate: ticketDetails.returnDate,
          airline: ticketDetails.airline,
          companyId: companyIdStr,
          createdAt: now,
          updatedAt: now
        }], { session })

        // c. Create InvoicePassports
        if (paxEntries.length > 0) {
          await InvoicePassport.insertMany(paxEntries.map((p: any) => ({
            invoiceId,
            passportNo: p.passportId || "", // This is usually the passport number string from frontend if not resolved
            name: p.name,
            paxType: p.paxType,
            contactNo: p.contactNo,
            email: p.email,
            dateOfBirth: p.dob,
            dateOfIssue: p.dateOfIssue,
            dateOfExpire: p.dateOfExpire,
            companyId: companyIdStr,
            createdAt: now,
            updatedAt: now
          })), { session })
        }

        // d. Create InvoiceTransports (Using as Flight storage for Non-Commission)
        // Note: We don't have a specific Flight model in the selected list, 
        // standard invoices use InvoiceTicket for flight segments too, but here we have a dedicated flightEntries array.
        // Let's use InvoiceTransport or just InvoiceTicket segments if we want to follow existing patterns.
        // Given the prompt mentioned InvoiceTransport model, let's use it for extra flight segments.
        if (flightEntries.length > 0) {
          await InvoiceTransport.insertMany(flightEntries.map((f: any) => ({
            invoiceId,
            transportType: `Flight: ${f.flightNo}`,
            referenceNo: f.airline,
            pickupPlace: f.from,
            dropOffPlace: f.to,
            pickupTime: f.departureTime,
            dropoffTime: f.arrivalTime,
            pickupDate: f.flyDate,
            companyId: companyIdStr,
            createdAt: now,
            updatedAt: now
          })), { session })
        }

        // e. Update Vendor Balance
        if (ticketDetails.vendor && parseNumber(ticketDetails.purchasePrice, 0) > 0) {
          await Vendor.updateOne(
            { _id: ticketDetails.vendor },
            { $inc: { "presentBalance.amount": parseNumber(ticketDetails.purchasePrice, 0) }, $set: { "presentBalance.type": "due" } },
            { session }
          )
        }
      }

      // 6. Update Client Balance
      await Client.updateOne(
        { _id: clientDoc._id },
        { $inc: { presentBalance: -netTotal }, $set: { updatedAt: now } },
        { session }
      )

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

export async function getNonCommissionInvoiceById(id: string, companyId?: string) {
  await connectMongoose()
  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid ID", 400)
  const inv = await Invoice.findOne({ _id: new Types.ObjectId(id), invoiceType: "non_commission" }).lean()
  if (!inv) throw new AppError("Not found", 404)
  if (companyId && String(inv.companyId || "") !== String(companyId)) throw new AppError("Unauthorized", 401)

  const invIdStr = String(inv._id)
  // Fetch children
  const [items, tickets, transports, passports] = await Promise.all([
    InvoiceItem.find({ invoiceId: invIdStr, isDeleted: { $ne: true } }).lean(),
    InvoiceTicket.find({ invoiceId: invIdStr, isDeleted: { $ne: true } }).lean(),
    InvoiceTransport.find({ invoiceId: invIdStr, isDeleted: { $ne: true } }).lean(),
    InvoicePassport.find({ invoiceId: invIdStr, isDeleted: { $ne: true } }).lean(),
  ])

  // Map to the shape expected by the frontend Edit modal
  // Non-Commission modal stores items in a list, each having ticketDetails, paxEntries, flightEntries
  // We need to reconstruct those items. Since we store them as separate records, 
  // and each InvoiceItem record represents one ticket in the UI list.
  
  const reconstructedItems = items.map((ii: any) => {
    // Find matching ticket for this item
    const ticket = tickets.find((t: any) => t.ticketNo === ii.paxName || t.route === ii.description.split('|')[1]?.split(':')[1]?.trim()) || tickets[0]
    // Note: In createNonCommissionInvoice we store description as `Ticket: ${ticketNo} | Route: ${route}`
    // and paxName as ticketDetails.paxName.
    
    // For simplicity, if multiple items exist, we might need a better matching logic or store an itemId in child records.
    // Given the current implementation, we'll assume a 1:1 match for demo purposes or fetch all and distribute.
    
    return {
      id: ii.id || String(ii._id),
      ticketDetails: {
        ticketNo: ticket?.ticketNo || "",
        clientPrice: ii.totalSales || 0,
        purchasePrice: ii.totalCost || 0,
        extraFee: 0, // we didn't store extraFee separately in InvoiceItem, but it's part of totalSales calculation
        vendor: String(ii.vendorId || ""),
        airline: ticket?.airline || "",
        ticketType: "",
        route: ticket?.route || "",
        pnr: ticket?.pnr || "",
        gdsPnr: "",
        paxName: ii.paxName || "",
        issueDate: ticket?.createdAt ? new Date(ticket.createdAt) : new Date(),
        journeyDate: ticket?.journeyDate ? new Date(ticket.journeyDate) : undefined,
        returnDate: ticket?.returnDate ? new Date(ticket.returnDate) : undefined,
        airbusClass: ""
      },
      paxEntries: passports.filter((p: any) => p.invoiceId === invIdStr).map((p: any) => ({
        id: p.id || String(p._id),
        passportId: p.passportNo,
        name: p.name,
        paxType: p.paxType,
        contactNo: p.contactNo,
        email: p.email,
        dob: p.dateOfBirth ? new Date(p.dateOfBirth) : undefined,
        dateOfIssue: p.dateOfIssue ? new Date(p.dateOfIssue) : undefined,
        dateOfExpire: p.dateOfExpire ? new Date(p.dateOfExpire) : undefined
      })),
      flightEntries: transports.filter((tr: any) => tr.invoiceId === invIdStr).map((tr: any) => ({
        id: tr.id || String(tr._id),
        from: tr.pickupPlace,
        to: tr.dropOffPlace,
        airline: tr.referenceNo,
        flightNo: tr.transportType?.replace("Flight: ", ""),
        flyDate: tr.pickupDate ? new Date(tr.pickupDate) : undefined,
        departureTime: tr.pickupTime,
        arrivalTime: tr.dropoffTime
      })),
      profit: ii.profit || 0
    }
  })

  return {
    ...inv,
    id: invIdStr,
    items: reconstructedItems
  }
}

export async function updateNonCommissionInvoice(id: string, body: any, companyId?: string) {
  await connectMongoose()
  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid ID", 400)
  
  const session = await mongoose.startSession()
  try {
    let resultOk = false
    await session.withTransaction(async () => {
      // 1. Delete existing related records (Soft delete or hard delete for replacement)
      const invIdStr = String(id)
      await Promise.all([
        InvoiceItem.deleteMany({ invoiceId: invIdStr }).session(session),
        InvoiceTicket.deleteMany({ invoiceId: invIdStr }).session(session),
        InvoicePassport.deleteMany({ invoiceId: invIdStr }).session(session),
        InvoiceTransport.deleteMany({ invoiceId: invIdStr }).session(session),
      ])

      // 2. Re-create header and children using existing create logic adapted for Update
      // We'll update the Invoice header instead of creating new
      const { general, items: invoiceItems, billing } = body
      const now = new Date().toISOString()
      const companyIdStr = companyId ? String(companyId) : undefined

      const clientDoc = await Client.findById(general.clientId).lean()
      if (!clientDoc) throw new AppError("Client not found", 404)
      
      const netTotal = parseNumber(billing.netTotal, 0)
      const oldInv = await Invoice.findById(id).session(session)
      const oldNetTotal = parseNumber(oldInv.netTotal, 0)
      const delta = netTotal - oldNetTotal

      const names: any = { clientName: clientDoc.name || "", clientPhone: clientDoc.phone || "" }
      const employeeId = Types.ObjectId.isValid(general.employeeId) ? new Types.ObjectId(general.employeeId) : undefined
      if (employeeId) {
        const e = await Employee.findById(employeeId).lean()
        if (e) names.salesByName = e.name || (e as any).fullName || ""
      }

      const headerUpdates: any = {
        invoiceNo: general.invoiceNo,
        salesDate: String(general.salesDate),
        dueDate: general.dueDate || "",
        clientId: new Types.ObjectId(clientDoc._id),
        employeeId,
        agentId: general.agentId ? new Types.ObjectId(general.agentId) : undefined,
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

      await Invoice.findByIdAndUpdate(id, { $set: headerUpdates }, { session })

      // 3. Create Child Records (Same as create logic)
      for (const item of invoiceItems) {
        const { ticketDetails, paxEntries, flightEntries } = item
        await InvoiceItem.create([{
          invoiceId: invIdStr,
          product: "Non-Commission Ticket",
          paxName: ticketDetails.paxName || "",
          description: `Ticket: ${ticketDetails.ticketNo} | Route: ${ticketDetails.route}`,
          quantity: 1,
          unitPrice: parseNumber(ticketDetails.clientPrice, 0),
          costPrice: parseNumber(ticketDetails.purchasePrice, 0),
          totalSales: parseNumber(ticketDetails.clientPrice, 0),
          totalCost: parseNumber(ticketDetails.purchasePrice, 0),
          profit: parseNumber(item.profit, 0),
          vendorId: ticketDetails.vendor ? new Types.ObjectId(ticketDetails.vendor) : null,
          companyId: companyIdStr,
          createdAt: now,
          updatedAt: now
        }], { session })

        await InvoiceTicket.create([{
          invoiceId: invIdStr,
          ticketNo: ticketDetails.ticketNo,
          pnr: ticketDetails.pnr,
          route: ticketDetails.route,
          journeyDate: ticketDetails.journeyDate,
          returnDate: ticketDetails.returnDate,
          airline: ticketDetails.airline,
          companyId: companyIdStr,
          createdAt: now,
          updatedAt: now
        }], { session })

        if (paxEntries.length > 0) {
          await InvoicePassport.insertMany(paxEntries.map((p: any) => ({
            invoiceId: invIdStr,
            passportNo: p.passportId || "",
            name: p.name,
            paxType: p.paxType,
            contactNo: p.contactNo,
            email: p.email,
            dateOfBirth: p.dob,
            dateOfIssue: p.dateOfIssue,
            dateOfExpire: p.dateOfExpire,
            companyId: companyIdStr,
            createdAt: now,
            updatedAt: now
          })), { session })
        }

        if (flightEntries.length > 0) {
          await InvoiceTransport.insertMany(flightEntries.map((f: any) => ({
            invoiceId: invIdStr,
            transportType: `Flight: ${f.flightNo}`,
            referenceNo: f.airline,
            pickupPlace: f.from,
            dropOffPlace: f.to,
            pickupTime: f.departureTime,
            dropoffTime: f.arrivalTime,
            pickupDate: f.flyDate,
            companyId: companyIdStr,
            createdAt: now,
            updatedAt: now
          })), { session })
        }
      }

      // 4. Update Client Balance (Adjust by delta)
      if (delta !== 0) {
        await Client.updateOne(
          { _id: clientDoc._id },
          { $inc: { presentBalance: -delta }, $set: { updatedAt: now } },
          { session }
        )
      }

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

export async function deleteInvoiceById(id: string, companyId?: string) {
  await connectMongoose()
  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid ID", 400)

  const session = await mongoose.startSession()
  try {
    let resultOk = false
    await session.withTransaction(async () => {
      const inv = await Invoice.findById(id).session(session)
      if (!inv) throw new AppError("Not found", 404)
      if (companyId && String(inv.companyId || "") !== String(companyId)) throw new AppError("Not found", 404)

      const invoiceId = String(inv._id)
      const now = new Date().toISOString()

      // 1. Fetch items and aggregate costs by vendor to avoid N+1
      const existingItems = await InvoiceItem.find({ invoiceId }).session(session)
      const vendorCostsMap = new Map<string, number>()
      
      for (const item of existingItems) {
        if (item.vendorId && (item.totalCost || 0) > 0) {
          const vId = String(item.vendorId)
          vendorCostsMap.set(vId, (vendorCostsMap.get(vId) || 0) + Number(item.totalCost || 0))
        }
      }

      // 2. Bulk update vendors
      if (vendorCostsMap.size > 0) {
        const vendorIds = Array.from(vendorCostsMap.keys())
        const vendors = await Vendor.find({ _id: { $in: vendorIds } }).session(session)
        
        for (const vendor of vendors) {
          const revertAmount = vendorCostsMap.get(String(vendor._id)) || 0
          let currentNet = 0
          if (vendor.presentBalance && typeof vendor.presentBalance === 'object') {
            const pType = vendor.presentBalance.type
            const pAmount = Number(vendor.presentBalance.amount || 0)
            currentNet = (pType === 'advance' ? pAmount : -pAmount)
          } else {
            currentNet = Number(vendor.presentBalance || 0)
          }
          
          // Reverting the cost: Invoice cost subtracted from balance, so we ADD it back
          const newNet = currentNet + revertAmount
          const newType = newNet >= 0 ? "advance" : "due"
          const newAmount = Math.abs(newNet)
          
          vendor.presentBalance = { type: newType, amount: newAmount }
          vendor.updatedAt = now
          await vendor.save({ session })
        }
      }

      // 3. Adjust Client Balance (reverting the invoice net total impact)
      const net = Number(inv.netTotal || inv.billing?.netTotal || 0)
      if (net !== 0 && inv.clientId) {
        // Invoice increases client due (negative impact on balance), so we add it back
        await Client.updateOne(
          { _id: inv.clientId }, 
          { $inc: { presentBalance: net }, $set: { updatedAt: now } }, 
          { session }
        )
      }

      // 4. Cascading Soft Delete for all related tables
      const softDeleteFilter = { invoiceId }
      const softDeleteUpdate = { $set: { isDeleted: true, updatedAt: now } }
      
      await Promise.all([
        InvoiceItem.updateMany(softDeleteFilter, softDeleteUpdate, { session }),
        InvoiceTicket.updateMany(softDeleteFilter, softDeleteUpdate, { session }),
        InvoiceHotel.updateMany(softDeleteFilter, softDeleteUpdate, { session }),
        InvoiceTransport.updateMany(softDeleteFilter, softDeleteUpdate, { session }),
        InvoicePassport.updateMany(softDeleteFilter, softDeleteUpdate, { session }),
        // Soft delete the invoice itself
        Invoice.updateOne({ _id: inv._id }, softDeleteUpdate, { session })
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


export async function createInvoice(body: any, companyId?: string) {
  await connectMongoose()
  const general = body.general || body
  const billing = body.billing || { items: body.billing_information || [] }
  const billingItemsRaw = Array.isArray(billing.items) ? billing.items : []

  // 1. Backend Validation
  if (!general.client && !general.invoice_combclient_id) throw new AppError("Client is required", 400)
  if (!general.salesBy && !general.invoice_sales_man_id) throw new AppError("Sales person is required", 400)
  if (!general.salesDate && !general.invoice_sales_date) throw new AppError("Sales date is required", 400)
  
  if (billingItemsRaw.length === 0) {
    throw new AppError("At least one billing item is required", 400)
  }

  for (const item of billingItemsRaw) {
    if (!item.product && !item.billing_product_id) throw new AppError("Product is required for all billing items", 400)
    if (parseNumber(item.unitPrice ?? item.billing_unit_price, 0) <= 0) throw new AppError("Unit price must be greater than zero", 400)
    const cost = parseNumber(item.costPrice ?? item.billing_cost_price, 0)
    const vId = item.vendor || item.billing_comvendor || item.vendorId
    if (cost > 0 && !vId) {
      throw new AppError("Vendor is required when cost price is provided", 400)
    }
  }

  let tickets = body.ticket || body.ticketInfo || []
  const hotels = body.hotel || body.hotel_information || []
  let transports = body.transport || body.transport_information || []
  const passports = body.passport || body.passport_information || []
  // console.log("passportspassports=> ", passports)
  // return
  const invoiceNo = String(general.invoice_no || general.invoiceNo || "").trim()
  const clientIdRaw = String(general.invoice_combclient_id || general.client || "").trim()
  const employeeIdRaw = String(general.invoice_sales_man_id || general.salesBy || "").trim()
  const agentIdRaw = general.invoice_agent_id ? String(general.invoice_agent_id) : (general.agent || "")
  const salesDate = String(general.invoice_sales_date || general.salesDate || new Date().toISOString())
  const dueDate = general.invoice_due_date || general.dueDate || ""
  const showPrevDue = !!(general.invoice_show_prev_due || body.showPrevDue)
  const showDiscount = !!(general.invoice_show_discount || body.showDiscount)

  const subtotal = parseNumber(billing.subtotal ?? body.invoice_sub_total ?? (Array.isArray(billing.items) ? billing.items.reduce((s: number, i: any) => s + parseNumber(i.billing_subtotal ?? i.totalSales ?? 0), 0) : 0))
  const totalCost = parseNumber(billing.totalCost ?? (Array.isArray(billing.items) ? billing.items.reduce((s: number, i: any) => s + parseNumber(i.totalCost ?? 0), 0) : 0))
  const discount = parseNumber(billing.discount ?? body.billing_discount ?? body.discount ?? 0)
  const serviceCharge = parseNumber(billing.serviceCharge ?? body.service_charge ?? 0)
  const vatTax = parseNumber(billing.vatTax ?? body.vat_tax ?? 0)
  const netTotal = parseNumber(body.invoice_net_total ?? (billing.netTotal ?? (subtotal - discount + serviceCharge + vatTax)))
  const agentCommission = parseNumber(body.invoice_agent_com_amount ?? 0)
  const clientPreviousDue = parseNumber(body.invoice_client_previous_due ?? 0)
  const note = typeof billing.note !== 'undefined' ? String(billing.note || '') : (typeof body.billing_note !== 'undefined' ? String(body.billing_note || '') : '')
  const reference = typeof billing.reference !== 'undefined' ? String(billing.reference || '') : (typeof body.billing_reference !== 'undefined' ? String(body.billing_reference || '') : '')

  // Client resolution
  let clientDoc: any = null
  if (Types.ObjectId.isValid(clientIdRaw)) {
    clientDoc = await Client.findById(clientIdRaw).lean()
  } else if (clientIdRaw.startsWith("client-")) {
    const uniqueId = Number(clientIdRaw.replace("client-", ""))
    clientDoc = await Client.findOne({ uniqueId }).lean()
  }
  if (!clientDoc) throw new AppError("Client not found", 404)
  const creditLimit = parseNumber(clientDoc.creditLimit || 0)
  const presentBalance = parseNumber(clientDoc.presentBalance || 0)
  if (creditLimit > 0 && presentBalance + netTotal > creditLimit) {
    throw new AppError("Credit limit exceeded", 400, "credit_limit_exceeded")
  }

  // Denormalized names
  const names: any = {}
  names.clientName = clientDoc.name || ""
  names.clientPhone = clientDoc.phone || ""
  const employeeId = Types.ObjectId.isValid(employeeIdRaw) ? new Types.ObjectId(employeeIdRaw) : undefined
  if (employeeId) {
    const e = await Employee.findById(employeeId).lean()
    if (e) names.salesByName = e.name || (e as any).fullName || ""
  }
  const agentId = Types.ObjectId.isValid(agentIdRaw) ? new Types.ObjectId(agentIdRaw) : undefined
  if (agentId) {
    // Agents model exists; we can resolve later if needed
    names.agentName = ""
  }

  // Normalize billing items
  const billingItems = (Array.isArray(billing.items) ? billing.items : []).map((i: any) => {
    const vId = i.vendor || i.billing_comvendor
    return {
      product: i.product || i.billing_product_id || "",
      paxName: i.paxName || i.pax_name || "",
      description: i.description || i.billing_description || "",
      quantity: parseNumber(i.quantity ?? i.billing_quantity ?? 1),
      unitPrice: parseNumber(i.unitPrice ?? i.billing_unit_price ?? 0),
      costPrice: parseNumber(i.costPrice ?? i.billing_cost_price ?? 0),
      totalSales: parseNumber(i.totalSales ?? i.billing_total_sales ?? i.billing_subtotal ?? 0),
      totalCost: parseNumber(i.totalCost ?? 0),
      profit: parseNumber(i.profit ?? i.billing_profit ?? 0),
      vendorId: (vId && Types.ObjectId.isValid(vId)) ? new Types.ObjectId(vId) : null,
    }
  })

  const receivedAmount = 0
  const status = receivedAmount >= netTotal ? "paid" : receivedAmount > 0 ? "partial" : "due"
  const now = new Date().toISOString()

  const headerDoc: any = {
    invoiceNo,
    salesDate,
    dueDate,
    clientId: new Types.ObjectId(clientDoc._id),
    employeeId: employeeId,
    agentId: agentId,
    companyId: companyId ? new Types.ObjectId(companyId) : undefined,
    ...names,
    billing: { subtotal, totalCost, discount, serviceCharge, vatTax, netTotal, note, reference },
    showPrevDue,
    showDiscount,
    agentCommission,
    clientPreviousDue,
    netTotal,
    receivedAmount,
    status,
    createdAt: now,
    updatedAt: now,
  }

  const companyIdStr = companyId ? String(companyId) : undefined

  // Helper to resolve lookups, honoring session if provided
  const resolveLookups = async (session?: any) => {
    try {
      const db = mongoose.connection?.db
      if (db) {
        if (Array.isArray(tickets) && tickets.length) {
          tickets = await Promise.all(tickets.map(async (t: any) => {
            if (t.airline && !t.airlineId) {
              const a = await db.collection("airlines").findOne({ name: t.airline }, { session })
              if (a) t.airlineId = String(a._id)
            }
            return t
          }))
        }
        if (Array.isArray(transports) && transports.length) {
          transports = await Promise.all(transports.map(async (tr: any) => {
            if (tr.transportType && !tr.transportTypeId) {
              const tt = await db.collection("transport_types").findOne({ name: tr.transportType }, { session })
              if (tt) tr.transportTypeId = String(tt._id)
            }
            return tr
          }))
        }
      }
    } catch (e) {
      console.warn("createInvoice: lookup resolution failed", e)
    }
  }

  // Idempotent write: if invoice with same invoiceNo exists, update it instead of creating a duplicate
  const performWrite = async (session?: any) => {
    const existing = await Invoice.findOne({ invoiceNo }).lean()
    if (existing) {
      const invoiceId = String(existing._id)
      const oldNet = Number(existing.netTotal || existing.billing?.netTotal || 0)
      const delta = netTotal - oldNet

      // Update header (preserve original createdAt)
      await Invoice.updateOne(
        { _id: existing._id },
        { $set: { ...headerDoc, createdAt: existing.createdAt, updatedAt: now } },
        session ? { session } : undefined
      )

      // Replace child collections with current payload
      if (Array.isArray(billingItems)) {
        if (session) {
          await InvoiceItem.deleteMany({ invoiceId }).session(session)
        } else {
          await InvoiceItem.deleteMany({ invoiceId })
        }
        const docs = billingItems.map((i: any) => ({ ...i, invoiceId, companyId: companyIdStr, createdAt: now, updatedAt: now }))
        if (docs.length) {
          await InvoiceItem.insertMany(docs, session ? { session } : {})
          
          // Update Vendor Balances for Cost Price (Debit/Payable to Vendor)
          for (const item of docs) {
            if (item.vendorId && item.totalCost > 0) {
              const vendor = await Vendor.findById(item.vendorId).session(session)
              if (vendor) {
                let currentNet = 0
                if (vendor.presentBalance && typeof vendor.presentBalance === 'object') {
                  const pType = vendor.presentBalance.type
                  const pAmount = Number(vendor.presentBalance.amount || 0)
                  currentNet = (pType === 'advance' ? pAmount : -pAmount)
                } else {
                  currentNet = Number(vendor.presentBalance || 0)
                }
                
                // Adding invoice cost increases PAYABLE (negative balance in this logic? or positive Due?)
                // Based on createVendorPayment logic:
                // Payment (money out) = adds to balance (reduces due/increases advance)
                // So Invoice Cost (money owed) = subtracts from balance (increases due/reduces advance)
                const newNet = currentNet - Number(item.totalCost)
                const newType = newNet >= 0 ? "advance" : "due"
                const newAmount = Math.abs(newNet)

                await Vendor.findByIdAndUpdate(item.vendorId, { 
                  presentBalance: { type: newType, amount: newAmount } 
                }, { session })
              }
            }
          }
        }
      }
      if (Array.isArray(tickets) && tickets.length) {
        if (session) {
          await InvoiceTicket.deleteMany({ invoiceId }).session(session)
        } else {
          await InvoiceTicket.deleteMany({ invoiceId })
        }
        const docs = tickets.map((t: any) => ({ ...t, invoiceId, companyId: companyIdStr, createdAt: now, updatedAt: now }))
        if (docs.length) await InvoiceTicket.insertMany(docs, session ? { session } : {})
      }
      if (Array.isArray(hotels) && hotels.length) {
        if (session) {
          await InvoiceHotel.deleteMany({ invoiceId }).session(session)
        } else {
          await InvoiceHotel.deleteMany({ invoiceId })
        }
        const docs = hotels.map((h: any) => ({ ...h, invoiceId, companyId: companyIdStr, createdAt: now, updatedAt: now }))
        if (docs.length) await InvoiceHotel.insertMany(docs, session ? { session } : {})
      }
      if (Array.isArray(transports) && transports.length) {
        if (session) {
          await InvoiceTransport.deleteMany({ invoiceId }).session(session)
        } else {
          await InvoiceTransport.deleteMany({ invoiceId })
        }
        const docs = transports.map((tr: any) => ({ ...tr, invoiceId, companyId: companyIdStr, createdAt: now, updatedAt: now }))
        if (docs.length) await InvoiceTransport.insertMany(docs, session ? { session } : {})
      }
      if (Array.isArray(passports) && passports.length) {
        if (session) {
          await InvoicePassport.deleteMany({ invoiceId }).session(session)
        } else {
          await InvoicePassport.deleteMany({ invoiceId })
        }
        const docs = passports.map((p: any, idx: number) => ({
          id: p.id || String(Date.now() + idx),
          invoiceId,
          companyId: companyIdStr,
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
          updatedAt: now,
        }))
        const col = mongoose.connection?.db?.collection("invoice_passports")
        if (!col) throw new AppError("DB not available", 500)
        if (docs.length) await col.insertMany(docs as any[], session ? { session } : undefined)
      }

      // Adjust client present balance by delta (invoice reduces balance)
      await Client.updateOne(
        { _id: clientDoc._id },
        { $set: { presentBalance: presentBalance - delta, updatedAt: now } },
        session ? { session } : undefined
      )

      // Auto allocate advances to this invoice
      const currentReceived = parseNumber(existing.receivedAmount, 0)
      let needed = Math.max(0, netTotal - currentReceived)
      let appliedSoFar = 0
      if (needed > 0) {
        const filter: any = { clientId: clientDoc._id, paymentTo: "advance" }
        if (companyIdStr) {
          filter.$or = [
            { companyId: new Types.ObjectId(companyIdStr) },
            { companyId: companyIdStr },
          ]
        }
        const receipts = await MoneyReceipt.find(filter).sort({ createdAt: 1 }).lean()
        for (const r of receipts) {
          if (needed <= 0) break
          const paid = Math.max(0, parseNumber((r as any).amount, 0) - parseNumber((r as any).discount, 0))
          const existingAllocs = session
            ? await MoneyReceiptAllocation.find({ moneyReceiptId: (r as any)._id }).session(session).lean()
            : await MoneyReceiptAllocation.find({ moneyReceiptId: (r as any)._id }).lean()
          const appliedExisting = (existingAllocs || []).reduce((s, a: any) => s + Math.max(0, parseNumber(a.appliedAmount, 0)), 0)
          const remain = Math.max(0, paid - appliedExisting)
          if (remain <= 0) continue
          const apply = Math.min(needed, remain)
          await new MoneyReceiptAllocation({
            moneyReceiptId: (r as any)._id,
            invoiceId,
            clientId: clientDoc._id,
            companyId: companyIdStr ? new Types.ObjectId(companyIdStr) : undefined,
            voucherNo: String((r as any).voucherNo || ""),
            appliedAmount: apply,
            paymentDate: String((r as any).paymentDate || salesDate),
            createdAt: now,
            updatedAt: now,
          }).save(session ? { session } : undefined)
          const newAllocatedTotal = appliedExisting + apply
          const newRemaining = Math.max(0, paid - newAllocatedTotal)
          await MoneyReceipt.updateOne(
            { _id: (r as any)._id },
            { $set: { allocatedAmount: newAllocatedTotal, remainingAmount: newRemaining, updatedAt: now } },
            session ? { session } : undefined
          )
          appliedSoFar += apply
          const newRecv = currentReceived + appliedSoFar
          const status = newRecv >= netTotal ? "paid" : (newRecv > 0 ? "partial" : "due")
          await Invoice.updateOne({ _id: invoiceId }, { $set: { receivedAmount: newRecv, status, updatedAt: now } }, session ? { session } : undefined)
          // Avoid creating a new ClientTransaction for Advance Allocation
          // Because the original MoneyReceipt already created a ClientTransaction (credit).
          // Allocating it to an invoice is just internal bookkeeping, not a new flow of money from client.
          // IF we create another transaction here, it duplicates the credit in the ledger.
          /*
          await new ClientTransaction({
            date: String((r as any).paymentDate || salesDate),
            voucherNo: String((r as any).voucherNo || ""),
            clientId: clientDoc._id,
            clientName: clientDoc.name || "",
            companyId: companyIdStr ? new Types.ObjectId(companyIdStr) : undefined,
            invoiceType: "INVOICE",
            paymentTypeId: (r as any).accountId,
            accountName: (r as any).accountName,
            payType: (r as any).paymentMethod || undefined,
            amount: apply,
            direction: "receiv",
            note: (r as any).note || undefined,
            createdAt: now,
            updatedAt: now,
          }).save(session ? { session } : undefined)
          */
          needed -= apply
        }
      }

      const response = {
        invoice_id: Number(String(invoiceId).slice(-6)),
        invoice_org_agency: null,
        invoice_no: invoiceNo,
        net_total: String(netTotal.toFixed(2)),
        invoice_client_id: clientDoc.uniqueId || null,
        invoice_combined_id: null,
        comb_client: clientDoc.uniqueId ? `client-${clientDoc.uniqueId}` : null,
        invoice_total_profit: String(billingItems.reduce((s: number, i: any) => s + parseNumber(i.profit), 0).toFixed(2)),
        invoice_total_vendor_price: String(billingItems.reduce((s: number, i: any) => s + parseNumber(i.costPrice) * parseNumber(i.quantity), 0).toFixed(2)),
        invoice_sales_date: salesDate,
        invoice_date: salesDate,
        invoice_due_date: dueDate || null,
        invoice_is_refund: 0,
        client_name: names.clientName || "",
        mobile: names.clientPhone || null,
        invclientpayment_amount: String((parseNumber(existing.receivedAmount, 0) + appliedSoFar).toFixed(2)),
        money_receipt_num: "",
        passport_no: null,
        passport_name: null,
        sales_by: names.salesByName || "",
      }

      return { ok: true, id: invoiceId, created: response }
    }

    // No existing doc: proceed with new insert
    await resolveLookups(session)
    const result = await Invoice.create(headerDoc, session ? { session } : undefined)
    const invoiceId = String((result as any)._id)

    if (billingItems.length) {
      const docs = billingItems.map((i: any) => ({ ...i, invoiceId, companyId: companyIdStr, createdAt: now, updatedAt: now }))
      await InvoiceItem.insertMany(docs, session ? { session } : {})

      // Update Vendor Balances for Cost Price (Debit/Payable to Vendor)
      for (const item of docs) {
        if (item.vendorId && item.totalCost > 0) {
          const vendorQuery = Vendor.findById(item.vendorId)
          if (session) vendorQuery.session(session)
          const vendor = await vendorQuery
          
          if (vendor) {
            let currentNet = 0
            if (vendor.presentBalance && typeof vendor.presentBalance === 'object') {
              const pType = vendor.presentBalance.type
              const pAmount = Number(vendor.presentBalance.amount || 0)
              currentNet = (pType === 'advance' ? pAmount : -pAmount)
            } else {
              currentNet = Number(vendor.presentBalance || 0)
            }
            
            // Adding invoice cost increases PAYABLE (Due).
            // Logic: Payment (Credit) adds to balance (reduces Due).
            // Cost (Debit) subtracts from balance (increases Due).
            const newNet = currentNet - Number(item.totalCost)
            const newType = newNet >= 0 ? "advance" : "due"
            const newAmount = Math.abs(newNet)

            await Vendor.findByIdAndUpdate(item.vendorId, { 
              presentBalance: { type: newType, amount: newAmount } 
            }, session ? { session } : undefined)
          }
        }
      }
    }
    if (Array.isArray(tickets) && tickets.length) {
      await InvoiceTicket.insertMany(
        tickets.map((t: any) => ({ ...t, invoiceId, companyId: companyIdStr, createdAt: now, updatedAt: now })),
       session ? { session } : {}
      )
    }
    if (Array.isArray(hotels) && hotels.length) {
      await InvoiceHotel.insertMany(
        hotels.map((h: any) => ({ ...h, invoiceId, companyId: companyIdStr, createdAt: now, updatedAt: now })),
        session ? { session } : {}
      )
    }
    if (Array.isArray(transports) && transports.length) {
      await InvoiceTransport.insertMany(
        transports.map((tr: any) => ({ ...tr, invoiceId, companyId: companyIdStr, createdAt: now, updatedAt: now })),
         session ? { session } : {}
      )
    }
    if (Array.isArray(passports) && passports.length) {
      const docs = passports.map((p: any, idx: number) => ({
        id: p.id || String(Date.now() + idx),
        invoiceId,
        companyId: companyIdStr,
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
        updatedAt: now,
      }))
      const col = mongoose.connection?.db?.collection("invoice_passports")
      if (!col) throw new AppError("DB not available", 500)
      await col.insertMany(docs as any[], session ? { session } : undefined)
    }

    await Client.updateOne(
      { _id: clientDoc._id },
      { $set: { presentBalance: presentBalance - netTotal, updatedAt: now } },
      session ? { session } : undefined
    )

    // Auto allocate advances to this new invoice
    let needed = Math.max(0, netTotal)
    let receivedSoFar = 0
    if (needed > 0) {
      const filter: any = { clientId: clientDoc._id, paymentTo: "advance" }
      if (companyIdStr) {
        filter.$or = [
          { companyId: new Types.ObjectId(companyIdStr) },
          { companyId: companyIdStr },
        ]
      }
      const receipts = await MoneyReceipt.find(filter).sort({ createdAt: 1 }).lean()
      for (const r of receipts) {
        if (needed <= 0) break
        const paid = Math.max(0, parseNumber((r as any).amount, 0) - parseNumber((r as any).discount, 0))
        const existingAllocs = await MoneyReceiptAllocation.find({ moneyReceiptId: (r as any)._id }).lean()
        const appliedExisting = (existingAllocs || []).reduce((s, a: any) => s + Math.max(0, parseNumber(a.appliedAmount, 0)), 0)
        const remain = Math.max(0, paid - appliedExisting)
        if (remain <= 0) continue
        const apply = Math.min(needed, remain)
        await new MoneyReceiptAllocation({
          moneyReceiptId: (r as any)._id,
          invoiceId,
          clientId: clientDoc._id,
          companyId: companyIdStr ? new Types.ObjectId(companyIdStr) : undefined,
          voucherNo: String((r as any).voucherNo || ""),
          appliedAmount: apply,
          paymentDate: String((r as any).paymentDate || salesDate),
          createdAt: now,
          updatedAt: now,
        }).save(session ? { session } : undefined)
        const newAllocatedTotal = appliedExisting + apply
        const newRemaining = Math.max(0, paid - newAllocatedTotal)
        await MoneyReceipt.updateOne(
          { _id: (r as any)._id },
          { $set: { allocatedAmount: newAllocatedTotal, remainingAmount: newRemaining, updatedAt: now } },
          session ? { session } : undefined
        )
        receivedSoFar += apply
        const status = receivedSoFar >= netTotal ? "paid" : (receivedSoFar > 0 ? "partial" : "due")
        await Invoice.updateOne({ _id: invoiceId }, { $set: { receivedAmount: receivedSoFar, status, updatedAt: now } }, session ? { session } : undefined)
          await new ClientTransaction({
            date: String((r as any).paymentDate || salesDate),
            voucherNo: String((r as any).voucherNo || ""),
            clientId: clientDoc._id,
            clientName: clientDoc.name || "",
            companyId: companyIdStr ? new Types.ObjectId(companyIdStr) : undefined,
            invoiceType: "INVOICE",
            paymentTypeId: (r as any).accountId,
            accountName: (r as any).accountName,
            payType: (r as any).paymentMethod || undefined,
            amount: apply,
            direction: "receiv",
            note: (r as any).note || undefined,
            createdAt: now,
            updatedAt: now,
          }).save(session ? { session } : undefined)
        needed -= apply
      }
    }

    // Money Receipt logic
    let moneyReceiptNo = ""
    const moneyReceipt = body.moneyReceipt
    if (moneyReceipt?.paymentMethod && moneyReceipt?.amount > 0) {
      const { createMoneyReceipt } = await import("./moneyReceiptService")
      const mrPayload = {
        clientId: clientDoc._id,
        invoiceId: invoiceId,
        paymentTo: "invoice",
        amount: moneyReceipt.amount,
        discount: moneyReceipt.discount || 0,
        paymentDate: moneyReceipt.paymentDate || salesDate,
        paymentMethod: moneyReceipt.paymentMethod,
        accountId: moneyReceipt.accountId,
        note: moneyReceipt.note,
        manualReceiptNo: moneyReceipt.receiptNo
      }
      const mrResult = await createMoneyReceipt(mrPayload, companyIdStr)
      if (mrResult.ok) {
        moneyReceiptNo = mrResult.created.receipt_vouchar_no
        // Re-fetch received so far to include the new receipt
        const updatedInv = await Invoice.findById(invoiceId).lean()
        if (updatedInv) receivedSoFar = parseNumber(updatedInv.receivedAmount, 0)
      }
    }

    const response = {
      invoice_id: Number(String(invoiceId).slice(-6)),
      invoice_org_agency: null,
      invoice_no: invoiceNo,
      net_total: String(netTotal.toFixed(2)),
      invoice_client_id: clientDoc.uniqueId || null,
      invoice_combined_id: null,
      comb_client: clientDoc.uniqueId ? `client-${clientDoc.uniqueId}` : null,
      invoice_total_profit: String(billingItems.reduce((s: number, i: any) => s + parseNumber(i.profit), 0).toFixed(2)),
      invoice_total_vendor_price: String(billingItems.reduce((s: number, i: any) => s + parseNumber(i.costPrice) * parseNumber(i.quantity), 0).toFixed(2)),
      invoice_sales_date: salesDate,
      invoice_date: salesDate,
      invoice_due_date: dueDate || null,
      invoice_is_refund: 0,
      client_name: names.clientName || "",
      mobile: names.clientPhone || null,
      invclientpayment_amount: String((receivedSoFar || 0).toFixed(2)),
      money_receipt_num: moneyReceiptNo,
      passport_no: null,
      passport_name: null,
      sales_by: names.salesByName || "",
    }

    return { ok: true, id: invoiceId, created: response }
  }

  // Perform write once without transaction to avoid duplicate creations on non-replica setups
  return await performWrite(undefined)
}
