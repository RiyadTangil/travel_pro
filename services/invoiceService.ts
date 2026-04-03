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
  
  // Fetch client details for prefill
  let clients: any[] = []
  if (inv.clientId && Types.ObjectId.isValid(String(inv.clientId))) {
    const c = await Client.findById(inv.clientId).lean()
    if (c) {
      clients = [{ id: String(c._id), name: c.name || "", phone: c.phone || "", email: c.email || "" }]
    }
  }

  // Fetch agent details for prefill
  let agents: any[] = []
  if (inv.agentId && Types.ObjectId.isValid(String(inv.agentId))) {
    const db = mongoose.connection?.db
    if (db) {
      const a = await db.collection("agents").findOne({ _id: new Types.ObjectId(String(inv.agentId)) })
      if (a) {
        agents = [{ id: String(a._id), name: a.name || "", email: a.email || "", mobile: a.mobile || a.phone || "" }]
      }
    }
  }

  return {
    invoice: { ...inv, id: invIdStr, billing: billingWithItems, tickets: mapTickets, hotels: mapHotels, transports: mapTransports, passports },
    vendors,
    employees,
    clients,
    agents
  }
}



function parseNumber(n: any, def = 0): number { const x = Number(n); return isFinite(x) ? x : def }

export async function listInvoices(params: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  invoiceType?: string
  dateFrom?: string
  dateTo?: string
  clientId?: string
  companyId?: string
}) {
  await connectMongoose()
  console.log("Params:", params)
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
    // Actually, usually the general list shows standard
    filter.invoiceType = { $in:'standard' }
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

  const total = await Invoice.countDocuments(filter)
  const docs = await Invoice.find(filter)
    .sort({ salesDate: -1, createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean()

  // Fetch all passports for these invoices
  const invIds = docs.map((d: any) => String(d._id))
  const allPassports = await InvoicePassport.find({ invoiceId: { $in: invIds }, isDeleted: { $ne: true } }).lean()

  const invoices = docs.map((d: any) => {
    // Handle Visa fields for list display if available
    const billingItems = d.billing?.items || []
    const visaItem = d.invoiceType === "visa" ? billingItems[0] : null

    // Get passports for this invoice
    const invIdStr = String(d._id)
    const invPassports = allPassports.filter((p: any) => String(p.invoiceId) === invIdStr)
    const passportNos = invPassports.map((p: any) => p.passportNo).filter(Boolean).join(", ")

    return {
      id: invIdStr,
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
      mrNo: "", // We can populate this if needed
      passportNo: passportNos, 
      salesBy: d.salesByName || "",
      status: d.status || "due",
      invoiceType: d.invoiceType || "standard",
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: d.updatedAt || new Date().toISOString(),
      // Add Visa fields if it's a visa invoice
      ...(visaItem ? {
        country: visaItem.country,
        visaType: visaItem.visaType,
        visaNo: visaItem.visaNo
      } : {})
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

export async function listNonCommissionInvoices(params: {
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

  const filter: any = { isDeleted: { $ne: true }, invoiceType: "non_commission" }
  if (params.companyId) filter.companyId = new Types.ObjectId(params.companyId)
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
  const invIds = docs.map((d: any) => String(d._id))
  const allTickets = await InvoiceTicket.find({ invoiceId: { $in: invIds }, isDeleted: { $ne: true } }).lean()

  const invoices = docs.map((d: any) => {
    const invIdStr = String(d._id)
    const invTickets = allTickets.filter((t: any) => String(t.invoiceId) === invIdStr)
    const issueDates = Array.from(new Set(invTickets.map((t: any) => t.issueDate || t.createdAt))).filter(Boolean)

    return {
      id: invIdStr,
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
      mrNo: "", // We can populate this if needed
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
          companyId: companyIdStr,
          createdAt: now,
          updatedAt: now
        }], { session })
        const ticketId = String(ticketResult[0]._id)

        // b. Create InvoiceItem (Financial Row) - Linked to Ticket
        await InvoiceItem.create([{
          invoiceId,
          ticketId,
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
            companyId: companyIdStr,
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
    // 1. Find matching ticket for this item using ticketId (preferred) or paxName/description (fallback)
    // IMPORTANT: MongoDB .lean() returns _id as an ObjectId, so we use .toString() to compare.
    const ticket = tickets.find((t: any) => 
      (ii.ticketId && String(t._id) === String(ii.ticketId)) || 
      (!ii.ticketId && (t.ticketNo === ii.paxName || t.route === ii.description.split('|')[1]?.split(':')[1]?.trim()))
    ) || tickets[0]
    
    const ticketIdStr = ticket ? String(ticket._id) : null

    // 2. Filter paxEntries and flightEntries that belong ONLY to this ticket using ticketId
    const itemPaxEntries = passports
      .filter((p: any) => 
        (ticketIdStr && String(p.ticketId) === ticketIdStr) || 
        (!p.ticketId && String(p.invoiceId) === invIdStr)
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
        (!tr.ticketId && String(tr.invoiceId) === invIdStr)
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
      id: ii.ticketId || ii.id || String(ii._id),
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

      await Invoice.findByIdAndUpdate(id, { $set: headerUpdates }, { session })

      // 3. Create Child Records (Same as create logic)
      for (const item of invoiceItems) {
        const { ticketDetails, paxEntries, flightEntries } = item

        // a. Create InvoiceTicket (Main Reference)
        const ticketResult = await InvoiceTicket.create([{
          invoiceId: invIdStr,
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
          companyId: companyIdStr,
          createdAt: now,
          updatedAt: now
        }], { session })
        const ticketId = String(ticketResult[0]._id)

        // b. Create InvoiceItem (Financial Row) - Linked to Ticket
        await InvoiceItem.create([{
          invoiceId: invIdStr,
          ticketId,
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

        // c. Create InvoicePassports - Linked to Ticket
        if (paxEntries.length > 0) {
          await InvoicePassport.insertMany(paxEntries.map((p: any) => ({
            invoiceId: invIdStr,
            ticketId,
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

        // d. Create InvoiceTransports - Linked to Ticket
        if (flightEntries.length > 0) {
          await InvoiceTransport.insertMany(flightEntries.map((f: any) => ({
            invoiceId: invIdStr,
            ticketId,
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
  const billingItemsRaw = Array.isArray(billing.items) ? billing.items : (Array.isArray(billing) ? billing : [])
  const now = new Date().toISOString()
  const companyIdStr = companyId ? String(companyId) : undefined

  // 1. Validation
  if (!general.clientId) throw new AppError("Client is required", 400)
  if (!general.employeeId) throw new AppError("Sales person is required", 400)
  if (!general.salesDate) throw new AppError("Sales date is required", 400)
  if (billingItemsRaw.length === 0) throw new AppError("At least one billing item is required", 400)

  // 2. Resolve Client & Check Credit Limit
  const clientIdRaw = String(general.clientId || "").trim()
  let clientDoc: any = null
  if (Types.ObjectId.isValid(clientIdRaw)) {
    clientDoc = await Client.findById(clientIdRaw).lean()
  } else if (clientIdRaw.startsWith("client-")) {
    const uniqueId = Number(clientIdRaw.replace("client-", ""))
    clientDoc = await Client.findOne({ uniqueId }).lean()
  }
  if (!clientDoc) throw new AppError("Client not found", 404)

  const subtotal = parseNumber(billing.subtotal ?? body.invoice_sub_total ?? billingItemsRaw.reduce((s: number, i: any) => s + parseNumber(i.billing_subtotal ?? i.totalSales ?? 0), 0))
  const totalCost = parseNumber(billing.totalCost ?? billingItemsRaw.reduce((s: number, i: any) => s + parseNumber(i.totalCost ?? 0), 0))
  const discount = parseNumber(billing.discount ?? body.billing_discount ?? body.discount ?? 0)
  const serviceCharge = parseNumber(billing.serviceCharge ?? body.service_charge ?? 0)
  const vatTax = parseNumber(billing.vatTax ?? body.vat_tax ?? 0)
  const netTotal = parseNumber(body.invoice_net_total ?? (billing.netTotal ?? (subtotal - discount + serviceCharge + vatTax)))
  
  const creditLimit = parseNumber(clientDoc.creditLimit || 0)
  const presentBalance = parseNumber(clientDoc.presentBalance || 0)
  if (creditLimit > 0 && presentBalance + netTotal > creditLimit) {
    throw new AppError("Credit limit exceeded", 400, "credit_limit_exceeded")
  }

  // 3. Denormalize Names (Client, Employee, Agent)
  const names: any = { clientName: clientDoc.name || "", clientPhone: clientDoc.phone || "" }
  const employeeId = Types.ObjectId.isValid(general.employeeId) ? new Types.ObjectId(general.employeeId) : undefined
  if (employeeId) {
    const e = await Employee.findById(employeeId).lean()
    if (e) names.salesByName = e.name || (e as any).fullName || ""
  }
  const agentId = Types.ObjectId.isValid(general.agentId) ? new Types.ObjectId(general.agentId) : undefined

  // 4. Normalize Billing Items
  const billingItems = billingItemsRaw.map((i: any) => {
    const vId = i.vendor || i.billing_comvendor || i.vendorId
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
      country: i.country,
      visaType: i.visaType,
      visaDuration: i.visaDuration,
      token: i.token,
      delivery: i.delivery,
      visaNo: i.visaNo,
      mofaNo: i.mofaNo,
      okalaNo: i.okalaNo,
    }
  })

  // 5. Header Document
  const headerDoc: any = {
    invoiceNo: String(general.invoiceNo || "").trim(),
    salesDate: String(general.salesDate || now),
    dueDate: general.dueDate || "",
    clientId: new Types.ObjectId(clientDoc._id),
    employeeId,
    agentId,
    companyId: companyId ? new Types.ObjectId(companyId) : undefined,
    ...names,
    invoiceType: body.invoiceType || "standard",
    billing: { subtotal, totalCost, discount, serviceCharge, vatTax, netTotal, note: String(billing.note || body.billing_note || ''), reference: String(billing.reference || body.billing_reference || '') },
    showPrevDue: !!(general.invoice_show_prev_due || body.showPrevDue),
    showDiscount: !!(general.invoice_show_discount || body.showDiscount),
    agentCommission: parseNumber(body.invoice_agent_com_amount ?? 0),
    clientPreviousDue: parseNumber(body.invoice_client_previous_due ?? 0),
    netTotal,
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
      const invoiceId = String(result[0]._id)
      createdId = invoiceId

      // b. Create Child Records
      const tickets = body.ticket || body.ticketInfo || []
      const hotels = body.hotel || body.hotel_information || []
      const transports = body.transport || body.transport_information || []
      const passports = body.passport || body.passport_information || []

      if (billingItems.length) {
        await InvoiceItem.insertMany(billingItems.map(i => ({ ...i, invoiceId, companyId: companyIdStr, createdAt: now, updatedAt: now })), { session })
        for (const item of billingItems) {
          if (item.vendorId && item.totalCost > 0) {
            await Vendor.updateOne(
              { _id: item.vendorId },
              { $inc: { "presentBalance.amount": item.totalCost }, $set: { "presentBalance.type": "due", updatedAt: now } },
              { session }
            )
          }
        }
      }

      if (tickets.length) await InvoiceTicket.insertMany(tickets.map((t: any) => ({ ...t, invoiceId, companyId: companyIdStr, createdAt: now, updatedAt: now })), { session })
      if (hotels.length) await InvoiceHotel.insertMany(hotels.map((h: any) => ({ ...h, invoiceId, companyId: companyIdStr, createdAt: now, updatedAt: now })), { session })
      if (transports.length) await InvoiceTransport.insertMany(transports.map((tr: any) => ({ ...tr, invoiceId, companyId: companyIdStr, createdAt: now, updatedAt: now })), { session })
      if (passports.length) {
        const col = mongoose.connection?.db?.collection("invoice_passports")
        if (col) await col.insertMany(passports.map((p: any, idx: number) => ({
          id: p.id || String(Date.now() + idx), invoiceId, companyId: companyIdStr,
          passportNo: p.passportNo || p.passport_no || "", name: p.name || "", email: p.email || "",
          dateOfIssue: p.dateOfIssue || p.date_of_issue || "", dateOfExpire: p.dateOfExpire || p.date_of_expire || "",
          paxType: p.paxType || p.pax_type || "", contactNo: p.contactNo || p.mobile || "",
          dateOfBirth: p.dateOfBirth || p.dob || "", passportId: p.passportId || p.passport_id || "",
          createdAt: now, updatedAt: now
        })), { session })
      }

      // c. Update Client Balance
      await Client.updateOne({ _id: clientDoc._id }, { $inc: { presentBalance: -netTotal }, $set: { updatedAt: now } }, { session })

      // d. Money Receipt Logic
      let moneyReceiptNo = ""
      let receivedSoFar = 0
      const moneyReceipt = body.moneyReceipt
      if (moneyReceipt?.paymentMethod && moneyReceipt?.amount > 0) {
        const { createMoneyReceipt } = await import("./moneyReceiptService")
        const mrResult = await createMoneyReceipt({
          clientId: clientDoc._id, invoiceId, paymentTo: "invoice",
          amount: moneyReceipt.amount, discount: moneyReceipt.discount || 0,
          paymentDate: moneyReceipt.paymentDate || general.salesDate || now,
          paymentMethod: moneyReceipt.paymentMethod, accountId: moneyReceipt.accountId,
          note: moneyReceipt.note, manualReceiptNo: moneyReceipt.receiptNo
        }, companyIdStr)
        if (mrResult.ok) {
          moneyReceiptNo = mrResult.created.receipt_vouchar_no
          receivedSoFar = parseNumber(moneyReceipt.amount, 0)
        }
      }

      response = {
        invoice_id: Number(String(invoiceId).slice(-6)), invoice_no: headerDoc.invoiceNo, net_total: String(netTotal.toFixed(2)),
        invoice_client_id: clientDoc.uniqueId || null, client_name: names.clientName || "", mobile: names.clientPhone || null,
        invclientpayment_amount: String(receivedSoFar.toFixed(2)), money_receipt_num: moneyReceiptNo, sales_by: names.salesByName || "",
        invoice_total_profit: String(billingItems.reduce((s: number, i: any) => s + i.profit, 0).toFixed(2)),
        invoice_total_vendor_price: String(billingItems.reduce((s: number, i: any) => s + i.totalCost, 0).toFixed(2)),
        invoice_sales_date: headerDoc.salesDate, invoice_date: headerDoc.salesDate, invoice_due_date: headerDoc.dueDate || null,
      }
    })
    return { ok: true, id: createdId, created: response }
  } catch (err: any) {
    console.error("createInvoice error:", err)
    throw err
  } finally {
    session.endSession()
  }
}

export async function updateInvoiceById(id: string, body: any, companyId?: string) {
  await connectMongoose()
  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid ID", 400)
  const inv = await Invoice.findById(id)
  if (!inv) throw new AppError("Not found", 404)
  if (companyId && String(inv.companyId || "") !== String(companyId)) throw new AppError("Unauthorized", 401)

  const general = body.general || body
  const billing = body.billing || { items: body.billing_information || [] }
  const billingItemsRaw = Array.isArray(billing.items) ? billing.items : (Array.isArray(billing) ? billing : [])
  const now = new Date().toISOString()
  const companyIdStr = companyId ? String(companyId) : undefined

  // 1. Compute Deltas & Prepare Header Updates
  const subtotal = parseNumber(billing.subtotal ?? body.invoice_sub_total ?? billingItemsRaw.reduce((s: number, i: any) => s + parseNumber(i.billing_subtotal ?? i.totalSales ?? 0), 0))
  const totalCost = parseNumber(billing.totalCost ?? billingItemsRaw.reduce((s: number, i: any) => s + parseNumber(i.totalCost ?? 0), 0))
  const discount = parseNumber(billing.discount ?? body.billing_discount ?? body.discount ?? 0)
  const serviceCharge = parseNumber(billing.serviceCharge ?? body.service_charge ?? 0)
  const vatTax = parseNumber(billing.vatTax ?? body.vat_tax ?? 0)
  const netTotal = parseNumber(body.invoice_net_total ?? (billing.netTotal ?? (subtotal - discount + serviceCharge + vatTax)))
  
  const oldNet = parseNumber(inv.netTotal || inv.billing?.netTotal, 0)
  const clientDelta = netTotal - oldNet

  const names: any = { clientName: inv.clientName, clientPhone: inv.clientPhone }
  const employeeId = Types.ObjectId.isValid(general.employeeId) ? new Types.ObjectId(general.employeeId) : inv.employeeId
  if (employeeId && String(employeeId) !== String(inv.employeeId)) {
    const e = await Employee.findById(employeeId).lean()
    if (e) names.salesByName = e.name || (e as any).fullName || ""
  }

  const headerUpdates: any = {
    invoiceNo: String(general.invoiceNo || inv.invoiceNo).trim(),
    salesDate: String(general.salesDate || inv.salesDate),
    dueDate: general.dueDate || inv.dueDate || "",
    employeeId,
    agentId: Types.ObjectId.isValid(general.agentId) ? new Types.ObjectId(general.agentId) : inv.agentId,
    ...names,
    invoiceType: body.invoiceType || inv.invoiceType || "standard",
    billing: { subtotal, totalCost, discount, serviceCharge, vatTax, netTotal, note: String(billing.note || body.billing_note || ''), reference: String(billing.reference || body.billing_reference || '') },
    showPrevDue: !!(general.invoice_show_prev_due || body.showPrevDue),
    showDiscount: !!(general.invoice_show_discount || body.showDiscount),
    agentCommission: parseNumber(body.invoice_agent_com_amount ?? inv.agentCommission ?? 0),
    clientPreviousDue: parseNumber(body.invoice_client_previous_due ?? inv.clientPreviousDue ?? 0),
    netTotal,
    updatedAt: now,
  }

  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      // 2. Revert Old Vendor Balances
      const oldItems = await InvoiceItem.find({ invoiceId: id }).session(session)
      for (const item of oldItems) {
        if (item.vendorId && item.totalCost > 0) {
          await Vendor.updateOne(
            { _id: item.vendorId },
            { $inc: { "presentBalance.amount": -item.totalCost }, $set: { updatedAt: now } },
            { session }
          )
        }
      }

      // 3. Update Header & Replace Children
      await Invoice.updateOne({ _id: id }, { $set: headerUpdates }, { session })
      await Promise.all([
        InvoiceItem.deleteMany({ invoiceId: id }).session(session),
        InvoiceTicket.deleteMany({ invoiceId: id }).session(session),
        InvoiceHotel.deleteMany({ invoiceId: id }).session(session),
        InvoiceTransport.deleteMany({ invoiceId: id }).session(session),
        InvoicePassport.deleteMany({ invoiceId: id }).session(session),
      ])

      const billingItems = billingItemsRaw.map((i: any) => {
        const vId = i.vendor || i.billing_comvendor || i.vendorId
        return {
          ...i, invoiceId: id, companyId: companyIdStr, updatedAt: now,
          vendorId: (vId && Types.ObjectId.isValid(vId)) ? new Types.ObjectId(vId) : null,
          totalSales: parseNumber(i.totalSales ?? i.billing_total_sales ?? i.billing_subtotal ?? 0),
          totalCost: parseNumber(i.totalCost ?? 0),
          profit: parseNumber(i.profit ?? i.billing_profit ?? 0),
        }
      })

      if (billingItems.length) {
        await InvoiceItem.insertMany(billingItems, { session })
        for (const item of billingItems) {
          if (item.vendorId && item.totalCost > 0) {
            await Vendor.updateOne(
              { _id: item.vendorId },
              { $inc: { "presentBalance.amount": item.totalCost }, $set: { "presentBalance.type": "due", updatedAt: now } },
              { session }
            )
          }
        }
      }

      const tickets = body.ticket || body.ticketInfo || []
      const hotels = body.hotel || body.hotel_information || []
      const transports = body.transport || body.transport_information || []
      const passports = body.passport || body.passport_information || []

      if (tickets.length) await InvoiceTicket.insertMany(tickets.map((t: any) => ({ ...t, invoiceId: id, companyId: companyIdStr, createdAt: now, updatedAt: now })), { session })
      if (hotels.length) await InvoiceHotel.insertMany(hotels.map((h: any) => ({ ...h, invoiceId: id, companyId: companyIdStr, createdAt: now, updatedAt: now })), { session })
      if (transports.length) await InvoiceTransport.insertMany(transports.map((tr: any) => ({ ...tr, invoiceId: id, companyId: companyIdStr, createdAt: now, updatedAt: now })), { session })
      if (passports.length) {
        const col = mongoose.connection?.db?.collection("invoice_passports")
        if (col) await col.insertMany(passports.map((p: any, idx: number) => ({
          id: p.id || String(Date.now() + idx), invoiceId: id, companyId: companyIdStr,
          passportNo: p.passportNo || p.passport_no || "", name: p.name || "", email: p.email || "",
          dateOfIssue: p.dateOfIssue || p.date_of_issue || "", dateOfExpire: p.dateOfExpire || p.date_of_expire || "",
          paxType: p.paxType || p.pax_type || "", contactNo: p.contactNo || p.mobile || "",
          dateOfBirth: p.dateOfBirth || p.dob || "", passportId: p.passportId || p.passport_id || "",
          createdAt: now, updatedAt: now
        })), { session })
      }

      // 4. Update Client Balance
      if (clientDelta !== 0 && inv.clientId) {
        await Client.updateOne({ _id: inv.clientId }, { $inc: { presentBalance: -clientDelta }, $set: { updatedAt: now } }, { session })
      }
    })
    return { ok: true }
  } catch (err: any) {
    console.error("updateInvoiceById error:", err)
    throw err
  } finally {
    session.endSession()
  }
}
