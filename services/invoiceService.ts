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
    InvoiceItem.find({ invoiceId: invIdStr }).lean(),
    InvoiceTicket.find({ invoiceId: invIdStr }).lean(),
    InvoiceHotel.find({ invoiceId: invIdStr }).lean(),
    InvoiceTransport.find({ invoiceId: invIdStr }).lean(),
    InvoicePassport.find({ invoiceId: invIdStr }).lean(),
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
        if (docs.length) await InvoiceItem.insertMany(docs, { session })
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
        const docs = childItems.billingItems.map((i: any, idx: number) => ({
          ...stripId(i),
          vendorId: i.vendorId || i.vendor || i.billing_comvendor || "",
          invoiceId,
          companyId: companyIdStr,
          id: i.id || String(Date.now() + idx),
          updatedAt: now,
        }))
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
      const net = Number(inv.netTotal || inv.billing?.netTotal || 0)

      await Invoice.deleteOne({ _id: inv._id }, { session })
      await Promise.all([
        InvoiceItem.deleteMany({ invoiceId }).session(session),
        InvoiceTicket.deleteMany({ invoiceId }).session(session),
        InvoiceHotel.deleteMany({ invoiceId }).session(session),
        InvoiceTransport.deleteMany({ invoiceId }).session(session),
        InvoicePassport.deleteMany({ invoiceId }).session(session),
      ])

      if (net && inv.clientId && Types.ObjectId.isValid(String(inv.clientId))) {
        await Client.updateOne({ _id: inv.clientId }, { $inc: { presentBalance: net }, $set: { updatedAt: new Date().toISOString() } }, { session })
      }

      resultOk = true
    })
    if (resultOk) return { ok: true }
    return { ok: false }
  } catch (err) {
    // Fallback if transactions are unsupported
    const inv = await Invoice.findById(id)
    if (!inv) throw new AppError("Not found", 404)
    if (companyId && String(inv.companyId || "") !== String(companyId)) throw new AppError("Not found", 404)

    const invoiceId = String(inv._id)
    const net = Number(inv.netTotal || inv.billing?.netTotal || 0)

    await Invoice.deleteOne({ _id: inv._id })
    await Promise.all([
      InvoiceItem.deleteMany({ invoiceId }),
      InvoiceTicket.deleteMany({ invoiceId }),
      InvoiceHotel.deleteMany({ invoiceId }),
      InvoiceTransport.deleteMany({ invoiceId }),
      InvoicePassport.deleteMany({ invoiceId }),
    ])
    if (net && inv.clientId && Types.ObjectId.isValid(String(inv.clientId))) {
      await Client.updateOne({ _id: inv.clientId }, { $inc: { presentBalance: net }, $set: { updatedAt: new Date().toISOString() } })
    }
    return { ok: true }
  } finally {
    session.endSession()
  }
}

function parseNumber(n: any, def = 0): number { const x = Number(n); return isFinite(x) ? x : def }

export async function listInvoices(params: { page?: number; pageSize?: number; search?: string; status?: string; dateFrom?: string; dateTo?: string; clientId?: string }) {
  await connectMongoose()
  const { page = 1, pageSize = 20, search = "", status = "", dateFrom, dateTo, clientId } = params || {}
  const filter: any = {}
  if (search) {
    filter.$or = [
      { invoiceNo: { $regex: search, $options: "i" } },
      { clientName: { $regex: search, $options: "i" } },
      { passportNo: { $regex: search, $options: "i" } },
      { salesByName: { $regex: search, $options: "i" } },
    ]
  }
  if (status) filter.status = status
  if (dateFrom || dateTo) {
    filter.salesDate = {}
    if (dateFrom) (filter.salesDate as any).$gte = dateFrom
    if (dateTo) (filter.salesDate as any).$lte = dateTo
  }
  if (clientId && Types.ObjectId.isValid(clientId)) {
    filter.clientId = new Types.ObjectId(clientId)
  }

  const total = await Invoice.countDocuments(filter)
  const docs = await Invoice.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean()
  // Populate passport numbers for table view
  const invoiceIds = docs.map((d: any) => String(d._id))
  const passportDocs = await InvoicePassport.find({ invoiceId: { $in: invoiceIds } }).lean()
  const passMap = new Map<string, string>()
  for (const p of passportDocs) {
    const invId = String((p as any).invoiceId)
    if (!passMap.has(invId)) passMap.set(invId, (p as any).passportNo || "")
  }
  // Collect money receipt voucher numbers per invoice (from receipts and client transactions)
  const receiptDocs = await MoneyReceipt.find({ invoiceId: { $in: invoiceIds } }).lean()
  const txnDocs = await ClientTransaction.find({ relatedInvoiceId: { $in: invoiceIds }, direction: "receive" }).lean()
  const mrSetMap = new Map<string, Set<string>>()
  for (const r of receiptDocs) {
    const invId = String((r as any).invoiceId)
    const voucher = String((r as any).voucherNo || "")
    if (!voucher) continue
    const s = mrSetMap.get(invId) || new Set<string>()
    s.add(voucher)
    mrSetMap.set(invId, s)
  }
  for (const t of txnDocs) {
    const invId = String((t as any).relatedInvoiceId || "")
    const voucher = String((t as any).voucherNo || "")
    if (!invId || !voucher) continue
    const s = mrSetMap.get(invId) || new Set<string>()
    s.add(voucher)
    mrSetMap.set(invId, s)
  }

  const items = docs.map((d: any) => ({
    id: String(d._id),
    clientId: String(d.clientId || ""),
    invoiceNo: d.invoiceNo,
    clientName: d.clientName || "",
    clientPhone: d.clientPhone || "",
    salesDate: d.salesDate,
    dueDate: d.dueDate || "",
    salesPrice: parseNumber(d.netTotal, 0),
    receivedAmount: parseNumber(d.receivedAmount, 0),
    dueAmount: Math.max(0, parseNumber(d.netTotal, 0) - parseNumber(d.receivedAmount, 0)),
    mrNo: Array.from(mrSetMap.get(String(d._id)) || new Set<string>()).join(", ") || d.mrNo || "",
    passportNo: passMap.get(String(d._id)) || d.passportNo || "",
    salesBy: d.salesByName || "",
    agent: d.agentName || "",
    status: d.status || "due",
    createdAt: d.createdAt || new Date().toISOString(),
    updatedAt: d.updatedAt || new Date().toISOString(),
  }))
  return { items, pagination: { page, pageSize, total } }
}

export async function createInvoice(body: any, companyId?: string) {
  await connectMongoose()
  const general = body.general || body
  const billing = body.billing || { items: body.billing_information || [] }
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
  const billingItems = (Array.isArray(billing.items) ? billing.items : []).map((i: any) => ({
    product: i.product || i.billing_product_id || "",
    paxName: i.paxName || i.pax_name || "",
    description: i.description || i.billing_description || "",
    quantity: parseNumber(i.quantity ?? i.billing_quantity ?? 1),
    unitPrice: parseNumber(i.unitPrice ?? i.billing_unit_price ?? 0),
    costPrice: parseNumber(i.costPrice ?? i.billing_cost_price ?? 0),
    totalSales: parseNumber(i.totalSales ?? i.billing_total_sales ?? i.billing_subtotal ?? 0),
    totalCost: parseNumber(i.totalCost ?? 0),
    profit: parseNumber(i.profit ?? i.billing_profit ?? 0),
    vendorId: i.vendor || i.billing_comvendor || "",
  }))

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
    billing: { subtotal, discount, serviceCharge, vatTax, netTotal, note, reference },
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
        if (docs.length) await InvoiceItem.insertMany(docs, session ? { session } : {})
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
        invclientpayment_amount: String(receivedAmount.toFixed(2)),
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
      await InvoiceItem.insertMany(
        billingItems.map((i: any) => ({ ...i, invoiceId, companyId: companyIdStr, createdAt: now, updatedAt: now })),
         session ? { session } : {}
      )
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
      invclientpayment_amount: String(receivedAmount.toFixed(2)),
      money_receipt_num: "",
      passport_no: null,
      passport_name: null,
      sales_by: names.salesByName || "",
    }

    return { ok: true, id: invoiceId, created: response }
  }

  // Perform write once without transaction to avoid duplicate creations on non-replica setups
  return await performWrite(undefined)
}
